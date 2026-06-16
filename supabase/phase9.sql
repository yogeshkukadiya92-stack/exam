-- ============================================================
-- PHASE 9 - Product expansion foundation
-- Question bank, sections, invites, monitoring, review controls,
-- re-attempt controls, certificate templates, notifications.
-- Run in Supabase SQL Editor AFTER phase8.sql
-- ============================================================

-- ---------- EXAM SETTINGS ----------
alter table exams add column if not exists show_correct_answers boolean default true;
alter table exams add column if not exists show_explanations boolean default true;
alter table exams add column if not exists result_visible boolean default true;
alter table exams add column if not exists certificate_template_id uuid;

alter table sections add column if not exists duration_minutes int;
alter table sections add column if not exists marks numeric default 0;

alter table questions add column if not exists source_question_id uuid;
alter table questions add column if not exists subject text;

-- ---------- QUESTION BANK ----------
create table if not exists question_bank (
  id              uuid primary key default gen_random_uuid(),
  subject         text,
  topic           text,
  difficulty      text,
  type            question_type not null default 'single',
  question_text   text not null,
  image_url        text,
  marks           numeric not null default 1,
  negative_marks  numeric not null default 0,
  correct_text    text,
  explanation     text,
  created_by      uuid references profiles(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists question_bank_options (
  id                uuid primary key default gen_random_uuid(),
  bank_question_id  uuid references question_bank(id) on delete cascade,
  option_text       text not null,
  is_correct        boolean default false,
  position          int default 0
);

alter table question_bank enable row level security;
alter table question_bank_options enable row level security;

drop policy if exists "Admins manage question bank" on question_bank;
create policy "Admins manage question bank"
  on question_bank for all using (is_admin()) with check (is_admin());

drop policy if exists "Admins manage question bank options" on question_bank_options;
create policy "Admins manage question bank options"
  on question_bank_options for all using (is_admin()) with check (is_admin());

create index if not exists idx_question_bank_subject on question_bank(subject);
create index if not exists idx_question_bank_topic on question_bank(topic);
create index if not exists idx_question_bank_difficulty on question_bank(difficulty);

-- ---------- STUDENT INVITES ----------
create table if not exists exam_invites (
  id          uuid primary key default gen_random_uuid(),
  exam_id     uuid references exams(id) on delete cascade,
  student_id  uuid references profiles(id) on delete cascade,
  batch_id    uuid references batches(id) on delete cascade,
  token       text unique default encode(gen_random_bytes(18), 'hex'),
  channel     text default 'link',
  sent_at     timestamptz,
  created_by  uuid references profiles(id),
  created_at  timestamptz default now()
);

alter table exam_invites enable row level security;

drop policy if exists "Admins manage exam invites" on exam_invites;
create policy "Admins manage exam invites"
  on exam_invites for all using (is_admin()) with check (is_admin());

drop policy if exists "Students view own exam invites" on exam_invites;
create policy "Students view own exam invites"
  on exam_invites for select using (student_id = auth.uid());

create index if not exists idx_exam_invites_exam on exam_invites(exam_id);
create index if not exists idx_exam_invites_student on exam_invites(student_id);

-- ---------- ATTEMPT MONITORING / RE-ATTEMPT CONTROLS ----------
alter table attempts add column if not exists tab_switch_count int default 0;
alter table attempts add column if not exists last_seen_at timestamptz default now();
alter table attempts add column if not exists extra_attempt_granted boolean default false;
alter table attempts add column if not exists reset_by uuid references profiles(id);
alter table attempts add column if not exists reset_at timestamptz;

create table if not exists student_exam_overrides (
  id             uuid primary key default gen_random_uuid(),
  exam_id         uuid references exams(id) on delete cascade,
  student_id      uuid references profiles(id) on delete cascade,
  extra_attempts  int default 0,
  unlock_until    timestamptz,
  notes           text,
  created_by      uuid references profiles(id),
  created_at      timestamptz default now(),
  unique(exam_id, student_id)
);

alter table student_exam_overrides enable row level security;

drop policy if exists "Admins manage student exam overrides" on student_exam_overrides;
create policy "Admins manage student exam overrides"
  on student_exam_overrides for all using (is_admin()) with check (is_admin());

drop policy if exists "Students view own exam overrides" on student_exam_overrides;
create policy "Students view own exam overrides"
  on student_exam_overrides for select using (student_id = auth.uid());

-- ---------- CERTIFICATE TEMPLATES ----------
create table if not exists certificate_templates (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  logo_url         text,
  signature_url    text,
  signer_name      text,
  signer_title     text,
  background_url   text,
  primary_color    text default '#4f46e5',
  created_by       uuid references profiles(id),
  created_at       timestamptz default now()
);

alter table certificate_templates enable row level security;

drop policy if exists "Admins manage certificate templates" on certificate_templates;
create policy "Admins manage certificate templates"
  on certificate_templates for all using (is_admin()) with check (is_admin());

-- ---------- NOTIFICATIONS ----------
create table if not exists notification_events (
  id           uuid primary key default gen_random_uuid(),
  event_type   text not null,
  recipient    text,
  subject      text,
  body         text,
  status       text default 'queued',
  error        text,
  created_by   uuid references profiles(id),
  created_at   timestamptz default now(),
  sent_at      timestamptz
);

alter table notification_events enable row level security;

drop policy if exists "Admins manage notification events" on notification_events;
create policy "Admins manage notification events"
  on notification_events for all using (is_admin()) with check (is_admin());

-- ---------- LIVE MONITORING RPC ----------
create or replace function get_live_exam_monitor(p_exam_id uuid)
returns jsonb as $$
declare
  v_now timestamptz := now();
  v_data jsonb;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'student_id', p.id,
    'student_name', coalesce(nullif(p.full_name, ''), p.email),
    'email', p.email,
    'attempt_id', a.id,
    'status', coalesce(a.status::text, 'not_started'),
    'started_at', a.started_at,
    'submitted_at', a.submitted_at,
    'tab_switch_count', coalesce(a.tab_switch_count, 0),
    'last_seen_at', a.last_seen_at,
    'time_left_seconds',
      case
        when a.id is null or a.status <> 'in_progress' then null
        else greatest(
          0,
          extract(epoch from (
            least(
              a.started_at + (e.duration_minutes || ' minutes')::interval,
              coalesce(e.end_time, 'infinity'::timestamptz)
            ) - v_now
          ))::int
        )
      end
  ) order by p.full_name, p.email), '[]'::jsonb)
  into v_data
  from exams e
  join enrollments en on en.batch_id = e.batch_id
  join profiles p on p.id = en.student_id
  left join lateral (
    select *
    from attempts a
    where a.exam_id = e.id and a.student_id = p.id
    order by a.started_at desc
    limit 1
  ) a on true
  where e.id = p_exam_id;

  return jsonb_build_object('students', v_data);
