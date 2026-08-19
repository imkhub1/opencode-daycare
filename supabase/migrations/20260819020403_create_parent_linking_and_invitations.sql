create extension if not exists "pgcrypto" with schema extensions;

create type public.relationship_type as enum (
  'father',
  'mother',
  'guardian'
);

create type public.invitation_status as enum (
  'pending',
  'accepted',
  'expired',
  'cancelled'
);

create type public.invitation_delivery_status as enum (
  'sent',
  'failed'
);

create table public.parent_children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete restrict,
  relationship public.relationship_type not null,
  created_at timestamptz not null default now(),
  constraint parent_children_parent_child_unique unique (parent_id, child_id)
);

create index parent_children_parent_id_idx
on public.parent_children (parent_id);

create index parent_children_child_id_idx
on public.parent_children (child_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete restrict,
  invited_by uuid not null references public.users(id) on delete restrict,
  full_name text not null,
  email text not null,
  relationship public.relationship_type not null,
  code_hash text not null unique,
  code_ciphertext text not null,
  status public.invitation_status not null default 'pending',
  delivery_status public.invitation_delivery_status not null default 'failed',
  delivery_error text,
  resend_email_id text,
  last_delivery_attempt_at timestamptz,
  sent_at timestamptz,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invitations_full_name_not_blank check (btrim(full_name) <> ''),
  constraint invitations_email_not_blank check (btrim(email) <> ''),
  constraint invitations_email_normalized check (email = lower(btrim(email))),
  constraint invitations_code_hash_not_blank check (btrim(code_hash) <> ''),
  constraint invitations_code_ciphertext_not_blank check (btrim(code_ciphertext) <> ''),
  constraint invitations_accepted_at_consistent check (
    (status = 'accepted') = (accepted_at is not null)
  ),
  constraint invitations_accepted_requires_sent check (
    status <> 'accepted' or delivery_status = 'sent'
  ),
  constraint invitations_sent_timestamp_consistent check (
    (delivery_status = 'sent') = (sent_at is not null)
  )
);

create index invitations_child_status_idx
on public.invitations (child_id, status);

create index invitations_invited_by_idx
on public.invitations (invited_by);

create index invitations_email_idx
on public.invitations (lower(email));

create index invitations_expires_at_idx
on public.invitations (expires_at);

create unique index invitations_pending_child_email_unique_idx
on public.invitations (child_id, lower(email))
where status = 'pending';

revoke all on type public.relationship_type from public, anon, authenticated;
revoke all on type public.invitation_status from public, anon, authenticated;
revoke all on type public.invitation_delivery_status from public, anon, authenticated;

grant usage on type public.relationship_type to anon, authenticated;
grant usage on type public.invitation_status to anon, authenticated;
grant usage on type public.invitation_delivery_status to anon, authenticated;

create or replace function private.hash_parent_invitation_code(p_token text)
returns text
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select encode(
    extensions.digest(
      convert_to(upper(btrim(p_token)), 'UTF8'),
      'sha256'
    ),
    'hex'
  )
$$;

revoke all on function private.hash_parent_invitation_code(text)
from public, anon, authenticated;

create or replace function private.current_user_is_active_parent()
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
      and users.role = 'parent'::public.user_role
      and users.status = 'active'::public.user_status
  )
$$;

revoke all on function private.current_user_is_active_parent()
from public, anon, authenticated;

grant execute on function private.current_user_is_active_parent() to authenticated;

create or replace function private.current_user_can_access_child(p_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users
    join public.rooms
      on rooms.daycare_id = users.daycare_id
    join public.children
      on children.room_id = rooms.id
    where users.id = (select auth.uid())
      and users.status = 'active'::public.user_status
      and users.role in (
        'staff'::public.user_role,
        'admin'::public.user_role
      )
      and children.id = p_child_id
  )
$$;

revoke all on function private.current_user_can_access_child(uuid)
from public, anon, authenticated;

grant execute on function private.current_user_can_access_child(uuid) to authenticated;

alter table public.parent_children enable row level security;
alter table public.invitations enable row level security;

revoke all on table public.parent_children from public, anon, authenticated;
revoke all on table public.invitations from public, anon, authenticated;

grant select on table public.parent_children to authenticated;

