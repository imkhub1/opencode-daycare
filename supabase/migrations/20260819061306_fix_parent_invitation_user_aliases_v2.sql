create or replace function private.current_user_can_access_child(p_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users as app_users
    join public.rooms as daycare_rooms
      on daycare_rooms.daycare_id = app_users.daycare_id
    join public.children as daycare_children
      on daycare_children.room_id = daycare_rooms.id
    where app_users.id = (select auth.uid())
      and app_users.status = 'active'::public.user_status
      and app_users.role in (
        'staff'::public.user_role,
        'admin'::public.user_role
      )
      and daycare_children.id = p_child_id
  )
$$;

revoke all on function private.current_user_can_access_child(uuid)
from public, anon, authenticated;

grant execute on function private.current_user_can_access_child(uuid)
to authenticated;

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

  select app_users.daycare_id
  into v_caller_daycare_id
  from public.users as app_users
  where app_users.id = v_caller_id
    and app_users.status = 'active'::public.user_status
    and app_users.role in (
      'staff'::public.user_role,
      'admin'::public.user_role
    );

  if v_caller_daycare_id is null then
    raise exception 'Unable to create parent invitation';
  end if;

  select daycare_rooms.daycare_id
  into v_child_daycare_id
  from public.children as daycare_children
  join public.rooms as daycare_rooms
    on daycare_rooms.id = daycare_children.room_id
  where daycare_children.id = p_child_id
    and daycare_children.status = 'active'::public.child_status
  for update of daycare_children;

  if v_child_daycare_id is null
     or v_child_daycare_id <> v_caller_daycare_id then
    raise exception 'Unable to create parent invitation';
  end if;

  if exists (
    select 1
    from public.parent_children as links
    join public.users as app_users on app_users.id = links.parent_id
    join auth.users as auth_users on auth_users.id = links.parent_id
    where links.child_id = p_child_id
      and app_users.role = 'parent'::public.user_role
      and lower(btrim(auth_users.email)) = v_normalized_email
  ) then
    raise exception 'Unable to create parent invitation';
  end if;

  if exists (
    select 1
    from public.invitations as pending_invitations
    where pending_invitations.child_id = p_child_id
      and pending_invitations.email = v_normalized_email
      and pending_invitations.status = 'pending'::public.invitation_status
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
    links.parent_id,
    app_users.full_name,
    auth_users.email,
    links.relationship,
    app_users.status::text
  from public.parent_children as links
  join public.users as app_users on app_users.id = links.parent_id
  join auth.users as auth_users on auth_users.id = links.parent_id
  where links.child_id = p_child_id
    and app_users.role = 'parent'::public.user_role;
end;
$$;

revoke all on function public.get_child_parent_links(uuid)
from public, anon, authenticated;

grant execute on function public.get_child_parent_links(uuid)
to authenticated;
