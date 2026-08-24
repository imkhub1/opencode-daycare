-- Migration: 20260821020109_fix_post_children_and_photo_consent_rls.sql
-- Description: SPEC 12 - Fix post_children selection authorization (published status/authorship, assigned staff, parent link) and restrict photo metadata selection to posts with active consent for all recipients.

-- 1. Update private.current_user_can_select_post_child to enforce post existence, published status or caller authorship, daycare match, and role-based assignment/link.
create or replace function private.current_user_can_select_post_child(
  p_post_id uuid,
  p_child_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_user_role public.user_role;
  v_user_daycare_id uuid;
begin
  if v_caller_id is null then
    return false;
  end if;

  select role, daycare_id
  into v_user_role, v_user_daycare_id
  from public.users
  where id = v_caller_id
    and status = 'active'::public.user_status;

  if v_user_role is null or v_user_daycare_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.posts p
    join public.rooms r on r.id = p.room_id
    where p.id = p_post_id
      and r.daycare_id = v_user_daycare_id
      and (
        p.author_id = v_caller_id
        or (
          p.status = 'published'::public.post_status
          and (
            v_user_role = 'admin'::public.user_role
            or (
              v_user_role = 'staff'::public.user_role
              and exists (
                select 1
                from public.room_staff rs
                where rs.room_id = p.room_id
                  and rs.user_id = v_caller_id
              )
            )
            or (
              v_user_role = 'parent'::public.user_role
              and exists (
                select 1
                from public.parent_children parent_c
                where parent_c.child_id = p_child_id
                  and parent_c.parent_id = v_caller_id
              )
            )
          )
        )
      )
  );
end;
$$;

revoke all on function private.current_user_can_select_post_child(uuid, uuid) from public, anon;
grant execute on function private.current_user_can_select_post_child(uuid, uuid) to authenticated;

-- 2. Create private helper function to check if caller can select photo metadata (combining post select authorization and active photo consent for all recipient children).
create or replace function private.current_user_can_select_post_photo(
  p_post_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.current_user_can_select_post(p_post_id) then
    return false;
  end if;

  return not exists (
    select 1
    from public.post_children pc
    join public.children c on c.id = pc.child_id
    where pc.post_id = p_post_id
      and c.photo_consent = false
  );
end;
$$;

revoke all on function private.current_user_can_select_post_photo(uuid) from public, anon;
grant execute on function private.current_user_can_select_post_photo(uuid) to authenticated;

-- 3. Update private.current_user_can_select_post_photo_storage to use current_user_can_select_post_photo.
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

revoke all on function private.current_user_can_select_post_photo_storage(text) from public, anon;
grant execute on function private.current_user_can_select_post_photo_storage(text) to authenticated;

-- 4. Update post_photos_select_policy on public.post_photos to use private.current_user_can_select_post_photo.
drop policy if exists "post_photos_select_policy" on public.post_photos;
create policy "post_photos_select_policy"
on public.post_photos
for select
to authenticated
using (
  private.current_user_can_select_post_photo(post_id)
);
