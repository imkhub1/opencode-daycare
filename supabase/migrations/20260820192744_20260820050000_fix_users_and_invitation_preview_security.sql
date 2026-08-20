-- Migration: 20260820050000_fix_users_and_invitation_preview_security.sql
-- Description: Security corrections for public.users policies, invitation preview RPC, helper functions, and rls_auto_enable.

-- H-01: Revoke direct access to get_invitation_preview to prevent PII exposure and enumeration
revoke all on function public.get_invitation_preview(text) from public, anon, authenticated;

-- H-04: Revoke EXECUTE on public.rls_auto_enable() from public, anon, authenticated, and service_role
revoke execute on function public.rls_auto_enable() from public, anon, authenticated, service_role;

-- H-05: Update current_user_daycare_id and current_user_role to filter for active status
create or replace function private.current_user_daycare_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select users.daycare_id
  from public.users
  where users.id = (select auth.uid())
    and users.status = 'active'::public.user_status
$$;

create or replace function private.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select users.role
  from public.users
  where users.id = (select auth.uid())
    and users.status = 'active'::public.user_status
$$;

revoke all on function private.current_user_daycare_id() from public, anon;
revoke all on function private.current_user_role() from public, anon;
grant execute on function private.current_user_daycare_id() to authenticated;
grant execute on function private.current_user_role() to authenticated;

-- H-02: Replace users_read_own_daycare with separate policies for staff/admin and parent
drop policy if exists "users_read_own_daycare" on public.users;
drop policy if exists "users_staff_admin_read_own_daycare" on public.users;
drop policy if exists "users_parent_read_self_and_staff" on public.users;

create policy "users_staff_admin_read_own_daycare"
on public.users
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

create policy "users_parent_read_self_and_staff"
on public.users
for select
to authenticated
using (
  (select private.current_user_is_active_parent())
  and (
    id = (select auth.uid())
    or (
      daycare_id = (select private.current_user_daycare_id())
      and role in (
        'staff'::public.user_role,
        'admin'::public.user_role
      )
    )
  )
);

-- H-03: Add users_parent_update_self for active parents on their own profile row
drop policy if exists "users_parent_update_self" on public.users;

create policy "users_parent_update_self"
on public.users
for update
to authenticated
using (
  id = (select auth.uid())
  and (select private.current_user_is_active_parent())
)
with check (
  id = (select auth.uid())
  and (select private.current_user_is_active_parent())
);
