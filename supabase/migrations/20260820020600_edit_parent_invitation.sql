create or replace function public.update_parent_invitation(
  p_invitation_id uuid,
  p_full_name text,
  p_email text,
  p_relationship public.relationship_type
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.invitations%rowtype;
  v_caller_daycare_id uuid;
  v_child_daycare_id uuid;
  v_normalized_email text := lower(btrim(p_email));
begin
  if nullif(btrim(p_full_name), '') is null
     or length(btrim(p_full_name)) > 120
     or v_normalized_email is null
     or length(v_normalized_email) > 320
     or p_relationship is null then
    raise exception 'Unable to update parent invitation';
  end if;

  select users.daycare_id
  into v_caller_daycare_id
  from public.users
  where users.id = (select auth.uid())
    and users.status = 'active'::public.user_status
    and users.role in ('staff'::public.user_role, 'admin'::public.user_role);

  select invitations.*
  into v_invitation
  from public.invitations
  where invitations.id = p_invitation_id
  for update;

  if not found then
    raise exception 'Unable to update parent invitation';
  end if;

  select rooms.daycare_id
  into v_child_daycare_id
  from public.children
  join public.rooms on rooms.id = children.room_id
  where children.id = v_invitation.child_id
    and children.status = 'active'::public.child_status
  for update of children;

  if v_caller_daycare_id is null
     or v_child_daycare_id is null
     or v_caller_daycare_id <> v_child_daycare_id
     or v_invitation.status <> 'pending'::public.invitation_status
     or v_invitation.expires_at <= now() then
    raise exception 'Unable to update parent invitation';
  end if;

  if exists (
    select 1
    from public.parent_children
    join public.users on users.id = parent_children.parent_id
    join auth.users on auth.users.id = parent_children.parent_id
    where parent_children.child_id = v_invitation.child_id
      and users.role = 'parent'::public.user_role
      and lower(btrim(auth.users.email)) = v_normalized_email
  ) then
    raise exception 'Unable to update parent invitation';
  end if;

  if exists (
    select 1
    from public.invitations
    where invitations.id <> v_invitation.id
      and invitations.child_id = v_invitation.child_id
      and invitations.email = v_normalized_email
      and invitations.status = 'pending'::public.invitation_status
  ) then
    raise exception 'Unable to update parent invitation';
  end if;

  update public.invitations
  set full_name = btrim(p_full_name),
      email = v_normalized_email,
      relationship = p_relationship,
      delivery_status = 'failed'::public.invitation_delivery_status,
      delivery_error = null,
      resend_email_id = null,
      last_delivery_attempt_at = null,
      sent_at = null
  where id = v_invitation.id;

  return true;
exception
  when unique_violation then
    raise exception 'Unable to update parent invitation';
end;
$$;

revoke all on function public.update_parent_invitation(
  uuid, text, text, public.relationship_type
) from public, anon, authenticated;

grant execute on function public.update_parent_invitation(
  uuid, text, text, public.relationship_type
) to authenticated;
