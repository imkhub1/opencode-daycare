-- Approved SPEC 13 amendment: preserve denied photo consent after child deletion.

create table private.post_photo_consent_blocks (
  post_id uuid primary key references public.posts(id) on delete cascade,
  deleted_child_id uuid not null,
  created_at timestamptz not null default now()
);

alter table private.post_photo_consent_blocks enable row level security;

revoke all on table private.post_photo_consent_blocks
from public, anon, authenticated, service_role;

create or replace function public.delete_child(p_child_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_caller_id uuid := (select auth.uid());
  v_caller_daycare_id uuid;
  v_child_daycare_id uuid;
begin
  select users.daycare_id
  into v_caller_daycare_id
  from public.users
  where users.id = v_caller_id
    and users.status = 'active'::public.user_status
    and users.role in (
      'staff'::public.user_role,
      'admin'::public.user_role
    );

  if v_caller_id is null or v_caller_daycare_id is null then
    raise exception 'Unable to delete child';
  end if;

  -- Match accept_parent_invitation: invitations are locked before the child.
  perform 1
  from public.invitations
  where invitations.child_id = p_child_id
  order by invitations.id
  for update;

  select child_rooms.daycare_id
  into v_child_daycare_id
  from public.children as target_children
  join public.rooms as child_rooms
    on child_rooms.id = target_children.room_id
  where target_children.id = p_child_id
  for update of target_children;

  if not found
     or v_child_daycare_id is null
     or v_child_daycare_id <> v_caller_daycare_id then
    raise exception 'Unable to delete child';
  end if;

  insert into private.post_photo_consent_blocks (
    post_id,
    deleted_child_id
  )
  select distinct
    post_children.post_id,
    p_child_id
  from public.post_children
  join public.children
    on children.id = post_children.child_id
  where post_children.child_id = p_child_id
    and children.photo_consent = false
  on conflict (post_id) do nothing;

  delete from public.invitations
  where invitations.child_id = p_child_id;

  delete from public.parent_children
  where parent_children.child_id = p_child_id;

  delete from public.post_children
  where post_children.child_id = p_child_id;

  delete from public.children
  where children.id = p_child_id;

  if not found then
    raise exception 'Unable to delete child';
  end if;

  return true;
exception
  when others then
    raise exception using
      errcode = 'P0001',
      message = 'Unable to delete child';
end;
$function$;

revoke delete on table
  public.children,
  public.invitations,
  public.parent_children,
  public.post_children
from public, anon, authenticated;

revoke all on function public.delete_child(uuid)
from public, anon, authenticated;

grant execute on function public.delete_child(uuid)
to authenticated;

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
  if not (select private.current_user_can_select_post(p_post_id)) then
    return false;
  end if;

  return not exists (
    select 1
    from public.post_children pc
    join public.children c on c.id = pc.child_id
    where pc.post_id = p_post_id
      and c.photo_consent = false
  )
  and not exists (
    select 1
    from private.post_photo_consent_blocks blocks
    where blocks.post_id = p_post_id
  );
end;
$$;

revoke all on function private.current_user_can_select_post_photo(uuid)
from public, anon, authenticated;

grant execute on function private.current_user_can_select_post_photo(uuid)
to authenticated;

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
    limit greatest(1, least(100, coalesce(p_limit, 50)))
    offset greatest(0, coalesce(p_offset, 0))
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
      and not exists (
        select 1
        from private.post_photo_consent_blocks blocks
        where blocks.post_id = vp.id
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

revoke all on function public.get_feed_posts(uuid, integer, integer)
from public, anon;

grant execute on function public.get_feed_posts(uuid, integer, integer)
to authenticated;
