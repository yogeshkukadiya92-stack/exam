-- Apply after the existing phase migrations, before deploying the app changes.
begin;

alter table public.exams add column if not exists batch_ids uuid[];
update public.exams set batch_ids = array[batch_id] where batch_ids is null;
alter table public.exams alter column batch_ids set not null;

-- Keep the legacy primary batch for existing integrations. Validate every assignment
-- in the database too, including direct API writes by administrators.
create or replace function public.validate_exam_batches()
returns trigger language plpgsql set search_path = public as $$
begin
  if TG_OP = 'INSERT' and NEW.batch_ids is null then
    NEW.batch_ids := array[NEW.batch_id];
  elsif TG_OP = 'UPDATE' then
    if NEW.batch_ids is not distinct from OLD.batch_ids
       and NEW.batch_id is distinct from OLD.batch_id then
      NEW.batch_ids := array[NEW.batch_id];
    end if;
  end if;
  if coalesce(cardinality(NEW.batch_ids), 0) = 0
     or array_position(NEW.batch_ids, null) is not null then
    raise exception 'Select at least one valid batch';
  end if;
  if exists (
    select 1 from unnest(NEW.batch_ids) as assigned(id)
    where not exists (select 1 from batches b where b.id = assigned.id and b.course_id = NEW.course_id)
  ) then
    raise exception 'All selected batches must belong to the exam course';
  end if;
  NEW.batch_ids := array(select distinct id from unnest(NEW.batch_ids) as assigned(id) order by id);
  if NEW.batch_id is null or not (NEW.batch_id = any(NEW.batch_ids)) then
    NEW.batch_id := NEW.batch_ids[1];
  end if;
  return NEW;
end;
$$;
drop trigger if exists validate_exam_batches on public.exams;
create trigger validate_exam_batches before insert or update of batch_ids, batch_id, course_id
on public.exams for each row execute function public.validate_exam_batches();

create index if not exists idx_exams_batch_ids on public.exams using gin(batch_ids);

drop policy if exists "Students see assigned published exams" on public.exams;
create policy "Students see assigned published exams" on public.exams for select using (
  is_published = true and exists (
    select 1 from public.enrollments en
    where en.student_id = auth.uid() and en.batch_id = any(exams.batch_ids)
  )
);

-- Amend only enrollment predicates, preserving all currently installed timer,
-- submission, override and authorization logic. Abort on an unexpected version.
do $$
declare
  definition text;
  updated text;
begin
  definition := pg_get_functiondef('public.start_attempt(uuid)'::regprocedure);
  updated := replace(definition, 'batch_id = v_exam.batch_id', 'batch_id = any(v_exam.batch_ids)');
  if updated = definition and position('any(v_exam.batch_ids)' in definition) = 0 then
    raise exception 'Unrecognized start_attempt enrollment check';
  end if;
  execute updated;

  definition := pg_get_functiondef('public.get_live_exam_monitor(uuid)'::regprocedure);
  updated := replace(definition,
    'join enrollments en on en.batch_id = e.batch_id' || chr(10) || '  join profiles p on p.id = en.student_id',
    'join profiles p on exists (select 1 from public.enrollments en where en.student_id = p.id and en.batch_id = any(e.batch_ids))');
  if updated = definition and position('any(e.batch_ids)' in definition) = 0 then
    raise exception 'Unrecognized live monitor enrollment check';
  end if;
  execute updated;
end;
$$;

notify pgrst, 'reload schema';
commit;
