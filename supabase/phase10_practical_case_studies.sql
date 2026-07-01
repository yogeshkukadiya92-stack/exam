-- ============================================================
-- PHASE 10 - Practical case-study exams
-- Practical mode, case studies, pausable active-time sessions,
-- and updated student question/result RPC payloads.
-- Run in Supabase SQL Editor AFTER phase9.sql.
-- ============================================================

-- ---------- PRACTICAL EXAM SETTINGS ----------
alter table exams add column if not exists exam_mode text not null default 'standard';
alter table exams add column if not exists timer_mode text not null default 'continuous';
alter table exams add column if not exists allow_case_navigation boolean not null default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'exams_exam_mode_check'
  ) then
    alter table exams
      add constraint exams_exam_mode_check
      check (exam_mode in ('standard', 'practical'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'exams_timer_mode_check'
  ) then
    alter table exams
      add constraint exams_timer_mode_check
      check (timer_mode in ('continuous', 'pausable'));
  end if;
end $$;

-- ---------- CASE STUDIES ----------
create table if not exists case_studies (
  id          uuid primary key default gen_random_uuid(),
  exam_id     uuid not null references exams(id) on delete cascade,
  title       text not null,
  content     text not null,
  position    int default 0,
  created_by  uuid references profiles(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table questions add column if not exists case_study_id uuid references case_studies(id) on delete set null;

alter table case_studies enable row level security;

drop policy if exists "Admins manage case studies" on case_studies;
create policy "Admins manage case studies"
  on case_studies for all using (is_admin()) with check (is_admin());

drop policy if exists "Students read case studies of accessible exams" on case_studies;
create policy "Students read case studies of accessible exams"
  on case_studies for select using (
    exam_id in (select id from exams)
  );

create index if not exists idx_case_studies_exam on case_studies(exam_id);
create index if not exists idx_case_studies_position on case_studies(exam_id, position);
create index if not exists idx_questions_case_study on questions(case_study_id);

-- ---------- PAUSABLE ACTIVE-TIME SESSIONS ----------
create table if not exists attempt_sessions (
  id            uuid primary key default gen_random_uuid(),
  attempt_id    uuid not null references attempts(id) on delete cascade,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz default now(),
  constraint attempt_sessions_time_check
    check (ended_at is null or ended_at >= started_at)
);

alter table attempt_sessions enable row level security;

drop policy if exists "Admins manage attempt sessions" on attempt_sessions;
create policy "Admins manage attempt sessions"
  on attempt_sessions for all using (is_admin()) with check (is_admin());

drop policy if exists "Students manage own attempt sessions" on attempt_sessions;
create policy "Students manage own attempt sessions"
  on attempt_sessions for all
  using (
    exists (
      select 1 from attempts
      where attempts.id = attempt_sessions.attempt_id
        and attempts.student_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from attempts
      where attempts.id = attempt_sessions.attempt_id
        and attempts.student_id = auth.uid()
    )
  );

create index if not exists idx_attempt_sessions_attempt on attempt_sessions(attempt_id);
create index if not exists idx_attempt_sessions_open on attempt_sessions(attempt_id, ended_at);

-- ---------- ACTIVE TIME HELPER ----------
create or replace function get_attempt_active_seconds(p_attempt_id uuid)
returns int as $$
declare
  v_student uuid := auth.uid();
  v_seconds int := 0;
begin
  if not exists (
    select 1 from attempts
    where id = p_attempt_id
      and (student_id = v_student or is_admin())
  ) then
    raise exception 'Attempt not found';
  end if;

  select coalesce(
    sum(
      greatest(
        0,
        extract(epoch from (coalesce(ended_at, last_seen_at, now()) - started_at))
      )
    ),
    0
  )::int
  into v_seconds
  from attempt_sessions
  where attempt_id = p_attempt_id;

  return v_seconds;
end;
$$ language plpgsql security definer;

-- ---------- QUESTIONS FOR ATTEMPT WITH CASE STUDY DATA ----------
create or replace function get_attempt_questions(p_attempt_id uuid)
returns jsonb as $$
declare
  v_student uuid := auth.uid();
  v_exam_id uuid;
  v_result jsonb;
begin
  select exam_id into v_exam_id from attempts
  where id = p_attempt_id and student_id = v_student;
  if v_exam_id is null then raise exception 'Attempt not found'; end if;

  select coalesce(jsonb_agg(row_to_q order by case_pos, q_pos, q_created_at), '[]'::jsonb)
  into v_result
  from (
    select
      coalesce(cs.position, 0) as case_pos,
      qu.position as q_pos,
      qu.created_at as q_created_at,
      jsonb_build_object(
        'id', qu.id,
        'question_text', qu.question_text,
        'type', qu.type,
        'marks', qu.marks,
        'negative_marks', qu.negative_marks,
        'position', qu.position,
        'case_study_id', qu.case_study_id,
        'case_study', case
          when cs.id is null then null
          else jsonb_build_object(
            'id', cs.id,
            'title', cs.title,
            'content', cs.content,
            'position', cs.position
          )
        end,
        'options', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object('id', o.id, 'option_text', o.option_text)
              order by o.position
            ), '[]'::jsonb)
          from options o where o.question_id = qu.id
        )
      ) as row_to_q
    from questions qu
    left join case_studies cs on cs.id = qu.case_study_id
    where qu.exam_id = v_exam_id
  ) sub;

  return v_result;
