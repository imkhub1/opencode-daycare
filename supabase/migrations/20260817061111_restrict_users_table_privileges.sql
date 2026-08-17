revoke all on table public.users from anon, authenticated;
grant select, insert, update, delete on table public.users to authenticated;
