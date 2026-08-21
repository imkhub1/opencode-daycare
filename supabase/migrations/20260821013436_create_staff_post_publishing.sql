-- Migration: 20260821013436_create_staff_post_publishing.sql
-- Description: SPEC 12 - Staff post publishing tables, types, RLS policies, storage bucket, RPC functions, and room_staff backfill.

-- 1. Create Enums
create type public.post_type as enum (
  'meal',
  'nap',
  'activity',
  'achievement',
  'mood',
  'photo',
  'announcement'
);

create type public.post_status as enum (
  'uploading',
  'published',
  'failed'
);

revoke all on type public.post_type from public, anon, authenticated;
revoke all on type public.post_status from public, anon, authenticated;

grant usage on type public.post_type to authenticated;
grant usage on type public.post_status to authenticated;

-- 2. Create Tables
create table public.room_staff (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index room_staff_user_id_idx on public.room_staff (user_id);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.users(id) on delete restrict,
  room_id uuid not null references public.rooms(id) on delete restrict,
  type public.post_type not null,
  body text not null,
  status public.post_status not null default 'uploading',
  published_at timestamptz,
  upload_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_body_not_blank check (btrim(body) <> ''),
  constraint posts_published_consistent check (
    (status = 'published') = (published_at is not null)
  )
);

create index posts_author_id_idx on public.posts (author_id);
create index posts_room_id_status_published_at_idx on public.posts (room_id, status, published_at desc);
create index posts_upload_expires_at_idx on public.posts (upload_expires_at) where status = 'uploading';

create table public.post_children (
  post_id uuid not null references public.posts(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete restrict,
  primary key (post_id, child_id)
);

create index post_children_child_id_idx on public.post_children (child_id);

create table public.post_photos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  storage_path text not null unique,
  position smallint not null,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint post_photos_position_nonnegative check (position >= 0),
  constraint post_photos_size_positive check (size_bytes > 0),
  constraint post_photos_mime_allowed check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')
  ),
  constraint post_photos_post_position_unique unique (post_id, position)
);

create index post_photos_post_id_position_idx on public.post_photos (post_id, position);

-- 3. Trigger for updated_at on public.posts
create or replace function private.set_posts_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_posts_updated_at() from public, anon, authenticated;

create trigger set_posts_updated_at
before update on public.posts
for each row
execute function private.set_posts_updated_at();

-- 4. Helper Function: Check if caller can manage a room (Staff assigned or Admin in daycare)
create or replace function private.current_user_can_manage_room(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.rooms r
    join public.users u on u.id = (select auth.uid())
    where r.id = p_room_id
      and u.status = 'active'::public.user_status
      and r.daycare_id = u.daycare_id
      and (
        u.role = 'admin'::public.user_role
        or (
          u.role = 'staff'::public.user_role
          and exists (
            select 1
            from public.room_staff rs
            where rs.room_id = p_room_id
              and rs.user_id = u.id
          )
        )
      )
  )
$$;

revoke all on function private.current_user_can_manage_room(uuid) from public, anon;
grant execute on function private.current_user_can_manage_room(uuid) to authenticated;

-- 5. Workflow RPC Functions

