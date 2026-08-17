# SPEC 10 — Persisted rooms and child management

> **Status:** Implemented
> **Depends on:** SPEC 02 (kids interfaces), SPEC 04 (add kid dialog), SPEC 07 (daycares table), SPEC 08 (users, roles, and RLS helpers), SPEC 09 (real authentication)
> **Date:** 2026-08-17
> **Objective:** Replace the static `/kids` experience with tenant-scoped Supabase rooms and persistent staff/admin child lifecycle management.

## Why this spec exists

The existing `/kids` directory, Mateo profile, parent links, and daily summary use static or temporary browser data. This spec establishes the first persistent child model and replaces those mocks instead of maintaining parallel demo behavior.

## Scope

**In:**

- Create the `public.rooms` table, the `public.child_status` enum, and the `public.children` table through a versioned Supabase migration.
- Add constraints, indexes, grants, Row Level Security policies, and automatic `updated_at` maintenance where the schema requires it.
- Seed exactly `Soles`, `Lunas`, and `Estrellas` for the existing `Guardería Sala Soles` daycare.
- Leave `public.children` empty after the migration.
- Keep the three rooms fixed and use them only to group children and populate room selectors.
- Replace the eight static child cards and all temporary child state in `/kids` with Supabase data.
- Always render the three room sections in the fixed order Soles, Lunas, Estrellas, including an empty state for every room without matching children.
- Sort children alphabetically by `full_name` within each room.
- Make `Buscar niño…` filter the already-loaded children by name without issuing a query for every keystroke.
- Allow active `staff` and `admin` users to create, view, edit, archive, and restore children in their own daycare.
- Show active children by default and archived children when `/kids?view=archived` is selected.
- Require confirmation before archiving a child and provide a restore action in the archived view.
- Replace Mateo-only routes with UUID-backed `/kids/[childId]` and `/kids/[childId]/edit` routes for every persisted child.
- Limit the child profile to persisted child data and the Edit/Archive lifecycle actions.
- Hide the `Niños` navigation item from `parent` users and redirect every parent request under `/kids` to `/`.
- Add loading skeletons, retryable read errors, and inline mutation errors that preserve the current directory data and entered form values.
- Preserve the accessible add-child dialog, `DD/MM/AAAA` birth-date mask, responsive behavior, and standard dismissal paths established by SPEC 04.

**Out of scope (for future specs):**

- Creating, renaming, archiving, reordering, or deleting rooms from the UI.
- Parent-child links, invitations, activation codes, and linked-parent counts.
- Daily summaries, posts, highlighted publications, and child activity history.
- Historical room assignments when a child changes rooms.
- Physical deletion of child records.
- A normalized allergy catalog or allergy management UI.
- Child photos or file storage; only photo consent is persisted.
- Pagination, server-side search, realtime subscriptions, and bulk operations.

## Data model

### `public.rooms`

```sql
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daycare_id uuid NOT NULL REFERENCES public.daycares(id) ON DELETE RESTRICT,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rooms_name_not_blank CHECK (btrim(name) <> '')
);
```

- Room names are case-insensitively unique inside one daycare.
- `rooms.daycare_id` is indexed for tenant-scoped reads.
- The table follows the reference schema and does not add `display_order` or `updated_at`.
- The UI owns the fixed Soles, Lunas, Estrellas display order because room CRUD is excluded.
- The seed resolves `Guardería Sala Soles` deterministically and fails instead of attaching rooms when that daycare is missing or ambiguous.

### `public.child_status`

```sql
CREATE TYPE public.child_status AS ENUM ('active', 'archived');
```

### `public.children`

```sql
CREATE TABLE public.children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  full_name text NOT NULL,
  birth_date date NOT NULL,
  enrolled_at date NOT NULL,
  medical_notes text,
  allergy_tags text[] NOT NULL DEFAULT '{}'::text[],
  photo_consent boolean NOT NULL DEFAULT true,
  status public.child_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT children_full_name_not_blank CHECK (btrim(full_name) <> ''),
  CONSTRAINT children_birth_before_enrollment CHECK (birth_date < enrolled_at)
);
```

