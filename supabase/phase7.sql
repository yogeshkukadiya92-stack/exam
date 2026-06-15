-- ============================================================
-- PHASE 7 — NEW FEATURES: Academy Settings, Announcements,
--           Teacher Role Scoping, Profile Insert Policy
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. HELPER FUNCTION: is_super_admin()
-- ============================================================
create or replace function is_super_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$ language sql security definer stable;

-- ============================================================
-- 2. ACADEMY_SETTINGS TABLE
-- ============================================================
create table if not exists academy_settings (
  id            uuid primary key default gen_random_uuid(),
  name          text not null default 'ExamHub',
  logo_url      text,
  tagline       text default 'Modern Online Exam Platform',
  primary_color text default '#4f46e5',
  created_at    timestamptz default now()
);

insert into academy_settings (name) values ('ExamHub')
on conflict do nothing;

alter table academy_settings enable row level security;

create policy "Anyone can read academy settings"
  on academy_settings for select using (true);

create policy "Super admins update academy settings"
  on academy_settings for update using (is_super_admin()) with check (is_super_admin());

-- ============================================================
-- 3. ANNOUNCEMENTS TABLE
-- ============================================================
create table if not exists announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  content     text,
  created_by  uuid references profiles(id),
  is_active   boolean default true,
  created_at  timestamptz default now()
);

alter table announcements enable row level security;

create policy "Admins manage announcements"
  on announcements for all using (is_admin()) with check (is_admin());

create policy "Authenticated read active announcements"
  on announcements for select using (auth.role() = 'authenticated' and is_active = true);

create index idx_announcements_active on announcements(is_active, created_at desc);

-- ============================================================
-- 4. PROFILE INSERT POLICY (if not exists)
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'profiles' and policyname = 'Allow insert own profile'
  ) then
    execute 'create policy "Allow insert own profile" on profiles for insert with check (id = auth.uid())';
  end if;
end $$;

-- ============================================================
-- 5. TEACHER ROLE SCOPING — RLS POLICY CHANGES
-- ============================================================

-- --- COURSES ---
drop policy if exists "Admins manage courses" on courses;

create policy "Super admins manage all courses"
  on courses for all using (is_super_admin()) with check (is_super_admin());

create policy "Teachers manage own courses"
  on courses for all
  using (
    exists(select 1 from profiles where id = auth.uid() and role = 'teacher')
    and created_by = auth.uid()
  )
  with check (
    exists(select 1 from profiles where id = auth.uid() and role = 'teacher')
    and created_by = auth.uid()
  );

-- --- EXAMS ---
drop policy if exists "Admins manage exams" on exams;

create policy "Super admins manage all exams"
  on exams for all using (is_super_admin()) with check (is_super_admin());

create policy "Teachers manage own exams"
  on exams for all
  using (
    exists(select 1 from profiles where id = auth.uid() and role = 'teacher')
    and created_by = auth.uid()
  )
  with check (
    exists(select 1 from profiles where id = auth.uid() and role = 'teacher')
    and created_by = auth.uid()
  );

-- --- BATCHES ---
drop policy if exists "Admins manage batches" on batches;

create policy "Super admins manage all batches"
  on batches for all using (is_super_admin()) with check (is_super_admin());

create policy "Teachers manage batches of own courses"
  on batches for all
  using (
    exists(select 1 from profiles where id = auth.uid() and role = 'teacher')
    and course_id in (select id from courses where created_by = auth.uid())
  )
  with check (
    exists(select 1 from profiles where id = auth.uid() and role = 'teacher')
    and course_id in (select id from courses where created_by = auth.uid())
  );

-- --- PROFILES (view scoping for teachers) ---
drop policy if exists "Admins can view all profiles" on profiles;

create policy "Super admins view all profiles"
  on profiles for select using (is_super_admin());

create policy "Teachers view enrolled students"
  on profiles for select using (
    exists(select 1 from profiles p where p.id = auth.uid() and p.role = 'teacher')
    and id in (
      select e.student_id from enrollments e
      join batches b on b.id = e.batch_id
      join courses c on c.id = b.course_id
      where c.created_by = auth.uid()
    )
  );

-- ============================================================
-- DONE
-- ============================================================