-- 5.1 prepare_post
create or replace function public.prepare_post(
  p_room_id uuid,
  p_type public.post_type,
  p_body text,
  p_photos jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_trimmed_body text := btrim(p_body);
  v_photo_count integer;
  v_active_children_count integer;
  v_post_id uuid;
  v_status public.post_status;
  v_published_at timestamptz;
  v_expires_at timestamptz;
  v_photo_item jsonb;
  v_photo_idx integer := 0;
  v_photo_id uuid;
  v_mime_type text;
  v_size_bytes bigint;
  v_storage_path text;
  v_result_photos jsonb := '[]'::jsonb;
begin
  if v_caller_id is null or not (select private.current_user_is_active()) then
    raise exception 'Unauthorized';
  end if;

  if not (select private.current_user_can_manage_room(p_room_id)) then
    raise exception 'Unauthorized room access';
  end if;

  if v_trimmed_body is null or v_trimmed_body = '' then
    raise exception 'Post body cannot be blank';
  end if;

  if p_type is null then
    raise exception 'Post type is required';
  end if;

  if p_photos is null or jsonb_typeof(p_photos) <> 'array' then
    p_photos := '[]'::jsonb;
  end if;

  v_photo_count := jsonb_array_length(p_photos);
  if v_photo_count > 6 then
    raise exception 'Cannot attach more than 6 photos';
  end if;

  select count(*)
  into v_active_children_count
  from public.children
  where children.room_id = p_room_id
    and children.status = 'active'::public.child_status;

  if v_active_children_count = 0 then
    raise exception 'Room has no active children';
  end if;

  if v_photo_count > 0 then
    if exists (
      select 1
      from public.children
      where children.room_id = p_room_id
        and children.status = 'active'::public.child_status
        and children.photo_consent = false
    ) then
      raise exception 'Photo post rejected: one or more children lack photo consent';
    end if;
  end if;

  if v_photo_count = 0 then
    v_status := 'published'::public.post_status;
    v_published_at := now();
    v_expires_at := null;
  else
    v_status := 'uploading'::public.post_status;
    v_published_at := null;
    v_expires_at := now() + interval '1 hour';
  end if;

  insert into public.posts (
    author_id,
    room_id,
    type,
    body,
    status,
    published_at,
    upload_expires_at
  )
  values (
    v_caller_id,
    p_room_id,
    p_type,
    v_trimmed_body,
    v_status,
    v_published_at,
    v_expires_at
  )
  returning id into v_post_id;

  insert into public.post_children (post_id, child_id)
  select v_post_id, children.id
  from public.children
  where children.room_id = p_room_id
    and children.status = 'active'::public.child_status;

  if v_photo_count > 0 then
    for v_photo_item in select * from jsonb_array_elements(p_photos)
    loop
      v_mime_type := v_photo_item->>'mime_type';
      v_size_bytes := (v_photo_item->>'size_bytes')::bigint;

      if v_mime_type is null or v_mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'image/gif') then
        raise exception 'Unsupported photo MIME type: %', v_mime_type;
      end if;

      if v_size_bytes is null or v_size_bytes <= 0 or v_size_bytes > 10485760 then
        raise exception 'Invalid photo size: %', v_size_bytes;
      end if;

      v_photo_id := gen_random_uuid();
      v_storage_path := 'posts/' || v_post_id || '/' || v_photo_id;

      insert into public.post_photos (
        id,
        post_id,
        storage_path,
        position,
        mime_type,
        size_bytes
      )
      values (
        v_photo_id,
        v_post_id,
        v_storage_path,
        v_photo_idx::smallint,
        v_mime_type,
        v_size_bytes
      );

      v_result_photos := v_result_photos || jsonb_build_object(
        'id', v_photo_id,
        'position', v_photo_idx,
        'storage_path', v_storage_path,
        'mime_type', v_mime_type,
        'size_bytes', v_size_bytes
      );

      v_photo_idx := v_photo_idx + 1;
    end loop;
  end if;

  return jsonb_build_object(
    'post_id', v_post_id,
    'status', v_status,
    'published_at', v_published_at,
    'upload_expires_at', v_expires_at,
    'photos', v_result_photos
  );
end;
$$;

revoke all on function public.prepare_post(uuid, public.post_type, text, jsonb) from public, anon;
grant execute on function public.prepare_post(uuid, public.post_type, text, jsonb) to authenticated;