create policy "parent_children_read_own_or_staff_daycare"
on public.parent_children
for select
to authenticated
using (
  (
    parent_id = (select auth.uid())
    and (select private.current_user_is_active_parent())
  )
  or (select private.current_user_can_access_child(child_id))
);

create policy "invitations_no_direct_access"
on public.invitations
for all
to anon, authenticated
using (false)
with check (false);

create or replace function public.create_parent_invitation(
  p_child_id uuid,
  p_full_name text,
  p_email text,
  p_relationship public.relationship_type,
  p_code_hash text,
  p_code_ciphertext text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_caller_daycare_id uuid;
  v_child_daycare_id uuid;
  v_normalized_email text := lower(btrim(p_email));
  v_invitation_id uuid;
begin
  if v_caller_id is null
     or nullif(btrim(p_full_name), '') is null
     or v_normalized_email is null
     or v_normalized_email = ''
     or p_relationship is null
     or p_code_hash is null
     or p_code_hash !~ '^[0-9a-f]{64}$'
     or nullif(btrim(p_code_ciphertext), '') is null then
    raise exception 'Unable to create parent invitation';
  end if;

  select users.daycare_id
  into v_caller_daycare_id
  from public.users
  where users.id = v_caller_id
    and users.status = 'active'::public.user_status
    and users.role in (
      'staff'::public.user_role,
      'admin'::public.user_role
    );

  if v_caller_daycare_id is null then
    raise exception 'Unable to create parent invitation';
  end if;

  -- Lock the child before duplicate checks and acceptance can mutate its links.
  select rooms.daycare_id
  into v_child_daycare_id
  from public.children
  join public.rooms on rooms.id = children.room_id
  where children.id = p_child_id
    and children.status = 'active'::public.child_status
  for update of children;

  if v_child_daycare_id is null
     or v_child_daycare_id <> v_caller_daycare_id then
    raise exception 'Unable to create parent invitation';
  end if;

  if exists (
    select 1
    from public.parent_children
    join public.users on users.id = parent_children.parent_id
    join auth.users on auth.users.id = parent_children.parent_id
    where parent_children.child_id = p_child_id
      and users.role = 'parent'::public.user_role
      and lower(btrim(auth.users.email)) = v_normalized_email
  ) then
    raise exception 'Unable to create parent invitation';
  end if;

  if exists (
    select 1
    from public.invitations
    where invitations.child_id = p_child_id
      and invitations.email = v_normalized_email
      and invitations.status = 'pending'::public.invitation_status
  ) then
    raise exception 'Unable to create parent invitation';
  end if;

  begin
    insert into public.invitations (
      child_id,
      invited_by,
      full_name,
      email,
      relationship,
      code_hash,
      code_ciphertext,
      status,
      delivery_status,
      expires_at
    )
    values (
      p_child_id,
      v_caller_id,
      btrim(p_full_name),
      v_normalized_email,
      p_relationship,
      p_code_hash,
      btrim(p_code_ciphertext),
      'pending'::public.invitation_status,
      'failed'::public.invitation_delivery_status,
      now() + interval '7 days'
    )
    returning id into v_invitation_id;
  exception
    when unique_violation then
      raise exception 'Unable to create parent invitation';
  end;

  return v_invitation_id;
end;
$$;

revoke all on function public.create_parent_invitation(
  uuid,
  text,
  text,
  public.relationship_type,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.create_parent_invitation(
  uuid,
  text,
  text,
  public.relationship_type,
  text,
  text
) to authenticated;

create or replace function public.prepare_parent_invitation_delivery(p_invitation_id uuid)
returns table (
  invitation_id uuid,
  token_ciphertext text,
  child_name text,
  daycare_name text,
  full_name text,
  email text,
  relationship public.relationship_type,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.invitations%rowtype;
  v_child_name text;
  v_daycare_name text;
  v_child_status public.child_status;
begin
  select invitations.*
  into v_invitation
  from public.invitations
  where invitations.id = p_invitation_id
  for update;

  if not found
     or not (select private.current_user_can_access_child(v_invitation.child_id)) then
    raise exception 'Unable to prepare parent invitation delivery';
  end if;

  select children.full_name, children.status, daycares.name
  into v_child_name, v_child_status, v_daycare_name
  from public.children
  join public.rooms on rooms.id = children.room_id
  join public.daycares on daycares.id = rooms.daycare_id
  where children.id = v_invitation.child_id
  for update of children;

  if v_child_status <> 'active'::public.child_status
     or v_invitation.status <> 'pending'::public.invitation_status
     or v_invitation.delivery_status <> 'failed'::public.invitation_delivery_status
     or v_invitation.expires_at <= now() then
    raise exception 'Unable to prepare parent invitation delivery';
  end if;

  return query
  select
    v_invitation.id,
    v_invitation.code_ciphertext,
    v_child_name,
    v_daycare_name,
    v_invitation.full_name,
    v_invitation.email,
    v_invitation.relationship,
    v_invitation.expires_at;
end;
$$;

revoke all on function public.prepare_parent_invitation_delivery(uuid)
from public, anon, authenticated;

grant execute on function public.prepare_parent_invitation_delivery(uuid)
to authenticated;

create or replace function public.mark_parent_invitation_delivery(
  p_invitation_id uuid,
  p_delivery_status public.invitation_delivery_status,
  p_delivery_error text default null,
  p_resend_email_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.invitations%rowtype;
  v_child_status public.child_status;
begin
  select invitations.*
  into v_invitation
  from public.invitations
  where invitations.id = p_invitation_id
  for update;

  if not found
     or not (select private.current_user_can_access_child(v_invitation.child_id)) then
    raise exception 'Unable to update parent invitation delivery';
  end if;

  select children.status
  into v_child_status
  from public.children
  where children.id = v_invitation.child_id
  for update;

  if v_child_status <> 'active'::public.child_status
     or v_invitation.status <> 'pending'::public.invitation_status
     or v_invitation.expires_at <= now()
     or p_delivery_status is null then
    raise exception 'Unable to update parent invitation delivery';
  end if;

  if p_delivery_status = 'sent'::public.invitation_delivery_status then
    update public.invitations
    set delivery_status = 'sent'::public.invitation_delivery_status,
        delivery_error = null,
        resend_email_id = nullif(btrim(p_resend_email_id), ''),
        last_delivery_attempt_at = now(),
        sent_at = now()
    where id = v_invitation.id;
  else
    update public.invitations
    set delivery_status = 'failed'::public.invitation_delivery_status,
        delivery_error = coalesce(
          left(nullif(btrim(p_delivery_error), ''), 500),
          'Email delivery failed'
        ),
        resend_email_id = nullif(btrim(p_resend_email_id), ''),
        last_delivery_attempt_at = now(),
        sent_at = null
    where id = v_invitation.id;
  end if;

  return true;
end;
$$;

revoke all on function public.mark_parent_invitation_delivery(
  uuid,
  public.invitation_delivery_status,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.mark_parent_invitation_delivery(
  uuid,
  public.invitation_delivery_status,
  text,
  text
) to authenticated;

create or replace function public.get_invitation_preview(p_token text)
returns table (
  child_name text,
  daycare_name text,
  invited_full_name text,
  email text,
  relationship public.relationship_type,
  status public.invitation_status,
  delivery_status public.invitation_delivery_status,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code_hash text;
begin
  if nullif(btrim(p_token), '') is null then
    return;
  end if;

  v_code_hash := private.hash_parent_invitation_code(p_token);

  update public.invitations
  set status = 'expired'::public.invitation_status
  where invitations.code_hash = v_code_hash
    and invitations.status = 'pending'::public.invitation_status
    and invitations.expires_at <= now();

  return query
  select
    children.full_name,
    daycares.name,
    invitations.full_name,
    invitations.email,
    invitations.relationship,
    invitations.status,
    invitations.delivery_status,
    invitations.expires_at
  from public.invitations
  join public.children on children.id = invitations.child_id
  join public.rooms on rooms.id = children.room_id
  join public.daycares on daycares.id = rooms.daycare_id
  where invitations.code_hash = v_code_hash
    and invitations.status = 'pending'::public.invitation_status
    and invitations.delivery_status = 'sent'::public.invitation_delivery_status
    and invitations.expires_at > now();
end;
$$;

revoke all on function public.get_invitation_preview(text)
from public, anon, authenticated;

grant execute on function public.get_invitation_preview(text)
to anon, authenticated;

create or replace function public.get_child_parent_links(p_child_id uuid)
returns table (
  parent_id uuid,
  full_name text,
  email text,
  relationship public.relationship_type,
  parent_status text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.current_user_can_access_child(p_child_id)) then
    raise exception 'Unable to read child parent links';
  end if;

  return query
  select
    parent_children.parent_id,
    users.full_name,
    auth.users.email,
    parent_children.relationship,
    users.status::text
  from public.parent_children
  join public.users on users.id = parent_children.parent_id
  join auth.users on auth.users.id = parent_children.parent_id
  where parent_children.child_id = p_child_id
    and users.role = 'parent'::public.user_role;
end;
$$;

revoke all on function public.get_child_parent_links(uuid)
from public, anon, authenticated;

grant execute on function public.get_child_parent_links(uuid)
to authenticated;

create or replace function public.get_child_invitations(p_child_id uuid)
returns table (
  id uuid,
  child_id uuid,
  full_name text,
  email text,
  relationship public.relationship_type,
  status public.invitation_status,
  delivery_status public.invitation_delivery_status,
  expires_at timestamptz,
  sent_at timestamptz,
  delivery_error text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.current_user_can_access_child(p_child_id)) then
    raise exception 'Unable to read child invitations';
  end if;

  update public.invitations
  set status = 'expired'::public.invitation_status
  where invitations.child_id = p_child_id
    and invitations.status = 'pending'::public.invitation_status
    and invitations.expires_at <= now();

  return query
  select
    invitations.id,
    invitations.child_id,
    invitations.full_name,
    invitations.email,
    invitations.relationship,
    invitations.status,
    invitations.delivery_status,
    invitations.expires_at,
    invitations.sent_at,
    invitations.delivery_error
  from public.invitations
  where invitations.child_id = p_child_id
  order by invitations.created_at desc;
end;
$$;

revoke all on function public.get_child_invitations(uuid)
from public, anon, authenticated;

grant execute on function public.get_child_invitations(uuid)
to authenticated;

create or replace function public.accept_parent_invitation(
  p_token text,
  p_full_name text
)
returns table (
  parent_child_id uuid,
  invitation_id uuid,
  child_id uuid,
  relationship public.relationship_type,
  idempotent boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.invitations%rowtype;
  v_parent_id uuid := (select auth.uid());
  v_parent_role public.user_role;
  v_parent_status public.user_status;
  v_parent_daycare_id uuid;
  v_child_daycare_id uuid;
  v_child_status public.child_status;
  v_auth_email text;
  v_email_confirmed_at timestamptz;
  v_parent_child_id uuid;
  v_full_name text := nullif(btrim(p_full_name), '');
  v_code_hash text;
begin
  if v_parent_id is null
     or nullif(btrim(p_token), '') is null
     or v_full_name is null then
    raise exception 'Unable to accept parent invitation';
  end if;

  v_code_hash := private.hash_parent_invitation_code(p_token);

  -- All acceptance paths lock invitation, child, then profile in this order.
  select invitations.*
  into v_invitation
  from public.invitations
  where invitations.code_hash = v_code_hash
  for update;

  if not found then
    raise exception 'Unable to accept parent invitation';
  end if;

  select children.status, rooms.daycare_id
  into v_child_status, v_child_daycare_id
  from public.children
  join public.rooms on rooms.id = children.room_id
  where children.id = v_invitation.child_id
  for update of children;

  if not found then
    raise exception 'Unable to accept parent invitation';
  end if;

  select users.role, users.status, users.daycare_id
  into v_parent_role, v_parent_status, v_parent_daycare_id
  from public.users
  where users.id = v_parent_id
  for update;

  select lower(btrim(auth.users.email)), auth.users.email_confirmed_at
  into v_auth_email, v_email_confirmed_at
  from auth.users
  where auth.users.id = v_parent_id;

  if not found
     or v_email_confirmed_at is null
     or v_parent_role <> 'parent'::public.user_role
     or v_parent_status not in (
       'pending'::public.user_status,
       'active'::public.user_status
     )
     or v_parent_daycare_id is null
     or v_parent_daycare_id <> v_child_daycare_id
     or v_auth_email is null
     or v_auth_email <> v_invitation.email
     or v_child_status <> 'active'::public.child_status then
    raise exception 'Unable to accept parent invitation';
  end if;

  if v_invitation.status = 'accepted'::public.invitation_status then
    if v_invitation.email <> v_auth_email then
      raise exception 'Unable to accept parent invitation';
    end if;

    select parent_children.id
    into v_parent_child_id
    from public.parent_children
    where parent_children.parent_id = v_parent_id
      and parent_children.child_id = v_invitation.child_id;

    if v_parent_child_id is null then
      raise exception 'Unable to accept parent invitation';
    end if;

    return query
    select
      v_parent_child_id,
      v_invitation.id,
      v_invitation.child_id,
      v_invitation.relationship,
      true;
    return;
  end if;

  if v_invitation.status <> 'pending'::public.invitation_status
     or v_invitation.delivery_status <> 'sent'::public.invitation_delivery_status then
    raise exception 'Unable to accept parent invitation';
  end if;

  if v_invitation.expires_at <= now() then
    update public.invitations
    set status = 'expired'::public.invitation_status
    where invitations.id = v_invitation.id;
    raise exception 'Unable to accept parent invitation';
  end if;

  if exists (
    select 1
    from public.parent_children
    where parent_children.parent_id = v_parent_id
      and parent_children.child_id = v_invitation.child_id
  ) then
    raise exception 'Unable to accept parent invitation';
  end if;

  insert into public.parent_children (parent_id, child_id, relationship)
  values (v_parent_id, v_invitation.child_id, v_invitation.relationship)
  returning id into v_parent_child_id;

  update public.invitations
  set status = 'accepted'::public.invitation_status,
      accepted_at = now()
  where invitations.id = v_invitation.id;

  update public.users
  set full_name = v_full_name,
      status = case
        when status = 'pending'::public.user_status
          then 'active'::public.user_status
        else status
      end,
      updated_at = now()
  where users.id = v_parent_id;

  return query
  select
    v_parent_child_id,
    v_invitation.id,
    v_invitation.child_id,
    v_invitation.relationship,
    false;
end;
$$;

revoke all on function public.accept_parent_invitation(text, text)
from public, anon, authenticated;

grant execute on function public.accept_parent_invitation(text, text)
to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_app_metadata jsonb := coalesce(new.raw_app_meta_data, '{}'::jsonb);
  v_invite_token text := nullif(btrim(v_metadata ->> 'invite_token'), '');
  v_display_name text := nullif(btrim(v_metadata ->> 'display_name'), '');
  v_invitation public.invitations%rowtype;
  v_daycare_id uuid;
  v_child_status public.child_status;
  v_provisioned_role text := nullif(v_app_metadata ->> 'provisioned_role', '');
  v_provisioned_daycare_id uuid;
  v_provisioned_full_name text := nullif(
    btrim(v_app_metadata ->> 'full_name'),
    ''
  );
begin
  if v_invite_token is not null then
    select invitations.*
    into v_invitation
    from public.invitations
    where invitations.code_hash = private.hash_parent_invitation_code(v_invite_token)
      and invitations.email = lower(btrim(new.email))
      and invitations.status = 'pending'::public.invitation_status
      and invitations.delivery_status = 'sent'::public.invitation_delivery_status
      and invitations.expires_at > now()
    for update;

    if not found then
      raise exception 'Invalid parent invitation';
    end if;

    select children.status, rooms.daycare_id
    into v_child_status, v_daycare_id
    from public.children
    join public.rooms on rooms.id = children.room_id
    where children.id = v_invitation.child_id;

    if not found or v_child_status <> 'active'::public.child_status then
      raise exception 'Invalid parent invitation';
    end if;

    insert into public.users (id, daycare_id, role, status, full_name)
    values (
      new.id,
      v_daycare_id,
      'parent'::public.user_role,
      'pending'::public.user_status,
      coalesce(v_display_name, v_invitation.full_name)
    );

    return new;
  end if;

  -- Staff/admin provisioning is restricted to trusted Auth app metadata.
  if v_provisioned_role not in ('staff', 'admin')
     or nullif(v_app_metadata ->> 'provisioned_daycare_id', '') is null
     or v_provisioned_full_name is null then
    raise exception 'User provisioning requires a valid parent invitation';
  end if;

  v_provisioned_daycare_id := (v_app_metadata ->> 'provisioned_daycare_id')::uuid;

  insert into public.users (id, daycare_id, role, status, full_name)
  values (
    new.id,
    v_provisioned_daycare_id,
    v_provisioned_role::public.user_role,
    'active'::public.user_status,
    v_provisioned_full_name
  );

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;
