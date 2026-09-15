-- Apply before deploying the question-navigation / submission diagnostics update.
-- Existing submissions remain unknown; never infer historical reasons from scores.
begin;
alter table public.attempts add column if not exists submission_reason text
  check (submission_reason in ('manual', 'duration_expired', 'exam_window_expired', 'tab_switch_limit'));
alter table public.attempts add column if not exists tab_switch_count integer default 0;

-- Atomic increment, restricted to the signed-in owner of an active attempt.
create or replace function public.record_attempt_tab_switch(p_attempt_id uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare v_count integer;
begin
  update public.attempts
  set tab_switch_count = coalesce(tab_switch_count, 0) + 1
  where id = p_attempt_id and student_id = auth.uid() and status = 'in_progress'
  returning tab_switch_count into v_count;
  if v_count is null then raise exception 'Active attempt not found'; end if;
  return v_count;
end;
$$;
revoke all on function public.record_attempt_tab_switch(uuid) from public;
grant execute on function public.record_attempt_tab_switch(uuid) to authenticated;
commit;
