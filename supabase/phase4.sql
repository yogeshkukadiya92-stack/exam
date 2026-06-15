-- ============================================================
-- PHASE 4 — Student Exam Flow (secure RPCs)
-- Run this in Supabase SQL Editor AFTER schema.sql
-- ============================================================

-- IMPORTANT: students ne options direct read karva na do (is_correct leak na thay).
-- Exam-taking ane result badhu security-definer RPC mathi j jay.
drop policy if exists "Students read options of accessible questions" on options;

-- (Admin options policy already che — e raheve.)

-- ------------------------------------------------------------
-- start_attempt: attempt banave (athva in-progress resume kare)
-- ------------------------------------------------------------
create or replace function start_attempt(p_exam_id uuid)
returns uuid as $$
declare
  v_student uuid := auth.uid();
  v_exam exams;
  v_existing uuid;
  v_done int;
  v_new uuid;
begin
  select * into v_exam from exams where id = p_exam_id;
  if v_exam.id is null then raise exception 'Exam not found'; end if;
  if not v_exam.is_published then raise exception 'Exam not available'; end if;

  if not exists (
    select 1 from enrollments
    where student_id = v_student and batch_id = v_exam.batch_id
  ) then
    raise exception 'You are not enrolled in this exam';
  end if;

  if v_exam.start_time is not null and now() < v_exam.start_time then
    raise exception 'Exam has not started yet';
  end if;
  if v_exam.end_time is not null and now() > v_exam.end_time then
    raise exception 'Exam window is closed';
  end if;

  -- in-progress hoy to e j pacho aapo (resume)
  select id into v_existing from attempts
  where exam_id = p_exam_id and student_id = v_student and status = 'in_progress'
  order by started_at desc limit 1;
  if v_existing is not null then return v_existing; end if;

  -- max attempts check
  select count(*) into v_done from attempts
  where exam_id = p_exam_id and student_id = v_student and status <> 'in_progress';
  if v_done >= v_exam.max_attempts then
    raise exception 'No attempts left for this exam';
  end if;

  insert into attempts (exam_id, student_id, status)
  values (p_exam_id, v_student, 'in_progress')
  returning id into v_new;
  return v_new;
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------
-- get_attempt_questions: exam aapva mate questions (correct answer VAGAR)
-- ------------------------------------------------------------
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

  select coalesce(jsonb_agg(row_to_q order by pos), '[]'::jsonb) into v_result
  from (
    select
      qu.position as pos,
      jsonb_build_object(
        'id', qu.id,
        'question_text', qu.question_text,
        'type', qu.type,
        'marks', qu.marks,
        'negative_marks', qu.negative_marks,
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
    where qu.exam_id = v_exam_id
  ) sub;

  return v_result;
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------
-- submit_attempt: badha answers grade kare (negative marking sathe)
-- ------------------------------------------------------------
create or replace function submit_attempt(p_attempt_id uuid)
returns jsonb as $$
declare
  v_student uuid := auth.uid();
  v_exam exams;
  v_total numeric := 0;
  r record;
  v_correct uuid[];
  v_selected uuid[];
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
    select array_agg(id) into v_correct from options
    where question_id = r.id and is_correct;

    select selected_option_ids into v_selected from answers
    where attempt_id = p_attempt_id and question_id = r.id;

    if v_selected is null or array_length(v_selected, 1) is null then
      v_score := 0; v_is_correct := null;            -- skipped
    elsif v_selected <@ v_correct and v_correct <@ v_selected then
      v_score := r.marks; v_is_correct := true;      -- correct
    else
      v_is_correct := false;                         -- wrong
      v_score := case when v_exam.negative_marking
                      then -coalesce(r.negative_marks, 0) else 0 end;
    end if;

    v_total := v_total + v_score;

    update answers set is_correct = v_is_correct, score = v_score
    where attempt_id = p_attempt_id and question_id = r.id;
  end loop;

  update attempts
  set status = 'submitted', submitted_at = now(), total_score = v_total
  where id = p_attempt_id;

  return jsonb_build_object('total_score', v_total);
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------
-- get_attempt_result: submit pachi review (correct + explanation sathe)
-- ------------------------------------------------------------
create or replace function get_attempt_result(p_attempt_id uuid)
returns jsonb as $$
declare
  v_student uuid := auth.uid();
  v_exam_id uuid;
  v_data jsonb;
  v_meta jsonb;
begin
  select exam_id into v_exam_id from attempts
  where id = p_attempt_id and student_id = v_student and status <> 'in_progress';
  if v_exam_id is null then raise exception 'Result not available'; end if;

  select jsonb_build_object(
    'exam', (
      select jsonb_build_object(
        'title', e.title, 'pass_marks', e.pass_marks,
        'negative_marking', e.negative_marking
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
        'explanation', qu.explanation,
        'score', (select score from answers where attempt_id = p_attempt_id and question_id = qu.id),
        'is_correct', (select is_correct from answers where attempt_id = p_attempt_id and question_id = qu.id),
        'selected', (select selected_option_ids from answers where attempt_id = p_attempt_id and question_id = qu.id),
        'options', (
          select coalesce(jsonb_agg(
            jsonb_build_object('id', o.id, 'option_text', o.option_text, 'is_correct', o.is_correct)
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
-- DONE ✅  (4 RPC functions + options RLS tightened)
-- ============================================================
