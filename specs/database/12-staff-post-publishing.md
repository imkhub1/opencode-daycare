# SPEC 12 - Persistent Staff Post Publishing

> **Status:** Implemented
> **Depends on:** SPEC 06, SPEC 08, SPEC 09, SPEC 10, SPEC 11
> **Date:** 2026-08-20
> **Objective:** Replace the client-only feed composer with a persistent, tenant-safe staff/admin publishing flow for text posts and optional photos.

## Scope

**In:**

- Persist posts, room recipients, and private photo metadata in Supabase.
- Allow active `staff` and `admin` profiles to publish.
- Add room assignments for staff and backfill the existing staff member to `Soles`.
- Let staff publish to an assigned room and admins select a room in their daycare.
- Snapshot every active child in the selected room as a post recipient.
- Allow a post with no photos even when a child lacks photo consent.
- Reject a photo post when any active recipient lacks photo consent, both before upload and at finalization.
- Keep the seven UI types from SPEC 06 and persist `Animo` as `mood`.
- Accept up to six JPEG, PNG, WebP, or GIF images of at most 10 MB each.
- Upload images directly to a private Supabase Storage bucket through one-time signed upload URLs.
- Show only published posts in the feed after reload for authorized staff/admin users and linked active parents.
- Use the same accessible composer from the desktop CTA, mobile CTA, feed composer card, and `/crear-publicacion`.
- Keep post DTOs serializable and generate short-lived signed read URLs for visible photos.

**Out of scope (for future specs):**

- Room-assignment management UI.
- Editing, deleting, reactions, comments, notifications, scheduling, drafts as a user-facing feature, and post detail pages.
- Image transformations, moderation, virus scanning, and realtime feed updates.
- Global posts not associated with a room and child recipient snapshot.

## Data Model

Persist all enum values in English and translate them in the UI.

```sql
create type public.post_type as enum (
  'meal', 'nap', 'activity', 'achievement', 'mood', 'photo', 'announcement'
);

create type public.post_status as enum ('uploading', 'published', 'failed');
```

### `public.room_staff`

```sql
create table public.room_staff (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
```

Only active staff/admin users can resolve assignments. Staff assignments must belong to the caller's daycare. Admins can use all rooms in their own daycare. The migration backfills active staff in `Guarderia Sala Soles` to `Soles` once.

### `public.posts`

```sql
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
```

### `public.post_children`

```sql
create table public.post_children (
  post_id uuid not null references public.posts(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete restrict,
  primary key (post_id, child_id)
);
```

The prepare function derives all active children from `posts.room_id`; callers never provide recipient IDs.

### `public.post_photos`

```sql
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
```

The private `post-photos` bucket stores objects at `posts/<post-id>/<photo-id>`. The database stores the path, not a signed URL.

## Security Rules

- RLS is enabled on all four public tables and Storage policies remain enabled on `storage.objects`.
- Anonymous, inactive users, parents, and cross-daycare users cannot mutate posts or assignments.
- Direct authenticated table writes are revoked; prepare/finalize/abort use restricted functions after server-side authentication.
- Feed reads require an active user and are limited to the user's daycare. Staff sees assigned-room posts, admins see their daycare, and parents see posts with at least one linked child.
- Parent responses must not expose unrelated recipient children or their names.
- Storage upload is allowed only for the author of an `uploading` post and an existing photo slot under that post's path.
- Storage reads are allowed only for photos belonging to a visible, published post and only while every recipient still has photo consent.
- Authorization uses `public.users`, not editable Auth user metadata.
- Helper functions use a fixed empty `search_path`, explicit `auth.uid()` checks, revoked default execution, and only the required `authenticated` grants.

## Server Workflow

1. `prepare_post` authenticates the caller, validates the room/type/body, resolves the daycare and active children, rejects missing consent when photo slots exist, and creates the uploading post, recipient snapshot, and photo slots in one short transaction.
2. A server action creates one-time signed upload URLs for those slots. The browser uploads directly with the publishable Supabase client.
3. `finalize_post` verifies author, expiry, all Storage objects, metadata, room access, active recipients, and consent, then marks the post published.
4. Text-only posts use the same flow without Storage slots and complete without an upload phase.
5. Abort/error handling removes uploaded objects best-effort and marks/removes the draft. Failed drafts never enter feed queries.
6. Feed queries return only published rows and the server turns visible photo paths into short-lived signed read URLs.

## Acceptance Criteria

- Active staff can publish a room post with no images and it remains after reload.
- Active staff can publish with one to six valid images; images render after reload through signed URLs.
- An admin can choose only rooms in its daycare; staff cannot publish outside assigned rooms.
- Parents never see the create controls and cannot publish through direct action/route calls.
- The composer opens from every agreed entry point and `/crear-publicacion` uses the same validation and upload behavior.
- Empty body, invalid type, invalid room, unsupported MIME, files over 10 MB, and more than six images are rejected server-side and client-side.
- A room with any `photo_consent = false` child accepts text-only posts and rejects photo posts before upload; finalization repeats the check.
- Staff/admin and parent feeds are isolated by daycare, room assignment, and parent-child links.
- A failed upload never produces a published post or a readable foreign Storage object.
- `npx tsc --noEmit`, application lint, `npm run build`, and Playwright desktop/mobile checks pass.

## Verification

- Verify migration history, tables, indexes, functions, grants, RLS, bucket configuration, policies, and `Soles` backfill through the approved Supabase workflow.
- Exercise staff, admin, parent, inactive, and cross-daycare authorization cases with database-level checks.
- Exercise no-photo, one-photo, six-photo, invalid-file, consent-failure, reload, abort, and route-protection cases in Playwright.

### Completed Verification

- Applied and verified the three versioned migrations for posts, Storage RLS recursion, and photo-consent metadata isolation.
- Ran `npx tsc --noEmit`, application ESLint, and `npm run build` successfully.
- Verified authenticated staff feed rendering, empty-state rendering, modal validation, mobile modal behavior at 375 px, `/crear-publicacion`, no-horizontal-overflow, no-photo persistence after reload, and one-photo persistence through the private bucket and signed read URL.
- Ran a read-only database security audit. No tenant, role, Storage, or consent isolation findings remained. Supabase advisors retained only documented pre-existing/security-definer notices and low-volume unused-index notices.
