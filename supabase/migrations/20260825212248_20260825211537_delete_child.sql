-- SPEC 13: restricted transactional child deletion boundary.

create function public.delete_child(p_child_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_caller_id uuid := (select auth.uid());
  v_caller_daycare_id uuid;
  v_child_daycare_id uuid;
begin
  select users.daycare_id
  into v_caller_daycare_id
  from public.users
  where users.id = v_caller_id
    and users.status = 'active'::public.user_status
    and users.role in (
      'staff'::public.user_role,
      'admin'::public.user_role
    );

  if v_caller_id is null or v_caller_daycare_id is null then
    raise exception 'Unable to delete child';
  end if;

  -- Lock the child before checking or deleting any dependent rows.
  select child_rooms.daycare_id
  into v_child_daycare_id
  from public.children as target_children
  join public.rooms as child_rooms
    on child_rooms.id = target_children.room_id
  where target_children.id = p_child_id
  for update of target_children;

  if not found
     or v_child_daycare_id is null
     or v_child_daycare_id <> v_caller_daycare_id then
    raise exception 'Unable to delete child';
  end if;

  delete from public.invitations
  where invitations.child_id = p_child_id;

  delete from public.parent_children
  where parent_children.child_id = p_child_id;

  delete from public.post_children
  where post_children.child_id = p_child_id;

  delete from public.children
  where children.id = p_child_id;

  if not found then
    raise exception 'Unable to delete child';
  end if;

  return true;
exception
  when others then
    raise exception using
      errcode = 'P0001',
      message = 'Unable to delete child';
end;
$function$;

-- Revoke only child-owned and child-link table DELETE privileges. Existing
-- public.users and public.posts deletion boundaries remain unchanged.
revoke delete on table
  public.children,
  public.invitations,
  public.parent_children,
  public.post_children
from public, anon, authenticated;

revoke all on function public.delete_child(uuid)
from public, anon, authenticated;

grant execute on function public.delete_child(uuid)
to authenticated;
