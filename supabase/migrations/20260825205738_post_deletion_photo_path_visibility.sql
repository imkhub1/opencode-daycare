-- Migration: 20260825205738_post_deletion_photo_path_visibility.sql
-- Description: Let authorized post deleters read photo paths needed for Storage API cleanup without exposing them to unrelated users.

drop policy if exists "post_photos_select_policy" on public.post_photos;
create policy "post_photos_select_policy"
on public.post_photos
for select
to authenticated
using (
  private.current_user_can_select_post_photo(post_id)
  or private.current_user_can_delete_post(post_id)
);
