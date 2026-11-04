-- Run with psql against an EMPTY disposable database, from the repository root.
\set ON_ERROR_STOP on
create schema auth;
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('test.student_id', true), '')::uuid $$;
create function is_admin() returns boolean language sql stable as
$$ select coalesce(current_setting('test.is_admin', true), '') = 'yes' $$;
create table batches(id uuid primary key, course_id uuid);
create table profiles(id uuid primary key, full_name text, email text);
create table enrollments(student_id uuid, batch_id uuid);
create table exams(id uuid primary key, course_id uuid, batch_id uuid,
  is_published boolean default true, start_time timestamptz, end_time timestamptz,
  max_attempts int default 1, duration_minutes int default 60);
create table student_exam_overrides(exam_id uuid, student_id uuid, extra_attempts int, unlock_until timestamptz);
create table attempts(id uuid default gen_random_uuid(), exam_id uuid, student_id uuid,
  status text, started_at timestamptz default now(), submitted_at timestamptz,
  tab_switch_count int default 0, last_seen_at timestamptz);

-- Load the original production RPCs so the migration is tested against their real definitions.
create or replace function start_attempt(p_exam_id uuid)
returns uuid as $$
declare
  v_student uuid := auth.uid();
  v_exam exams;
  v_existing uuid;
  v_done int;
  v_extra int := 0;
  v_unlock_until timestamptz;
  v_new uuid;
begin
  select * into v_exam from exams where id = p_exam_id;
  if v_exam.id is null then raise exception 'Exam not found'; end if;
  if not v_exam.is_published then raise exception 'Exam not available'; end if;

  select coalesce(extra_attempts, 0), unlock_until
  into v_extra, v_unlock_until
  from student_exam_overrides
  where exam_id = p_exam_id and student_id = v_student;

  if not exists (
    select 1 from enrollments
    where student_id = v_student and batch_id = v_exam.batch_id
  ) then
    raise exception 'You are not enrolled in this exam';
  end if;

  if v_exam.start_time is not null and now() < v_exam.start_time then
    raise exception 'Exam has not started yet';
  end if;
  if v_exam.end_time is not null and now() > v_exam.end_time
     and (v_unlock_until is null or now() > v_unlock_until) then
    raise exception 'Exam window is closed';
  end if;

  select id into v_existing from attempts
  where exam_id = p_exam_id and student_id = v_student and status = 'in_progress'
  order by started_at desc limit 1;
  if v_existing is not null then return v_existing; end if;

  select count(*) into v_done from attempts
  where exam_id = p_exam_id and student_id = v_student and status <> 'in_progress';
  if v_done >= (v_exam.max_attempts + v_extra) then
    raise exception 'No attempts left for this exam';
  end if;

  insert into attempts (exam_id, student_id, status)
  values (p_exam_id, v_student, 'in_progress')
  returning id into v_new;
  return v_new;
end;
$$ language plpgsql security definer;
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
insert into batches values
 ('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002');
insert into profiles values
 ('20000000-0000-0000-0000-000000000001','Both batches','both@example.test'),
 ('20000000-0000-0000-0000-000000000002','Second batch','second@example.test'),
 ('20000000-0000-0000-0000-000000000003','Other course','other@example.test');
insert into enrollments values
 ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002'),
 ('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002'),
 ('20000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000003');
insert into exams(id, course_id, batch_id) values
 ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001');
\i supabase/multiple_exam_batches.sql
\i supabase/multiple_exam_batches.sql

do $$ begin
  assert (select cardinality(batch_ids) = 1 from exams), 'Backfill failed';
  update exams set batch_ids = array['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002']::uuid[];
  begin
    update exams set batch_ids = '{}'::uuid[];
    raise exception 'Empty batches accepted';
  exception when raise_exception then
    if SQLERRM = 'Empty batches accepted' then raise; end if;
  end;
  begin
    update exams set batch_ids = array['00000000-0000-0000-0000-000000000003']::uuid[];
    raise exception 'Cross-course assignment accepted';
  exception when raise_exception then
    if SQLERRM = 'Cross-course assignment accepted' then raise; end if;
  end;
end $$;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'exam_batch_test_student') then
    create role exam_batch_test_student;
  end if;
end $$;
grant usage on schema public, auth to exam_batch_test_student;
grant select on exams, enrollments to exam_batch_test_student;
alter table exams enable row level security;
set role exam_batch_test_student;
set test.student_id = '20000000-0000-0000-0000-000000000002';
do $$ begin
  assert (select count(*) = 1 from exams), 'Second batch cannot see exam';
  assert start_attempt('30000000-0000-0000-0000-000000000001') is not null, 'Second batch cannot start exam';
end $$;
set test.student_id = '20000000-0000-0000-0000-000000000003';
do $$ begin
  assert (select count(*) = 0 from exams), 'Unassigned student can see exam';
  begin
    perform start_attempt('30000000-0000-0000-0000-000000000001');
    raise exception 'Unassigned student started exam';
  exception when raise_exception then
    if SQLERRM <> 'You are not enrolled in this exam' then raise; end if;
  end;
end $$;
reset role;
set test.is_admin = 'yes';
do $$ begin
  assert jsonb_array_length(get_live_exam_monitor('30000000-0000-0000-0000-000000000001')->'students') = 2,
    'Monitor must include both batches and deduplicate students';
  update exams set batch_ids = array['00000000-0000-0000-0000-000000000002']::uuid[];
  assert (select batch_id = '00000000-0000-0000-0000-000000000002' from exams), 'Primary batch not synchronized';
end $$;
set role exam_batch_test_student;
set test.student_id = '20000000-0000-0000-0000-000000000002';
do $$ begin
  assert (select count(*) = 1 from exams), 'Remaining batch lost access';
end $$;
reset role;
update exams set batch_ids = array['00000000-0000-0000-0000-000000000001']::uuid[];
set role exam_batch_test_student;
set test.student_id = '20000000-0000-0000-0000-000000000002';
do $$ begin
  assert (select count(*) = 0 from exams), 'Removed batch still sees exam';
  begin
    perform start_attempt('30000000-0000-0000-0000-000000000001');
    raise exception 'Removed batch can resume exam';
  exception when raise_exception then
    if SQLERRM <> 'You are not enrolled in this exam' then raise; end if;
  end;
end $$;
reset role;
select 'Multiple batch integration checks passed' as result;
