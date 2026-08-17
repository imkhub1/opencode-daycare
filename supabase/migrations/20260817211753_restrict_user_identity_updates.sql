revoke update on table public.users from authenticated;
grant update (
  full_name,
  avatar_url,
  notify_on_post,
  daily_summary_enabled
) on table public.users to authenticated;

drop policy "users_staff_insert" on public.users;
drop policy "users_staff_update" on public.users;
drop policy "users_admin_delete" on public.users;

create policy "users_staff_insert"
on public.users
for insert
to authenticated
with check (
  (select private.current_user_is_active())
  and (select private.current_user_role()) in (
    'staff'::public.user_role,
    'admin'::public.user_role
  )
  and daycare_id = (select private.current_user_daycare_id())
);

create policy "users_staff_update"
on public.users
for update
to authenticated
using (
  (select private.current_user_is_active())
  and (select private.current_user_role()) in (
    'staff'::public.user_role,
    'admin'::public.user_role
  )
  and daycare_id = (select private.current_user_daycare_id())
)
with check (
  (select private.current_user_is_active())
  and (select private.current_user_role()) in (
    'staff'::public.user_role,
    'admin'::public.user_role
  )
  and daycare_id = (select private.current_user_daycare_id())
);

create policy "users_admin_delete"
on public.users
for delete
to authenticated
using (
  (select private.current_user_is_active())
  and (select private.current_user_role()) = 'admin'::public.user_role
  and daycare_id = (select private.current_user_daycare_id())
);