-- 5.2 finalize_post
create or replace function public.finalize_post(
  p_post_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_post record;
  v_expected_photo_count integer;
  v_uploaded_photo_count integer;
begin
  if v_caller_id is null or not (select private.current_user_is_active()) then
    raise exception 'Unauthorized';
  end if;

  select *
  into v_post
  from public.posts
  where posts.id = p_post_id
  for update;

  if v_post.id is null then
    raise exception 'Post not found';
  end if;

  if v_post.author_id <> v_caller_id then
    raise exception 'Unauthorized: only the author can finalize the post';
  end if;

  if v_post.status <> 'uploading'::public.post_status then
    raise exception 'Post is not in uploading status';
  end if;

  if v_post.upload_expires_at is not null and v_post.upload_expires_at <= now() then
    update public.posts
    set status = 'failed'::public.post_status,
        upload_expires_at = null,
        updated_at = now()
    where id = p_post_id;
    raise exception 'Upload window expired';
  end if;

  if not (select private.current_user_can_manage_room(v_post.room_id)) then
    raise exception 'Unauthorized room access';
  end if;

  if not exists (
    select 1
    from public.post_children pc
    join public.children c on c.id = pc.child_id
    where pc.post_id = p_post_id
      and c.status = 'active'::public.child_status
  ) then
    raise exception 'No active recipient children found';
  end if;

  select count(*)
  into v_expected_photo_count
  from public.post_photos
  where post_photos.post_id = p_post_id;

  if v_expected_photo_count > 0 then
    if exists (
      select 1
      from public.post_children pc
      join public.children c on c.id = pc.child_id
      where pc.post_id = p_post_id
        and c.status = 'active'::public.child_status
        and c.photo_consent = false
    ) then
      update public.posts
      set status = 'failed'::public.post_status,
          upload_expires_at = null,
          updated_at = now()
      where id = p_post_id;
      raise exception 'Photo post rejected: one or more recipients lack photo consent';
    end if;

    select count(*)
    into v_uploaded_photo_count
    from storage.objects
    where bucket_id = 'post-photos'
      and name in (
        select storage_path
        from public.post_photos
        where post_photos.post_id = p_post_id
      );

    if v_uploaded_photo_count <> v_expected_photo_count then
      raise exception 'Missing uploaded storage objects (found % of %)', v_uploaded_photo_count, v_expected_photo_count;
    end if;

    update public.post_photos
    set uploaded_at = now()
    where post_photos.post_id = p_post_id;
  end if;

  update public.posts
  set status = 'published'::public.post_status,
      published_at = now(),
      upload_expires_at = null,
      updated_at = now()
  where id = p_post_id;

  return jsonb_build_object(
    'post_id', p_post_id,
    'status', 'published',
    'published_at', now()
  );
end;
$$;

revoke all on function public.finalize_post(uuid) from public, anon;
grant execute on function public.finalize_post(uuid) to authenticated;

-- 5.3 abort_post
create or replace function public.abort_post(
  p_post_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_post record;
begin
  if v_caller_id is null or not (select private.current_user_is_active()) then
    raise exception 'Unauthorized';
  end if;

  select *
  into v_post
  from public.posts
  where posts.id = p_post_id
  for update;

  if v_post.id is null then
    return jsonb_build_object('success', true, 'message', 'Post not found');
  end if;

  if v_post.author_id <> v_caller_id and not (select private.current_user_can_manage_room(v_post.room_id)) then
    raise exception 'Unauthorized';
  end if;

  delete from storage.objects
  where bucket_id = 'post-photos'
    and name in (
      select storage_path
      from public.post_photos
      where post_photos.post_id = p_post_id
    );

  update public.posts
  set status = 'failed'::public.post_status,
      upload_expires_at = null,
      updated_at = now()
  where id = p_post_id;

  return jsonb_build_object(
    'post_id', p_post_id,
    'status', 'failed'
  );
end;
$$;

revoke all on function public.abort_post(uuid) from public, anon;
grant execute on function public.abort_post(uuid) to authenticated;

-- 5.4 get_feed_posts
create or replace function public.get_feed_posts(
  p_room_id uuid default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_caller_daycare_id uuid;
  v_caller_role public.user_role;
  v_posts jsonb;
begin
  if v_caller_id is null or not (select private.current_user_is_active()) then
    raise exception 'Unauthorized';
  end if;

  v_caller_daycare_id := (select private.current_user_daycare_id());
  v_caller_role := (select private.current_user_role());

  if v_caller_daycare_id is null or v_caller_role is null then
    raise exception 'Unauthorized';
  end if;

  select jsonb_agg(post_data)
  into v_posts
  from (
    select
      p.id,
      p.author_id,
      u.full_name as author_name,
      p.room_id,
      r.name as room_name,
      p.type,
      p.body,
      p.status,
      p.published_at,
      p.created_at,
      (
        select coalesce(jsonb_agg(
          jsonb_build_object('id', c.id, 'full_name', c.full_name)
          order by c.full_name
        ), '[]'::jsonb)
        from public.post_children pc
        join public.children c on c.id = pc.child_id
        where pc.post_id = p.id
          and (
            v_caller_role in ('staff'::public.user_role, 'admin'::public.user_role)
            or exists (
              select 1
              from public.parent_children parent_c
              where parent_c.child_id = c.id
                and parent_c.parent_id = v_caller_id
            )
          )
      ) as recipient_children,
      (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'id', pp.id,
            'storage_path', pp.storage_path,
            'position', pp.position,
            'mime_type', pp.mime_type,
            'size_bytes', pp.size_bytes
          )
          order by pp.position
        ), '[]'::jsonb)
        from public.post_photos pp
        where pp.post_id = p.id
          and not exists (
            select 1
            from public.post_children pc2
            join public.children c2 on c2.id = pc2.child_id
            where pc2.post_id = p.id
              and c2.photo_consent = false
          )
      ) as photos
    from public.posts p
    join public.rooms r on r.id = p.room_id
    join public.users u on u.id = p.author_id
    where p.status = 'published'::public.post_status
      and r.daycare_id = v_caller_daycare_id
      and (p_room_id is null or p.room_id = p_room_id)
      and (
        v_caller_role = 'admin'::public.user_role
        or (
          v_caller_role = 'staff'::public.user_role
          and exists (
            select 1
            from public.room_staff rs
            where rs.room_id = p.room_id
              and rs.user_id = v_caller_id
          )
        )
        or (
          v_caller_role = 'parent'::public.user_role
          and exists (
            select 1
            from public.post_children pc3
            join public.parent_children parent_c3 on parent_c3.child_id = pc3.child_id
            where pc3.post_id = p.id
              and parent_c3.parent_id = v_caller_id
          )
        )
      )
    order by p.published_at desc, p.created_at desc
    limit greatest(1, least(100, p_limit))
    offset greatest(0, p_offset)
  ) post_data;

  return coalesce(v_posts, '[]'::jsonb);
