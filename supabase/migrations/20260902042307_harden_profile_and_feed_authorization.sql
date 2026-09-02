-- Auth creates profiles through the trusted handle_new_user trigger and staff
-- provisioning uses a trusted server path. Authenticated clients must not be
-- able to create arbitrary role, status, or daycare assignments.
revoke insert on table public.users from public, anon, authenticated;
drop policy if exists "users_staff_insert" on public.users;