end;
$$ language plpgsql security definer;

-- ---------- RESULT WITH CASE STUDY METADATA ----------
create or replace function get_attempt_result(p_attempt_id uuid)
returns jsonb as $$
declare
  v_student uuid := auth.uid();
  v_exam_id uuid;
  v_data jsonb;
  v_meta jsonb;
  v_show_answers boolean;
  v_show_explanations boolean;
begin
  select exam_id into v_exam_id from attempts
  where id = p_attempt_id and student_id = v_student and status <> 'in_progress';
  if v_exam_id is null then raise exception 'Result not available'; end if;

  select coalesce(show_correct_answers, false), coalesce(show_explanations, false)
  into v_show_answers, v_show_explanations
  from exams where id = v_exam_id;

  select jsonb_build_object(
    'exam', (
      select jsonb_build_object(
        'title', e.title,
        'pass_marks', e.pass_marks,
        'negative_marking', e.negative_marking,
        'show_correct_answers', coalesce(e.show_correct_answers, false),
        'show_explanations', coalesce(e.show_explanations, false),
        'result_visible', coalesce(e.result_visible, true),
        'exam_mode', coalesce(e.exam_mode, 'standard')
      ) from exams e where e.id = v_exam_id
    ),
    'total_score', (select total_score from attempts where id = p_attempt_id)
  ) into v_meta;

  select coalesce(jsonb_agg(q order by case_pos, q_pos, q_created_at), '[]'::jsonb)
  into v_data
  from (
    select
      coalesce(cs.position, 0) as case_pos,
      qu.position as q_pos,
      qu.created_at as q_created_at,
      jsonb_build_object(
        'id', qu.id,
        'question_text', qu.question_text,
        'marks', qu.marks,
        'negative_marks', qu.negative_marks,
        'type', qu.type,
        'case_study_id', qu.case_study_id,
        'case_study', case
          when cs.id is null then null
          else jsonb_build_object(
            'id', cs.id,
            'title', cs.title,
            'content', cs.content,
            'position', cs.position
          )
        end,
        'explanation', case when v_show_explanations then qu.explanation else null end,
        'score', (select score from answers where attempt_id = p_attempt_id and question_id = qu.id),
        'is_correct', (select is_correct from answers where attempt_id = p_attempt_id and question_id = qu.id),
        'selected', (select selected_option_ids from answers where attempt_id = p_attempt_id and question_id = qu.id),
        'text_answer', (select text_answer from answers where attempt_id = p_attempt_id and question_id = qu.id),
        'options', (
          select coalesce(jsonb_agg(
            jsonb_build_object(
              'id', o.id,
              'option_text', o.option_text,
              'is_correct', case when v_show_answers then o.is_correct else false end
            )
            order by o.position), '[]'::jsonb)
          from options o where o.question_id = qu.id
        )
      ) as q
    from questions qu
    left join case_studies cs on cs.id = qu.case_study_id
    where qu.exam_id = v_exam_id
  ) sub;

  return v_meta || jsonb_build_object('questions', v_data);
end;
$$ language plpgsql security definer;

-- ============================================================
-- DONE
-- ============================================================
