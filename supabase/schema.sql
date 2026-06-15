-- ============================================================
-- ONLINE EXAM PLATFORM — DATABASE SCHEMA
-- Supabase (PostgreSQL) — Phase 1
-- Run this in Supabase SQL Editor
-- ============================================================

-- ----------- ENUMS -----------
create type user_role as enum ('super_admin', 'teacher', 'student');

create type question_type as enum (
  'single',       -- single correct MCQ
  'multiple',     -- multiple correct MCQ
  'true_false',
  'fill_blank',
  'match',
  'numerical',
  'descriptive'   -- manual grading
);

create type attempt_status as enum ('in_progress', 'submitted', 'graded');

-- ============================================================
-- PROFILES  (linked to Supabase auth.users)
-- ============================================================
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text,
  email       text,
  role        user_role not null default 'student',
  created_at  timestamptz default now()
);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Helper: check if current user is an admin (super_admin or teacher)
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('super_admin', 'teacher')
  );
$$ language sql security definer stable;

-- ============================================================
-- COURSES
-- ============================================================
create table courses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_by  uuid references profiles(id),
  created_at  timestamptz default now()
);

-- ============================================================
-- BATCHES  (ek course -> multiple batch)
-- ============================================================
create table batches (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid references courses(id) on delete cascade,
  name        text not null,
  created_at  timestamptz default now()
);

-- ============================================================
-- ENROLLMENTS  (student <-> batch)
-- ============================================================
create table enrollments (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid references profiles(id) on delete cascade,
  batch_id    uuid references batches(id) on delete cascade,
  created_at  timestamptz default now(),
  unique(student_id, batch_id)
);

-- ============================================================
-- EXAMS
-- ============================================================
create table exams (
  id                uuid primary key default gen_random_uuid(),
  course_id         uuid references courses(id) on delete cascade,
  batch_id          uuid references batches(id) on delete cascade,
  title             text not null,
  instructions      text,
  duration_minutes  int not null default 60,
  pass_marks        numeric default 0,
  negative_marking  boolean default false,
  shuffle_questions boolean default false,
  start_time        timestamptz,
  end_time          timestamptz,
  max_attempts      int default 1,
  is_published      boolean default false,
  created_by        uuid references profiles(id),
  created_at        timestamptz default now()
);

-- ============================================================
-- SECTIONS  (optional — Physics / Chemistry / Maths)
-- ============================================================
create table sections (
  id        uuid primary key default gen_random_uuid(),
  exam_id   uuid references exams(id) on delete cascade,
  name      text not null,
  position  int default 0
);

-- ============================================================
-- QUESTIONS
-- ============================================================
create table questions (
  id              uuid primary key default gen_random_uuid(),
  exam_id         uuid references exams(id) on delete cascade,
  section_id      uuid references sections(id) on delete set null,
  type            question_type not null default 'single',
  question_text   text not null,
  image_url       text,
  marks           numeric not null default 1,
  negative_marks  numeric not null default 0,
  difficulty      text,                 -- easy / medium / hard
  topic           text,
  explanation     text,                 -- review ma dekhay
  correct_text    text,                 -- fill_blank / numerical mate
  position        int default 0,
  created_at      timestamptz default now()
);

-- ============================================================
-- OPTIONS  (MCQ na options)
-- ============================================================
create table options (
  id            uuid primary key default gen_random_uuid(),
  question_id   uuid references questions(id) on delete cascade,
  option_text   text not null,
  is_correct    boolean default false,
  position      int default 0
);

-- ============================================================
-- ATTEMPTS  (student e exam start karyu)
-- ============================================================
create table attempts (
  id            uuid primary key default gen_random_uuid(),
  exam_id       uuid references exams(id) on delete cascade,
  student_id    uuid references profiles(id) on delete cascade,
  status        attempt_status default 'in_progress',
  started_at    timestamptz default now(),
  submitted_at  timestamptz,
  total_score   numeric,
  created_at    timestamptz default now()
);

