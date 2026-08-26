-- Migration: 20260825204217_post_deletion_storage_api_cleanup.sql
-- Description: Remove the invalid SQL Storage cleanup trigger and authorize Storage API deletion for post photos.

create or replace function private.current_user_can_delete_post_photo_storage(
  p_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.post_photos pp
    join public.posts p on p.id = pp.post_id
    where pp.storage_path = p_object_name
      and private.current_user_can_delete_post(p.id)
  )
  or exists (
    select 1
    from public.users u
    join public.post_photos pp on pp.storage_path = p_object_name
    join public.posts p on p.id = pp.post_id
    where u.id = (select auth.uid())
      and u.status = 'active'::public.user_status
      and p.author_id = u.id
      and p.status in ('uploading'::public.post_status, 'failed'::public.post_status)
  )
$$;

revoke all on function private.current_user_can_delete_post_photo_storage(text)
from public, anon, authenticated;

grant execute on function private.current_user_can_delete_post_photo_storage(text)
to authenticated;

create or replace function private.current_user_can_select_post_photo_storage(
  p_object_name text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
begin
  if v_caller_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.post_photos pp
    join public.posts p on p.id = pp.post_id
    where pp.storage_path = p_object_name
      and p.status = 'published'::public.post_status
      and private.current_user_can_select_post_photo(p.id)
  );
end;
$$;

revoke all on function private.current_user_can_select_post_photo_storage(text)
from public, anon, authenticated;

grant execute on function private.current_user_can_select_post_photo_storage(text)
to authenticated;

drop trigger if exists delete_post_photo_objects on public.posts;
drop function if exists private.delete_post_photo_objects();

drop policy if exists "post_photos_storage_delete" on storage.objects;
create policy "post_photos_storage_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'post-photos'
  and private.current_user_can_delete_post_photo_storage(name)
);

drop policy if exists "post_photos_select_policy" on public.post_photos;
create policy "post_photos_select_policy"
on public.post_photos
for select
to authenticated
using (
  private.current_user_can_select_post_photo(post_id)
);