end;
$$ language plpgsql security definer;

-- ---------- RESULT ANALYTICS RPC V2 ----------
create or replace function get_exam_analytics_v2(p_exam_id uuid)
returns jsonb as $$
declare
  v_base jsonb;
  v_section_stats jsonb;
  v_topic_stats jsonb;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;

  select get_exam_analytics(p_exam_id) into v_base;

  select coalesce(jsonb_agg(jsonb_build_object(
    'section_id', s.id,
    'section_name', s.name,
    'avg_score', coalesce(round(avg(an.score)::numeric, 2), 0),
    'total_marks', coalesce(sum(distinct q.marks), 0)
  ) order by s.position), '[]'::jsonb)
  into v_section_stats
  from sections s
  join questions q on q.section_id = s.id
  left join answers an on an.question_id = q.id
  where s.exam_id = p_exam_id
  group by s.id, s.name, s.position;

  select coalesce(jsonb_agg(jsonb_build_object(
    'topic', coalesce(q.topic, q.subject, 'General'),
    'attempted', count(an.id),
    'correct', count(*) filter (where an.is_correct is true),
    'wrong', count(*) filter (where an.is_correct is false),
    'accuracy', case when count(an.id) = 0 then 0
      else round((count(*) filter (where an.is_correct is true)::numeric / count(an.id)) * 100, 2)
    end
  ) order by coalesce(q.topic, q.subject, 'General')), '[]'::jsonb)
  into v_topic_stats
  from questions q
  left join answers an on an.question_id = q.id
  where q.exam_id = p_exam_id
  group by coalesce(q.topic, q.subject, 'General');

  return v_base || jsonb_build_object(
    'sections', coalesce(v_section_stats, '[]'::jsonb),
    'topics', coalesce(v_topic_stats, '[]'::jsonb)
  );
