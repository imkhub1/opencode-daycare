create or replace function public.cancel_parent_invitation(p_invitation_id uuid)
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
    raise exception 'Unable to cancel parent invitation';
  end if;

  select children.status
  into v_child_status
  from public.children
  where children.id = v_invitation.child_id
  for update;

  if v_child_status <> 'active'::public.child_status
     or v_invitation.status <> 'pending'::public.invitation_status
     or v_invitation.expires_at <= now() then
    raise exception 'Unable to cancel parent invitation';
  end if;

  update public.invitations
  set status = 'cancelled'::public.invitation_status
  where id = v_invitation.id;

  return true;
end;
$$;

revoke all on function public.cancel_parent_invitation(uuid)
from public, anon, authenticated;

grant execute on function public.cancel_parent_invitation(uuid)
to authenticated;