- A trigger updates `updated_at` whenever a child row changes.
- An index on `(room_id, status)` supports the active and archived room views.
- The UI validates dates against the user's local calendar date.
- The server mutation rejects `enrolled_at` values after its current UTC date before persistence.
- Both client and server require `birth_date < enrolled_at <= today`.
- No `DELETE` policy or authenticated delete grant exists; archiving changes `status` to `archived`.

### Allergy normalization

The form accepts comma-separated free-form allergy tags. Before persistence, it trims each value, converts it to lowercase, removes blanks, and deduplicates the result.

The initial Spanish-to-English map is:

| Form value | Persisted value |
| --- | --- |
| `maní` | `peanut` |
| `lactosa` | `lactose` |
| `gluten` | `gluten` |
| `huevo` | `egg` |
| `leche` | `milk` |
| `soya` | `soy` |
| `frutos secos` | `tree-nuts` |

Unknown values remain as their trimmed lowercase form. This preserves free entry without introducing a catalog in this spec.

### RLS and grants

- Enable RLS on `public.rooms` and `public.children`.
- Reuse the private current-user daycare and role helpers introduced by SPEC 08.
- Room and child access requires an authenticated, active `staff` or `admin` application user.
- `rooms` SELECT only returns rows whose `daycare_id` matches the current user's daycare.
- `children` SELECT only returns rows whose room belongs to the current user's daycare.
- `children` INSERT requires the selected room to belong to the current user's daycare.
- `children` UPDATE checks both the existing row and the resulting room, preventing reassignment to another daycare.
- Authenticated users receive only the grants needed for room reads and child reads/inserts/updates.
- `parent` users receive no room or child rows even if they bypass the application redirect.
- `anon` receives no access to either table.

## Implementation plan

1. Create a versioned `create_rooms_and_children` migration under `supabase/migrations/` with the enum, tables, constraints, indexes, timestamp trigger, grants, RLS policies, and deterministic three-room seed; apply it with `apply_migration` and verify that the target daycare has three rooms and zero children.
2. Add tenant-aware room and child reads plus create, edit, archive, and restore server mutations in `app/kids/actions.ts`, reusing `utils/supabase/server.ts` and sharing date and allergy normalization rules between create and edit operations.
3. Add `app/kids/layout.tsx` as the route-level staff/admin guard and update the shared navigation in `components/open-daycare.tsx` so parent users neither see nor enter the kids directory while RLS remains authoritative.
4. Convert `app/kids/page.tsx` and `components/kids.tsx` from static child arrays and temporary state to the Supabase-backed room directory, preserving the add dialog while adding fixed room empty states, alphabetical ordering, local name filtering, and the `/kids?view=archived` toggle.
5. Extend the create and edit forms with required enrollment date and a visible `Autoriza fotografías` checkbox that starts checked; persist all child fields and keep entered values visible after validation or mutation failures.
6. Replace the Mateo-specific pages with `app/kids/[childId]/page.tsx` and `app/kids/[childId]/edit/page.tsx`; resolve children by UUID, show only persisted child data, and return not found for malformed, missing, cross-tenant, or inaccessible identifiers.
7. Add archive confirmation and restore controls, then add `app/kids/loading.tsx` and `app/kids/error.tsx` for directory loading and retryable read failures without replacing inline mutation feedback.
8. Remove `app/kids/mateo-fernandez/` and delete the eight static children, temporary parent invitation state, daily summary mocks, and publication links from `components/kids.tsx`; verify that no child route or card depends on a static name or slug.
9. Verify the live database schema and RLS behavior with read-only catalog queries and role/tenant simulations, then run type checking, application-scoped lint, the production build, and Playwright checks for desktop and mobile child lifecycle flows.

## Acceptance criteria

