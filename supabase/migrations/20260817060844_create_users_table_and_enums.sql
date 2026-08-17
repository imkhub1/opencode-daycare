create type public.user_role as enum ('staff', 'parent', 'admin');
create type public.user_status as enum ('pending', 'active');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  daycare_id uuid references public.daycares(id),
  role public.user_role not null,
  status public.user_status not null default 'active',
  full_name text not null,
  avatar_url text,
  notify_on_post boolean not null default true,
  daily_summary_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_daycare_id_idx on public.users(daycare_id);

alter table public.users enable row level security;

revoke all on table public.users from anon, authenticated;
grant select, insert, update, delete on table public.users to authenticated;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- These helpers bypass users RLS to avoid recursive policy evaluation.
create function private.current_user_daycare_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select users.daycare_id
  from public.users
  where users.id = (select auth.uid())
$$;

create function private.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select users.role
  from public.users
  where users.id = (select auth.uid())
$$;

revoke all on function private.current_user_daycare_id() from public;
revoke all on function private.current_user_role() from public;
grant execute on function private.current_user_daycare_id() to authenticated;
grant execute on function private.current_user_role() to authenticated;

create policy "users_read_own_daycare"
on public.users
for select
to authenticated
using (
  daycare_id = (select private.current_user_daycare_id())
);

create policy "users_staff_insert"
on public.users
for insert
to authenticated
with check (
  (select private.current_user_role()) in (
    'staff'::public.user_role,
    'admin'::public.user_role
  )
);

create policy "users_staff_update"
on public.users
for update
to authenticated
using (
  (select private.current_user_role()) in (
    'staff'::public.user_role,
    'admin'::public.user_role
  )
)
with check (
  (select private.current_user_role()) in (
    'staff'::public.user_role,
    'admin'::public.user_role
  )
);

create policy "users_admin_delete"
on public.users
for delete
to authenticated
using (
  (select private.current_user_role()) = 'admin'::public.user_role
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if nullif(metadata ->> 'daycare_id', '') is null then
    raise exception 'Missing required user metadata: daycare_id';
  end if;

  if nullif(metadata ->> 'role', '') is null then
    raise exception 'Missing required user metadata: role';
  end if;

  if nullif(btrim(metadata ->> 'full_name'), '') is null then
    raise exception 'Missing required user metadata: full_name';
  end if;

  insert into public.users (id, daycare_id, role, full_name, status)
  values (
    new.id,
    (metadata ->> 'daycare_id')::uuid,
    (metadata ->> 'role')::public.user_role,
    btrim(metadata ->> 'full_name'),
    coalesce(
      nullif(metadata ->> 'status', '')::public.user_status,
      'active'::public.user_status
    )
  );

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