end;
$$ language plpgsql security definer;

-- ---------- SUBMIT ATTEMPT V2: MCQ + TEXT QUESTION TYPES ----------
create or replace function submit_attempt(p_attempt_id uuid)
returns jsonb as $$
declare
  v_student uuid := auth.uid();
  v_exam exams;
  v_total numeric := 0;
  r record;
  v_correct uuid[];
  v_selected uuid[];
  v_text text;
  v_score numeric;
  v_is_correct boolean;
begin
  if not exists (
    select 1 from attempts
    where id = p_attempt_id and student_id = v_student and status = 'in_progress'
  ) then
    raise exception 'Attempt not found or already submitted';
  end if;

  select e.* into v_exam
  from exams e join attempts a on a.exam_id = e.id
  where a.id = p_attempt_id;

  for r in select * from questions where exam_id = v_exam.id loop
    select selected_option_ids, text_answer into v_selected, v_text
    from answers
    where attempt_id = p_attempt_id and question_id = r.id;

    if r.type in ('single', 'multiple', 'true_false') then
      select array_agg(id) into v_correct from options
      where question_id = r.id and is_correct;

      if v_selected is null or array_length(v_selected, 1) is null then
        v_score := 0; v_is_correct := null;
      elsif v_selected <@ v_correct and v_correct <@ v_selected then
        v_score := r.marks; v_is_correct := true;
      else
        v_is_correct := false;
        v_score := case when v_exam.negative_marking
                        then -coalesce(r.negative_marks, 0) else 0 end;
      end if;
    elsif r.type in ('fill_blank', 'numerical') then
      if coalesce(trim(v_text), '') = '' then
        v_score := 0; v_is_correct := null;
      elsif lower(trim(v_text)) = lower(trim(coalesce(r.correct_text, ''))) then
        v_score := r.marks; v_is_correct := true;
      else
        v_is_correct := false;
        v_score := case when v_exam.negative_marking
                        then -coalesce(r.negative_marks, 0) else 0 end;
      end if;
    else
      v_score := null; v_is_correct := null;
    end if;

    v_total := v_total + coalesce(v_score, 0);

    update answers set is_correct = v_is_correct, score = v_score
    where attempt_id = p_attempt_id and question_id = r.id;
  end loop;

  update attempts
  set status = case
      when exists (
        select 1 from questions
        where exam_id = v_exam.id and type = 'descriptive'
      ) then 'submitted'
      else 'graded'
    end,
    submitted_at = now(),
    total_score = v_total
  where id = p_attempt_id;

  return jsonb_build_object('total_score', v_total);
end;
$$ language plpgsql security definer;

-- ---------- RESULT REVIEW SETTINGS ----------
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

  select coalesce(show_correct_answers, true), coalesce(show_explanations, true)
  into v_show_answers, v_show_explanations
  from exams where id = v_exam_id;

  select jsonb_build_object(
    'exam', (
      select jsonb_build_object(
        'title', e.title,
        'pass_marks', e.pass_marks,
        'negative_marking', e.negative_marking,
        'show_correct_answers', coalesce(e.show_correct_answers, true),
        'show_explanations', coalesce(e.show_explanations, true),
        'result_visible', coalesce(e.result_visible, true)
      ) from exams e where e.id = v_exam_id
    ),
    'total_score', (select total_score from attempts where id = p_attempt_id)
  ) into v_meta;

  select coalesce(jsonb_agg(q order by pos), '[]'::jsonb) into v_data
  from (
    select
      qu.position as pos,
      jsonb_build_object(
        'id', qu.id,
        'question_text', qu.question_text,
        'marks', qu.marks,
        'negative_marks', qu.negative_marks,
        'type', qu.type,
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
    from questions qu where qu.exam_id = v_exam_id
  ) sub;

  return v_meta || jsonb_build_object('questions', v_data);
end;
$$ language plpgsql security definer;

-- ============================================================
-- DONE
-- ============================================================
