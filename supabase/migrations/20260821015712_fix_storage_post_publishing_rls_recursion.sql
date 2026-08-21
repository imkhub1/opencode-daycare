-- Migration: 20260821015712_fix_storage_post_publishing_rls_recursion.sql
-- Description: SPEC 12 - Fix storage upload and RLS policy recursion (42P17) using private SECURITY DEFINER helpers for posts, post_children, post_photos, and storage.objects.

-- 1. Helper function to check if caller can select a post (or its photos metadata)
create or replace function private.current_user_can_select_post(
  p_post_id uuid
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
                from public.post_children pc
                join public.parent_children parent_c on parent_c.child_id = pc.child_id
                where pc.post_id = p.id
                  and parent_c.parent_id = v_caller_id
              )
            )
          )
        )
      )
  );
end;
$$;

revoke all on function private.current_user_can_select_post(uuid) from public, anon;
grant execute on function private.current_user_can_select_post(uuid) to authenticated;

-- 2. Helper function to check if caller can select a post_children row
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

  if v_user_role in ('staff'::public.user_role, 'admin'::public.user_role) then
    return exists (
      select 1
      from public.posts p
      join public.rooms r on r.id = p.room_id
      where p.id = p_post_id
        and r.daycare_id = v_user_daycare_id
    );
  elsif v_user_role = 'parent'::public.user_role then
    return exists (
      select 1
      from public.parent_children pc
      where pc.child_id = p_child_id
        and pc.parent_id = v_caller_id
    );
  end if;

  return false;
end;
$$;

revoke all on function private.current_user_can_select_post_child(uuid, uuid) from public, anon;
grant execute on function private.current_user_can_select_post_child(uuid, uuid) to authenticated;

-- 3. Helper function for Storage INSERT check
create or replace function private.current_user_can_insert_post_photo_storage(
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
    from public.users u
    join public.post_photos pp on pp.storage_path = p_object_name
    join public.posts p on p.id = pp.post_id
    where u.id = v_caller_id
      and u.status = 'active'::public.user_status
      and p.author_id = v_caller_id
      and p.status = 'uploading'::public.post_status
      and (p.upload_expires_at is null or p.upload_expires_at > now())
  );
end;
$$;

revoke all on function private.current_user_can_insert_post_photo_storage(text) from public, anon;
grant execute on function private.current_user_can_insert_post_photo_storage(text) to authenticated;

-- 4. Helper function for Storage SELECT check
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
    from public.post_photos pp
    join public.posts p on p.id = pp.post_id
    join public.rooms r on r.id = p.room_id
    where pp.storage_path = p_object_name
      and p.status = 'published'::public.post_status
      and r.daycare_id = v_user_daycare_id
      and not exists (
        select 1
        from public.post_children pc
        join public.children c on c.id = pc.child_id
        where pc.post_id = p.id
          and c.photo_consent = false
      )
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
            from public.post_children pc
            join public.parent_children parent_c on parent_c.child_id = pc.child_id
            where pc.post_id = p.id
              and parent_c.parent_id = v_caller_id
          )
        )
      )
  );
end;
$$;

revoke all on function private.current_user_can_select_post_photo_storage(text) from public, anon;
grant execute on function private.current_user_can_select_post_photo_storage(text) to authenticated;

-- 5. Helper function for Storage DELETE check
create or replace function private.current_user_can_delete_post_photo_storage(
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
    from public.users u
    join public.post_photos pp on pp.storage_path = p_object_name
    join public.posts p on p.id = pp.post_id
    where u.id = v_caller_id
      and u.status = 'active'::public.user_status
      and p.author_id = v_caller_id
      and p.status in ('uploading'::public.post_status, 'failed'::public.post_status)
  );
end;
$$;

revoke all on function private.current_user_can_delete_post_photo_storage(text) from public, anon;
grant execute on function private.current_user_can_delete_post_photo_storage(text) to authenticated;

-- 6. Update Table RLS Policies using private helpers
drop policy if exists "posts_select_policy" on public.posts;
create policy "posts_select_policy"
on public.posts
for select
to authenticated
using (
  private.current_user_can_select_post(id)
);

drop policy if exists "post_children_select_policy" on public.post_children;
create policy "post_children_select_policy"
on public.post_children
for select
to authenticated
using (
  private.current_user_can_select_post_child(post_id, child_id)
);

drop policy if exists "post_photos_select_policy" on public.post_photos;
create policy "post_photos_select_policy"
on public.post_photos
for select
to authenticated
using (
  private.current_user_can_select_post(post_id)
);

-- 7. Update Storage.Objects Policies using private helpers
drop policy if exists "post_photos_storage_insert" on storage.objects;
create policy "post_photos_storage_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'post-photos'
  and private.current_user_can_insert_post_photo_storage(name)
);

drop policy if exists "post_photos_storage_select" on storage.objects;
create policy "post_photos_storage_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'post-photos'
  and private.current_user_can_select_post_photo_storage(name)
);

drop policy if exists "post_photos_storage_delete" on storage.objects;
create policy "post_photos_storage_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'post-photos'
  and private.current_user_can_delete_post_photo_storage(name)
);
