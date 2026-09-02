create or replace function private.current_user_can_delete_post(
  p_post_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.posts p
    join public.rooms r on r.id = p.room_id
    join public.users u on u.id = (select auth.uid())
    where p.id = p_post_id
      and p.status = 'published'::public.post_status
      and u.status = 'active'::public.user_status
      and r.daycare_id = u.daycare_id
      and (
        u.role = 'admin'::public.user_role
        or (
          u.role = 'staff'::public.user_role
          and exists (
            select 1
            from public.room_staff rs
            where rs.room_id = p.room_id
              and rs.user_id = u.id
          )
        )
        or (
          u.role = 'parent'::public.user_role
          and p.author_id = u.id
        )
      )
  )
$$;