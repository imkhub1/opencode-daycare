-- Restrict new and changed reactions to the supported like value while
-- preserving access to legacy reaction rows for reads and deletes.

alter policy "post_reactions_insert_policy"
on public.post_reactions
with check (
  post_reactions.user_id = (select auth.uid())
  and post_reactions.reaction = 'like'::public.post_reaction_code
  and (select private.current_user_is_active())
  and exists (
    select 1
    from public.posts p
    where p.id = post_reactions.post_id
      and p.status = 'published'::public.post_status
      and (select private.current_user_can_interact_with_post(p.id))
  )
);

alter policy "post_reactions_update_policy"
on public.post_reactions
with check (
  post_reactions.user_id = (select auth.uid())
  and post_reactions.reaction = 'like'::public.post_reaction_code
  and (select private.current_user_is_active())
  and exists (
    select 1
    from public.posts p
    where p.id = post_reactions.post_id
      and p.status = 'published'::public.post_status
      and (select private.current_user_can_interact_with_post(p.id))
  )
);

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
      jsonb_build_object('like', count(*)) as reaction_counts,
      max(pr.reaction::text) filter (where pr.user_id = v_caller_id) as current_user_reaction
    from visible_posts vp
    join public.post_reactions pr on pr.post_id = vp.id
    where pr.reaction = 'like'::public.post_reaction_code
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
      'reaction_counts', coalesce(rxs.reaction_counts, jsonb_build_object('like', 0)),
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