end;
$$;

revoke all on function public.get_feed_posts(uuid, integer, integer) from public, anon;
grant execute on function public.get_feed_posts(uuid, integer, integer) to authenticated;

-- 6. Table Grants & RLS Policies

alter table public.room_staff enable row level security;
alter table public.posts enable row level security;
alter table public.post_children enable row level security;
alter table public.post_photos enable row level security;

revoke all on table public.room_staff from anon, authenticated;
revoke all on table public.posts from anon, authenticated;
revoke all on table public.post_children from anon, authenticated;
revoke all on table public.post_photos from anon, authenticated;

grant select on table public.room_staff to authenticated;
grant select on table public.posts to authenticated;
grant select on table public.post_children to authenticated;
grant select on table public.post_photos to authenticated;

-- 6.1 RLS on room_staff
create policy "room_staff_read_own_daycare"
on public.room_staff
for select
to authenticated
using (
  (select private.current_user_is_active())
  and (select private.current_user_role()) in ('staff'::public.user_role, 'admin'::public.user_role)
  and exists (
    select 1
    from public.rooms
    where rooms.id = room_staff.room_id
      and rooms.daycare_id = (select private.current_user_daycare_id())
  )
);

-- 6.2 RLS on posts
create policy "posts_select_policy"
on public.posts
for select
to authenticated
using (
  (select private.current_user_is_active())
  and exists (
    select 1
    from public.rooms
    where rooms.id = posts.room_id
      and rooms.daycare_id = (select private.current_user_daycare_id())
  )
  and (
    posts.author_id = (select auth.uid())
    or (
      posts.status = 'published'::public.post_status
      and (
        (select private.current_user_role()) = 'admin'::public.user_role
        or (
          (select private.current_user_role()) = 'staff'::public.user_role
          and exists (
            select 1
            from public.room_staff
            where room_staff.room_id = posts.room_id
              and room_staff.user_id = (select auth.uid())
          )
        )
        or (
          (select private.current_user_role()) = 'parent'::public.user_role
          and exists (
            select 1
            from public.post_children pc
            join public.parent_children parent_c on parent_c.child_id = pc.child_id
            where pc.post_id = posts.id
              and parent_c.parent_id = (select auth.uid())
          )
        )
      )
    )
  )
);

-- 6.3 RLS on post_children
create policy "post_children_select_policy"
on public.post_children
for select
to authenticated
using (
  (select private.current_user_is_active())
  and (
    (
      (select private.current_user_role()) in ('staff'::public.user_role, 'admin'::public.user_role)
      and exists (
        select 1
        from public.posts
        join public.rooms on rooms.id = posts.room_id
        where posts.id = post_children.post_id
          and rooms.daycare_id = (select private.current_user_daycare_id())
      )
    )
    or (
      (select private.current_user_role()) = 'parent'::public.user_role
      and exists (
        select 1
        from public.parent_children
        where parent_children.child_id = post_children.child_id
          and parent_children.parent_id = (select auth.uid())
      )
    )
  )
);

