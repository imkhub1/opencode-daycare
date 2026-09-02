-- Migration: 20260825202743_post_deletion_authorization.sql
-- Description: Allow active staff/admin users to delete visible feed posts and active parents to delete their own posts.

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

revoke all on function private.current_user_can_delete_post(uuid)
from public, anon, authenticated;

grant execute on function private.current_user_can_delete_post(uuid)
to authenticated;

grant delete on table public.posts to authenticated;

drop policy if exists "posts_delete_policy" on public.posts;
create policy "posts_delete_policy"
on public.posts
for delete
to authenticated
using (
  (select private.current_user_can_delete_post(id))
);

-- Keep private photo objects from surviving an authorized post deletion.
create or replace function private.delete_post_photo_objects()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from storage.objects
  where bucket_id = 'post-photos'
    and name in (
      select pp.storage_path
      from public.post_photos pp
      where pp.post_id = old.id
    );

  return old;
end;
$$;

revoke all on function private.delete_post_photo_objects()
from public, anon, authenticated;

drop trigger if exists delete_post_photo_objects on public.posts;
create trigger delete_post_photo_objects
before delete on public.posts
for each row
execute function private.delete_post_photo_objects();