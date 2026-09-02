-- Migration: 20260826232003_add_post_interactions.sql
-- Description: Persist authorized feed comments and emoji reactions with batched feed data.

create type public.post_reaction_code as enum (
  'love',
  'laugh',
  'wow',
  'sad',
  'angry',
  'like'
);

revoke all on type public.post_reaction_code from public, anon, authenticated;
grant usage on type public.post_reaction_code to authenticated;

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint post_comments_body_valid check (char_length(btrim(body)) between 1 and 1000)
);

create index post_comments_post_id_created_at_idx
  on public.post_comments (post_id, created_at);
create index post_comments_author_id_idx
  on public.post_comments (author_id);

create table public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reaction public.post_reaction_code not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index post_reactions_post_id_reaction_idx
  on public.post_reactions (post_id, reaction);
create index post_reactions_user_id_idx
  on public.post_reactions (user_id);

-- Interaction access intentionally excludes the author bypass used by the
-- existing post-selection helper. Publication, current role, daycare, and
-- current relationship to the room or child must all still be valid.
create or replace function private.current_user_can_interact_with_post(
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
          and exists (
            select 1
            from public.post_children pc
            join public.parent_children parent_c on parent_c.child_id = pc.child_id
            where pc.post_id = p.id
              and parent_c.parent_id = u.id
          )
        )
      )
  )
$$;

revoke all on function private.current_user_can_interact_with_post(uuid) from public, anon;
grant execute on function private.current_user_can_interact_with_post(uuid) to authenticated;

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

  with visible_posts as (
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
      p.created_at
    from public.posts p
    join public.rooms r on r.id = p.room_id
    join public.users u on u.id = p.author_id
    where p.status = 'published'::public.post_status
      and r.daycare_id = v_caller_daycare_id
      and (p_room_id is null or p.room_id = p_room_id)
      and (select private.current_user_can_interact_with_post(p.id))
    order by p.published_at desc, p.created_at desc
    limit greatest(1, least(100, p_limit))
    offset greatest(0, p_offset)
  ),
  recipient_summary as (
    select
      pc.post_id,
      jsonb_agg(
        jsonb_build_object('id', c.id, 'full_name', c.full_name)
        order by c.full_name
      ) as recipient_children
    from visible_posts vp
    join public.post_children pc on pc.post_id = vp.id
    join public.children c on c.id = pc.child_id
    where (
      v_caller_role in ('staff'::public.user_role, 'admin'::public.user_role)
      or exists (
        select 1
        from public.parent_children parent_c
        where parent_c.child_id = c.id
          and parent_c.parent_id = v_caller_id
      )
    )
    group by pc.post_id
  ),
  photo_summary as (
    select
      pp.post_id,
      jsonb_agg(
        jsonb_build_object(
          'id', pp.id,
          'storage_path', pp.storage_path,
          'position', pp.position,
          'mime_type', pp.mime_type,
          'size_bytes', pp.size_bytes
        )
        order by pp.position
      ) as photos
    from visible_posts vp
    join public.post_photos pp on pp.post_id = vp.id
    where not exists (
      select 1
      from public.post_children pc
      join public.children c on c.id = pc.child_id
      where pc.post_id = vp.id
        and c.photo_consent = false
    )
    group by pp.post_id
  ),
  reaction_summary as (
    select
      pr.post_id,
      jsonb_build_object(
        'love', count(*) filter (where pr.reaction = 'love'::public.post_reaction_code),
        'laugh', count(*) filter (where pr.reaction = 'laugh'::public.post_reaction_code),
        'wow', count(*) filter (where pr.reaction = 'wow'::public.post_reaction_code),
        'sad', count(*) filter (where pr.reaction = 'sad'::public.post_reaction_code),
        'angry', count(*) filter (where pr.reaction = 'angry'::public.post_reaction_code),
        'like', count(*) filter (where pr.reaction = 'like'::public.post_reaction_code)
      ) as reaction_counts,
      max(pr.reaction::text) filter (where pr.user_id = v_caller_id) as current_user_reaction
    from visible_posts vp
    join public.post_reactions pr on pr.post_id = vp.id
    group by pr.post_id
  ),
  comment_summary as (
    select
      pc.post_id,
      jsonb_agg(
        jsonb_build_object(
          'id', pc.id,
          'author_id', pc.author_id,
          'author_name', comment_author.full_name,
          'body', pc.body,
          'created_at', pc.created_at
        )
        order by pc.created_at, pc.id
      ) as comments
    from visible_posts vp
    join public.post_comments pc on pc.post_id = vp.id
    join public.users comment_author on comment_author.id = pc.author_id
    group by pc.post_id
  )
  select jsonb_agg(
    jsonb_build_object(
      'id', vp.id,
      'author_id', vp.author_id,
      'author_name', vp.author_name,
      'room_id', vp.room_id,
      'room_name', vp.room_name,
      'type', vp.type,
      'body', vp.body,
      'status', vp.status,
      'published_at', vp.published_at,
      'created_at', vp.created_at,
      'recipient_children', coalesce(rs.recipient_children, '[]'::jsonb),
      'photos', coalesce(ps.photos, '[]'::jsonb),
      'reaction_counts', coalesce(
        rxs.reaction_counts,
        jsonb_build_object('love', 0, 'laugh', 0, 'wow', 0, 'sad', 0, 'angry', 0, 'like', 0)
      ),
      'current_user_reaction', rxs.current_user_reaction,
      'comments', coalesce(cs.comments, '[]'::jsonb)
    )
    order by vp.published_at desc, vp.created_at desc
  )
  into v_posts
  from visible_posts vp
  left join recipient_summary rs on rs.post_id = vp.id
  left join photo_summary ps on ps.post_id = vp.id
  left join reaction_summary rxs on rxs.post_id = vp.id
  left join comment_summary cs on cs.post_id = vp.id;

  return coalesce(v_posts, '[]'::jsonb);