-- ============================================================
-- ANSWERS
-- ============================================================
create table answers (
  id                  uuid primary key default gen_random_uuid(),
  attempt_id          uuid references attempts(id) on delete cascade,
  question_id         uuid references questions(id) on delete cascade,
  selected_option_ids uuid[],            -- MCQ mate
  text_answer         text,              -- fill_blank / numerical / descriptive mate
  marked_for_review   boolean default false,
  is_correct          boolean,
  score               numeric,
  updated_at          timestamptz default now(),
  unique(attempt_id, question_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles    enable row level security;
alter table courses     enable row level security;
alter table batches     enable row level security;
alter table enrollments enable row level security;
alter table exams       enable row level security;
alter table sections    enable row level security;
alter table questions   enable row level security;
alter table options     enable row level security;
alter table attempts    enable row level security;
alter table answers     enable row level security;

-- ---------- PROFILES ----------
create policy "Users can view own profile"
  on profiles for select using (id = auth.uid());

create policy "Admins can view all profiles"
  on profiles for select using (is_admin());

create policy "Users can update own profile"
  on profiles for update using (id = auth.uid());

-- ---------- COURSES / BATCHES (admin manage, all read) ----------
create policy "Anyone authed can read courses"
  on courses for select using (auth.role() = 'authenticated');
create policy "Admins manage courses"
  on courses for all using (is_admin()) with check (is_admin());

create policy "Anyone authed can read batches"
  on batches for select using (auth.role() = 'authenticated');
create policy "Admins manage batches"
  on batches for all using (is_admin()) with check (is_admin());

-- ---------- ENROLLMENTS ----------
create policy "Students see own enrollments"
  on enrollments for select using (student_id = auth.uid());
create policy "Admins manage enrollments"
  on enrollments for all using (is_admin()) with check (is_admin());

-- ---------- EXAMS ----------
-- Students: faqt potana batch na PUBLISHED exams
create policy "Students see assigned published exams"
  on exams for select using (
    is_published = true
    and batch_id in (
      select batch_id from enrollments where student_id = auth.uid()
    )
  );
create policy "Admins manage exams"
  on exams for all using (is_admin()) with check (is_admin());

-- ---------- SECTIONS / QUESTIONS / OPTIONS ----------
-- Students read faqt jena exam e access kari shake (published + assigned)
create policy "Students read sections of accessible exams"
  on sections for select using (
    exam_id in (select id from exams)   -- exams RLS already filters
  );
create policy "Admins manage sections"
  on sections for all using (is_admin()) with check (is_admin());

create policy "Students read questions of accessible exams"
  on questions for select using (
    exam_id in (select id from exams)
  );
create policy "Admins manage questions"
  on questions for all using (is_admin()) with check (is_admin());

create policy "Students read options of accessible questions"
  on options for select using (
    question_id in (select id from questions)
  );
create policy "Admins manage options"
  on options for all using (is_admin()) with check (is_admin());

-- ---------- ATTEMPTS ----------
create policy "Students manage own attempts"
  on attempts for all
  using (student_id = auth.uid())
  with check (student_id = auth.uid());
create policy "Admins read all attempts"
  on attempts for select using (is_admin());

-- ---------- ANSWERS ----------
create policy "Students manage own answers"
  on answers for all
  using (attempt_id in (select id from attempts where student_id = auth.uid()))
  with check (attempt_id in (select id from attempts where student_id = auth.uid()));
create policy "Admins read all answers"
  on answers for select using (is_admin());

-- ============================================================
-- INDEXES (performance)
-- ============================================================
create index idx_batches_course    on batches(course_id);
create index idx_enroll_student     on enrollments(student_id);
create index idx_enroll_batch       on enrollments(batch_id);
create index idx_exams_batch        on exams(batch_id);
create index idx_questions_exam     on questions(exam_id);
create index idx_options_question   on options(question_id);
create index idx_attempts_student   on attempts(student_id);
create index idx_attempts_exam      on attempts(exam_id);
create index idx_answers_attempt    on answers(attempt_id);

-- ============================================================
-- DONE ✅
-- Pachi: pehla user ne super_admin banava mate (signup pachi):
--   update profiles set role = 'super_admin' where email = 'you@email.com';
-- ============================================================
