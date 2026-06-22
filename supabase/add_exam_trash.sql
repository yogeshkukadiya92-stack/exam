-- ============================================================
-- Exam Trash / Recover support
-- ------------------------------------------------------------
-- Supabase SQL Editor ma paste kari ne RUN karo (ek var).
-- Safe che — koi data delete nathi thatu, faqt 1 column add thay che.
-- Aa pachi exam delete karso to e "Trash" ma jashe ane restore thai shake.
-- ============================================================

alter table exams add column if not exists deleted_at timestamptz;

create index if not exists idx_exams_deleted_at on exams(deleted_at);
