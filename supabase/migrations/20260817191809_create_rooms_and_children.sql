create type public.child_status as enum ('active', 'archived');

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  daycare_id uuid not null references public.daycares(id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now(),
  constraint rooms_name_not_blank check (btrim(name) <> '')
);

create unique index rooms_daycare_name_unique_idx
on public.rooms (daycare_id, lower(name));

create table public.children (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete restrict,
  full_name text not null,
  birth_date date not null,
  enrolled_at date not null,
  medical_notes text,
  allergy_tags text[] not null default '{}'::text[],
  photo_consent boolean not null default true,
  status public.child_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint children_full_name_not_blank check (btrim(full_name) <> ''),
  constraint children_birth_before_enrollment check (birth_date < enrolled_at)
);

create index children_room_id_status_idx
on public.children (room_id, status);

create function private.set_children_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_children_updated_at() from public, anon, authenticated;

create trigger set_children_updated_at
before update on public.children
for each row
execute function private.set_children_updated_at();

create function private.current_user_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users
    where users.id = (select auth.uid())
      and users.status = 'active'::public.user_status
  )
$$;

revoke all on function private.current_user_is_active() from public, anon, authenticated;
grant execute on function private.current_user_is_active() to authenticated;

alter table public.rooms enable row level security;
alter table public.children enable row level security;

revoke all on table public.rooms from anon, authenticated;
revoke all on table public.children from anon, authenticated;
revoke all on type public.child_status from public, anon, authenticated;

grant select on table public.rooms to authenticated;
grant select, insert, update on table public.children to authenticated;
grant usage on type public.child_status to authenticated;

create policy "rooms_read_own_daycare"
on public.rooms
for select
to authenticated
using (
  (select private.current_user_is_active())
  and (select private.current_user_role()) in (
    'staff'::public.user_role,
    'admin'::public.user_role
  )
  and daycare_id = (select private.current_user_daycare_id())
);

create policy "children_read_own_daycare"
on public.children
for select
to authenticated
using (
  (select private.current_user_is_active())
  and (select private.current_user_role()) in (
    'staff'::public.user_role,
    'admin'::public.user_role
  )
  and exists (
    select 1
    from public.rooms
    where rooms.id = children.room_id
      and rooms.daycare_id = (select private.current_user_daycare_id())
  )
);

create policy "children_insert_own_daycare"
on public.children
for insert
to authenticated
with check (
  (select private.current_user_is_active())
  and (select private.current_user_role()) in (
    'staff'::public.user_role,
    'admin'::public.user_role
  )
  and exists (
    select 1
    from public.rooms
    where rooms.id = children.room_id
      and rooms.daycare_id = (select private.current_user_daycare_id())
  )
);

create policy "children_update_own_daycare"
on public.children
for update
to authenticated
using (
  (select private.current_user_is_active())
  and (select private.current_user_role()) in (
    'staff'::public.user_role,
    'admin'::public.user_role
  )
  and exists (
    select 1
    from public.rooms
    where rooms.id = children.room_id
      and rooms.daycare_id = (select private.current_user_daycare_id())
  )
)
with check (
  (select private.current_user_is_active())
  and (select private.current_user_role()) in (
    'staff'::public.user_role,
    'admin'::public.user_role
  )
  and exists (
    select 1
    from public.rooms
    where rooms.id = children.room_id
      and rooms.daycare_id = (select private.current_user_daycare_id())
  )
);

do $$
declare
  target_daycare_id uuid;
  matching_daycares integer;
begin
  select count(*), (array_agg(id))[1]
  into matching_daycares, target_daycare_id
  from public.daycares
  where name = 'Guardería Sala Soles';

  if matching_daycares <> 1 then
    raise exception
      'Expected exactly one daycare named Guardería Sala Soles, found %',
      matching_daycares;
  end if;

  insert into public.rooms (daycare_id, name)
  values
    (target_daycare_id, 'Soles'),
    (target_daycare_id, 'Lunas'),
    (target_daycare_id, 'Estrellas');
end;
$$;
