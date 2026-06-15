-- ============================================================
-- PHASE 6 — Advanced features
-- Run in Supabase SQL Editor AFTER previous migrations
-- ============================================================

-- Proctoring (anti-cheat) on/off per exam
alter table exams add column if not exists proctoring boolean default false;

-- ============================================================
-- DONE ✅
-- ============================================================