end;
$$;

revoke all on function public.get_feed_posts(uuid, integer, integer) from public, anon;
grant execute on function public.get_feed_posts(uuid, integer, integer) to authenticated;

alter table public.post_comments enable row level security;
alter table public.post_reactions enable row level security;

revoke all on table public.post_comments from public, anon, authenticated;
revoke all on table public.post_reactions from public, anon, authenticated;

grant select, insert on table public.post_comments to authenticated;
grant select, insert, update, delete on table public.post_reactions to authenticated;

create policy "post_comments_select_policy"
on public.post_comments
for select
to authenticated
using (
  (select private.current_user_is_active())
  and exists (
    select 1
    from public.posts p
    where p.id = post_comments.post_id
      and p.status = 'published'::public.post_status
      and (select private.current_user_can_interact_with_post(p.id))
  )
);

create policy "post_comments_insert_policy"
on public.post_comments
for insert
to authenticated
with check (
  post_comments.author_id = (select auth.uid())
  and (select private.current_user_is_active())
  and exists (
    select 1
    from public.posts p
    where p.id = post_comments.post_id
      and p.status = 'published'::public.post_status
      and (select private.current_user_can_interact_with_post(p.id))
  )
);

create policy "post_reactions_select_policy"
on public.post_reactions
for select
to authenticated
using (
  post_reactions.user_id = (select auth.uid())
  and (select private.current_user_is_active())
  and exists (
    select 1
    from public.posts p
    where p.id = post_reactions.post_id
      and p.status = 'published'::public.post_status
      and (select private.current_user_can_interact_with_post(p.id))
  )
);

create policy "post_reactions_insert_policy"
on public.post_reactions
for insert
to authenticated
with check (
  post_reactions.user_id = (select auth.uid())
  and (select private.current_user_is_active())
  and exists (
    select 1
    from public.posts p
    where p.id = post_reactions.post_id
      and p.status = 'published'::public.post_status
      and (select private.current_user_can_interact_with_post(p.id))
  )
);

create policy "post_reactions_update_policy"
on public.post_reactions
for update
to authenticated
using (
  post_reactions.user_id = (select auth.uid())
  and (select private.current_user_is_active())
  and exists (
    select 1
    from public.posts p
    where p.id = post_reactions.post_id
      and p.status = 'published'::public.post_status
      and (select private.current_user_can_interact_with_post(p.id))
    )
  )
  with check (
    post_reactions.user_id = (select auth.uid())
    and (select private.current_user_is_active())
    and exists (
      select 1
      from public.posts p
      where p.id = post_reactions.post_id
        and p.status = 'published'::public.post_status
        and (select private.current_user_can_interact_with_post(p.id))
    )
);

create policy "post_reactions_delete_policy"
on public.post_reactions
for delete
to authenticated
using (
  post_reactions.user_id = (select auth.uid())
  and (select private.current_user_is_active())
  and exists (
    select 1
    from public.posts p
    where p.id = post_reactions.post_id
      and p.status = 'published'::public.post_status
      and (select private.current_user_can_interact_with_post(p.id))
  )
);
