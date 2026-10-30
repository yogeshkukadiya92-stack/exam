-- Run once to distinguish admin submissions from student submissions in monitors.
-- The submit action remains functional without this migration, but its reason may show "Not recorded".
begin;
alter table public.attempts add column if not exists submission_reason text;
alter table public.attempts drop constraint if exists attempts_submission_reason_check;
alter table public.attempts add constraint attempts_submission_reason_check
  check (submission_reason in ('manual', 'duration_expired', 'exam_window_expired', 'tab_switch_limit', 'admin_submitted'));
commit;
