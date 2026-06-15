-- ============================================================
-- PHASE 5 — Analytics & Results
-- Run in Supabase SQL Editor AFTER schema.sql + phase4.sql
-- ============================================================

-- Admin mate ek exam nu analytics: summary + leaderboard + per-question stats
create or replace function get_exam_analytics(p_exam_id uuid)
returns jsonb as $$
declare
  v_summary jsonb;
  v_attempts jsonb;
  v_questions jsonb;
  v_total_marks numeric;
  v_pass numeric;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;

  select coalesce(sum(marks), 0) into v_total_marks
  from questions where exam_id = p_exam_id;

  select pass_marks into v_pass from exams where id = p_exam_id;

  -- summary
  select jsonb_build_object(
    'total_attempts', count(*),
    'avg_score', coalesce(round(avg(total_score)::numeric, 2), 0),
    'max_score', coalesce(max(total_score), 0),
    'min_score', coalesce(min(total_score), 0),
    'pass_count', count(*) filter (where total_score >= v_pass),
    'total_marks', v_total_marks,
    'pass_marks', v_pass
  ) into v_summary
  from attempts
  where exam_id = p_exam_id and status <> 'in_progress';

  -- leaderboard (high score first)
  select coalesce(jsonb_agg(jsonb_build_object(
    'attempt_id', a.id,
    'student_name', coalesce(nullif(p.full_name, ''), p.email),
    'email', p.email,
    'score', a.total_score,
    'submitted_at', a.submitted_at
  ) order by a.total_score desc nulls last), '[]'::jsonb) into v_attempts
  from attempts a
  join profiles p on p.id = a.student_id
  where a.exam_id = p_exam_id and a.status <> 'in_progress';

  -- per-question correct/wrong counts (skipped = page ma calculate thase)
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id,
    'question_text', q.question_text,
    'correct', (
      select count(*) from answers an
      where an.question_id = q.id and an.is_correct is true
    ),
    'wrong', (
      select count(*) from answers an
      where an.question_id = q.id and an.is_correct is false
    )
  ) order by q.position), '[]'::jsonb) into v_questions
  from questions q
  where q.exam_id = p_exam_id;

  return jsonb_build_object(
    'summary', v_summary,
    'attempts', v_attempts,
    'questions', v_questions
  );
end;
$$ language plpgsql security definer;

-- ============================================================
-- DONE ✅
-- ============================================================