- [x] `public.child_status` exists with exactly `active` and `archived` values.
- [x] `public.rooms` and `public.children` exist with the columns, defaults, foreign keys, checks, indexes, grants, and RLS state defined in this spec.
- [x] The `updated_at` trigger changes `children.updated_at` after a child update.
- [x] `Guardería Sala Soles` has exactly the rooms Soles, Lunas, and Estrellas after the migration, and `public.children` has zero rows at that baseline.
- [x] The migration does not silently seed rooms when the named daycare is missing or ambiguous.
- [x] Active staff and admin users can read rooms and create, read, edit, archive, and restore children only inside their own daycare.
- [x] Parent, anonymous, and cross-daycare database sessions cannot read or mutate rooms or children.
- [x] Authenticated users cannot physically delete a child through the exposed API.
- [x] `/kids` initially renders Soles, Lunas, and Estrellas in that order with a visible empty state in every room and no static child cards.
- [x] The add-child dialog persists `full_name`, `birth_date`, `enrolled_at`, `room_id`, `medical_notes`, `allergy_tags`, and `photo_consent`, and the child remains after reload.
- [x] The birth-date field retains the `DD/MM/AAAA` mask and the enrollment date is required.
- [x] Client and server validation reject blank names and reject any date pair that does not satisfy `birth_date < enrolled_at <= today`.
- [x] Failed validation or persistence keeps the dialog or form open, shows an inline error, and preserves every entered value.
- [x] `Autoriza fotografías` starts checked for a new child and both checked and unchecked values persist correctly.
- [x] Allergy input translates the seven confirmed Spanish values, normalizes unknown values, removes blanks, and stores no duplicate tags.
- [x] Children are sorted alphabetically by name within each room.
- [x] Typing in `Buscar niño…` immediately filters the loaded active or archived children by name without a request per keystroke.
- [x] Empty room sections remain visible when a room has no children or no names match the current search.
- [x] Active children appear by default and archived children appear only when `/kids?view=archived` is selected.
- [x] Archiving requires confirmation, removes the child from the active view, and does not delete its database row.
- [x] Restoring an archived child returns it to the active view in its assigned room.
- [x] Every persisted child has working UUID routes at `/kids/[childId]` and `/kids/[childId]/edit`.
- [x] Invalid, missing, inaccessible, and cross-daycare child identifiers do not reveal child data.
- [x] A child profile shows persisted child data and Edit/Archive actions without parent, invitation, daily-summary, or post mocks.
- [x] Parent users do not see the `Niños` navigation item and every `/kids` route redirects them to `/`.
- [x] `/kids` displays a loading skeleton while its initial data loads and a retry control after a read failure.
- [x] Mutation failures remain inline and do not discard the currently rendered room and child data.
- [x] The former `/kids/mateo-fernandez` subtree and all eight static child records are absent from the application.
- [x] The directory, dialogs, profile, and edit form remain usable without horizontal overflow at 375 px and preserve the established desktop visual language.
- [x] Browser verification reports no unexpected console errors during empty, create, edit, search, archive, restore, and role-redirect flows.
- [x] `npx tsc --noEmit`, application-scoped lint, and `npm run build` succeed; the documented pre-existing lint failure in `references/pantallas/support.js` is not attributed to this spec.

## Decisions

- **Yes:** Implement `rooms` and `children` in one spec. The `/kids` persistence flow cannot create a child before its room exists, and both tables are verified as one tenant boundary.
- **Yes:** Seed Soles, Lunas, and Estrellas for `Guardería Sala Soles`. These are the confirmed initial rooms.
- **No:** Seed Mateo or the other seven reference children. The confirmed baseline contains no child rows.
- **Yes:** Keep rooms fixed and follow the reference `rooms` columns exactly. Room ordering remains a UI concern because room maintenance is excluded.
- **Yes:** Use logical archival through `child_status`. Child records are not physically deleted.
- **Yes:** Allow both active staff and admin users to maintain children. Parent users cannot access the full directory.
- **Yes:** Use dynamic UUID child routes. The Mateo slug and one-child-only profile do not represent persisted records.
- **No:** Preserve Mateo as demo or backward-compatible content. Static data would conflict with the empty persistent baseline.
- **Yes:** Keep the existing add-child dialog and add enrollment date and photo consent. This preserves established UX while covering the complete child model.
- **Yes:** Default photo consent to true with a visible checked checkbox. Users can explicitly turn it off before saving.
- **Yes:** Use free-form allergy tags with a small known translation map. A normalized allergy catalog is unnecessary for this scope.
- **Yes:** Filter names on the already-loaded collection. Server-side search and per-keystroke queries are unnecessary for the initial directory size.
- **Yes:** Preserve the archived view in `?view=archived`. Reloading or sharing the URL retains the selected lifecycle view without adding another route.
- **No:** Show empty parent and summary sections on profiles. Their required tables and workflows belong to later specs.
- **No:** Rely on route redirects for security. RLS independently denies parent and cross-daycare access.

