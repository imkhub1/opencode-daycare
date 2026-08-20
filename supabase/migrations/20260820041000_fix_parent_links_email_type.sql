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
    auth_users.email::text,
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

grant execute on function public.get_child_parent_links(uuid) to authenticated;