-- 6.4 RLS on post_photos
create policy "post_photos_select_policy"
on public.post_photos
for select
to authenticated
using (
  (select private.current_user_is_active())
  and exists (
    select 1
    from public.posts
    where posts.id = post_photos.post_id
      and (
        posts.author_id = (select auth.uid())
        or (
          posts.status = 'published'::public.post_status
          and exists (
            select 1
            from public.rooms
            where rooms.id = posts.room_id
              and rooms.daycare_id = (select private.current_user_daycare_id())
          )
          and (
            (select private.current_user_role()) = 'admin'::public.user_role
            or (
              (select private.current_user_role()) = 'staff'::public.user_role
              and exists (
                select 1
                from public.room_staff
                where room_staff.room_id = posts.room_id
                  and room_staff.user_id = (select auth.uid())
              )
            )
            or (
              (select private.current_user_role()) = 'parent'::public.user_role
              and exists (
                select 1
                from public.post_children pc
                join public.parent_children parent_c on parent_c.child_id = pc.child_id
                where pc.post_id = posts.id
                  and parent_c.parent_id = (select auth.uid())
              )
            )
          )
        )
      )
  )
);

-- 7. Storage Bucket & Policies

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-photos',
  'post-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 7.1 Storage INSERT policy
drop policy if exists "post_photos_storage_insert" on storage.objects;
create policy "post_photos_storage_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'post-photos'
  and (select private.current_user_is_active())
  and exists (
    select 1
    from public.post_photos pp
    join public.posts p on p.id = pp.post_id
    where pp.storage_path = name
      and p.author_id = (select auth.uid())
      and p.status = 'uploading'::public.post_status
      and (p.upload_expires_at is null or p.upload_expires_at > now())
  )
);

-- 7.2 Storage SELECT policy
drop policy if exists "post_photos_storage_select" on storage.objects;
create policy "post_photos_storage_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'post-photos'
  and (select private.current_user_is_active())
  and exists (
    select 1
    from public.post_photos pp
    join public.posts p on p.id = pp.post_id
    join public.rooms r on r.id = p.room_id
    where pp.storage_path = name
      and p.status = 'published'::public.post_status
      and r.daycare_id = (select private.current_user_daycare_id())
      and not exists (
        select 1
        from public.post_children pc
        join public.children c on c.id = pc.child_id
        where pc.post_id = p.id
          and c.photo_consent = false
      )
      and (
        (select private.current_user_role()) = 'admin'::public.user_role
        or (
          (select private.current_user_role()) = 'staff'::public.user_role
          and exists (
            select 1
            from public.room_staff rs
            where rs.room_id = p.room_id
              and rs.user_id = (select auth.uid())
          )
        )
        or (
          (select private.current_user_role()) = 'parent'::public.user_role
          and exists (
            select 1
            from public.post_children pc
            join public.parent_children parent_c on parent_c.child_id = pc.child_id
            where pc.post_id = p.id
              and parent_c.parent_id = (select auth.uid())
          )
        )
      )
  )
);

-- 7.3 Storage DELETE policy
drop policy if exists "post_photos_storage_delete" on storage.objects;
create policy "post_photos_storage_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'post-photos'
  and (select private.current_user_is_active())
  and exists (
    select 1
    from public.post_photos pp
    join public.posts p on p.id = pp.post_id
    where pp.storage_path = name
      and p.author_id = (select auth.uid())
      and p.status in ('uploading'::public.post_status, 'failed'::public.post_status)
  )
);

-- 8. Backfill active staff in Guardería Sala Soles to Soles room
do $$
declare
  v_daycare_id uuid;
  v_room_id uuid;
begin
  select id into v_daycare_id from public.daycares where name = 'Guardería Sala Soles';
  select id into v_room_id from public.rooms where daycare_id = v_daycare_id and name = 'Soles';

  if v_daycare_id is not null and v_room_id is not null then
    insert into public.room_staff (room_id, user_id)
    select v_room_id, u.id
    from public.users u
    where u.daycare_id = v_daycare_id
      and u.role = 'staff'::public.user_role
      and u.status = 'active'::public.user_status
    on conflict (room_id, user_id) do nothing;
  end if;
end;
$$;