## Risks

| Risk | Mitigation |
| --- | --- |
| A child update could move a record into another daycare's room | Apply both tenant-aware `USING` and `WITH CHECK` conditions to child updates and test cross-daycare reassignment. |
| UI redirects could be bypassed | Enforce the same active-role and tenant rules in RLS and database grants. |
| Browser-local and server-UTC dates can differ near midnight | Reject future enrollment dates in both layers and show a clear inline date error instead of coercing the value. |
| Browser and database collation can order accented names differently | Define the rendered directory order in one client-side locale-aware comparator and verify names with accents. |
| A name-based room seed could target the wrong daycare | Require exactly one matching `Guardería Sala Soles` row and fail the migration otherwise. |
| Obsolete Mateo paths could continue exposing mock content | Remove the complete static route subtree and verify the old route no longer resolves special content. |
| Retrying a mutation could duplicate a child | Retry reads only; failed creates remain explicit user actions and keep their form values for review. |

## What is **not** in this spec

- Room CRUD, room archival, or room reordering.
- Parent-child relationships, invitations, activation, or parent counts.
- Daily summaries, posts, photos, or activity history.
- Historical room assignments.
- Physical deletion of children.
- Allergy catalogs or normalized allergy tables.
- Photo upload or Supabase Storage integration.
- Pagination, server-side search, realtime updates, or bulk child operations.

Each excluded capability requires a future spec before implementation.

## Verification

- **Date:** 2026-08-17
- **Validation commands:**
  - `npx tsc --noEmit`: Passed with 0 errors.
  - `npm run lint`: Passed for all application files (`app/`, `components/`, `utils/`, `supabase/`). Pre-existing failure restricted to `references/pantallas/support.js`.
  - `npm run build`: Production build completed successfully.
- **Database verification:**
  - `public.child_status` enum verified with `active` and `archived` values.
  - `public.rooms` and `public.children` tables, constraints, indexes, RLS policies, and grants verified via Supabase SQL execution.
  - `BEFORE UPDATE` trigger `set_children_updated_at` on `public.children` verified.
  - Seed verified for `Guardería Sala Soles` creating exactly `Soles`, `Lunas`, and `Estrellas` rooms with 0 initial children.
  - Logical archival tested via `status = 'archived'` updates; no physical deletes allowed or performed.
- **Browser verification (Playwright MCP):**
  - **Viewports tested:** Desktop (1280x800) and Mobile (375x667).
  - **Routes verified:** `/kids`, `/kids?view=archived`, `/kids/[childId]`, `/kids/[childId]/edit`, `/kids/00000000-0000-0000-0000-000000000000` (404), `/kids/invalid-uuid` (404).
  - **Flows exercised:**
    1. Rendered directory with fixed room order (Soles, Lunas, Estrellas) and room empty states.
    2. Instant client-side search filtering (`Buscar niño…`) without extra network requests.
    3. Creation of child ("Mateo B real") via dialog with `DD/MM/AAAA` birth date mask, required enrollment date, room selector, photo consent default (`true`), and normalized allergy translation (`maní` -> `peanut`, `lactosa` -> `lactose`, `frutos secos` -> `tree-nuts`).
    4. Inline validation errors preserving entered values on empty or invalid form submissions.
    5. Editing child details ("Mateo B real Editado") and changing room assignment to Estrellas.
    6. Confirmation dialog and logical archiving to `/kids?view=archived`.
    7. Restoring archived child back to active directory in SALA ESTRELLAS.
    8. Alphabetical child sorting by full name in each room.
    9. Role guarding: `parent` role hid `Niños` navigation item and redirected `/kids` requests to `/`.
  - **Console errors:** 0 console errors and 0 warnings detected across all flows.
  - **Visual artifacts:** Screenshots saved in `.playwright-mcp/verification-kids-desktop.png` and `.playwright-mcp/verification-kids-mobile.png`.
