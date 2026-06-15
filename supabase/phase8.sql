-- ============================================================
-- PHASE 8 - Harden auth profile trigger
-- Run this in Supabase SQL Editor if user creation returns
-- "AuthRetryableFetchError" or status 500.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role := 'student';
begin
  if new.raw_user_meta_data ? 'role'
     and new.raw_user_meta_data->>'role' in ('super_admin', 'teacher', 'student') then
    requested_role := (new.raw_user_meta_data->>'role')::public.user_role;
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    requested_role
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role;

  return new;
exception
  when others then
    -- Never block auth.users creation because profile sync failed.
    raise warning 'handle_new_user profile sync failed for %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- DONE
-- ============================================================
