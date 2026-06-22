-- ============================================================
-- FIX: Student exam RPCs (submit + result + questions)
-- ------------------------------------------------------------
-- Aa file Supabase SQL Editor ma paste kari ne RUN karo.
-- Safe che — koi data delete nathi thatu, faqt functions update thay.
-- Aa thi exam submit pachi result + explanations barabar dekhase.
-- ============================================================

-- Make sure the visibility columns exist (no-op if already there)
alter table exams add column if not exists show_correct_answers boolean default false;
alter table exams add column if not exists show_explanations boolean default false;
alter table exams add column if not exists result_visible boolean default true;

-- ---------- QUESTIONS FOR ATTEMPT (correct answers VAGAR) ----------
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

-- ---------- SUBMIT ATTEMPT (MCQ + text question types) ----------
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
      elsif v_correct is null then
        v_is_correct := false;
        v_score := case when v_exam.negative_marking
                        then -coalesce(r.negative_marks, 0) else 0 end;
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

-- ---------- RESULT (respects review visibility settings) ----------
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
-- DONE — exam submit + result have barabar kaam karshe.
-- ============================================================
