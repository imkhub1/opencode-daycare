## Why

The shared root feed and staff-oriented shell blur the product boundary between daycare operations and the family experience. Establishing role-specific areas now gives each audience a stable, secure entry point before the family product expands.

## What Changes

- Make `/staff/*` canonical for active staff and admins, preserving backend permission differences.
- Make `/family/*` canonical for active parents, with a distinct family shell but no real family feed yet.
- Turn `/` into a server-side dispatcher that routes authenticated users by active profile role without a role selector.
- Send pending, missing, or invalid profiles to a dedicated access-pending state; unauthenticated sessions remain governed by login/proxy behavior.
- Keep `/kids` and `/crear-publicacion` as transitional aliases or redirects to role-appropriate canonical destinations.
- Continue treating server authorization and Supabase RLS as authoritative; navigation and redirects are not security controls.

## Scope

### In Scope

- Role-aware dispatch, canonical route groups, separate shells, access-pending handling, and compatibility redirects.
- Relocation or reuse of existing staff feed, child-management, and post-creation experiences under `/staff/*`.

### Non-Goals

- Building the linked-child family feed or the complete family product.
- Changing database schema, RLS, roles, profile lifecycle, or staff/admin backend permissions.
- Adding a manual role switcher or new authentication methods.

## Capabilities

### New Capabilities

- `role-based-application-areas`: Defines canonical staff/family areas, automatic role dispatch, access-pending behavior, shell separation, and transitional route compatibility.

### Modified Capabilities

None. No existing OpenSpec capabilities are present.

## Compatibility Strategy

Existing bookmarks to `/kids` and `/crear-publicacion` remain usable through server-side aliases/redirects. Staff/admin behavior is preserved under canonical staff URLs; parent access fails closed rather than exposing staff-oriented pages.

## Impact

| Area | Impact |
|------|--------|
| `app/page.tsx` | Replace shared feed entry with role dispatcher. |
| `app/staff/`, `app/family/` | Add canonical route shells and entry points. |
| `app/kids/`, `app/crear-publicacion/` | Preserve transitional routes and authorization. |
| `components/open-daycare.tsx`, shared navigation | Make links and shells area-aware. |
| Supabase | No planned schema or RLS changes. |

## Risks and Rollback

Redirect loops or stale links could block valid users. Verify each role/status matrix and direct legacy URLs; rollback by restoring `/` as the shared feed and removing canonical redirects while retaining existing authorization.

## Success Criteria

- [ ] Active staff/admin and parents land in their canonical areas automatically.
- [ ] Invalid profile states fail closed, legacy URLs remain safe, and no family feed is implied or exposed.
