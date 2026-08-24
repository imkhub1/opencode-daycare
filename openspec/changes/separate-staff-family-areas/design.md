## Context

The root layout loads a Supabase profile for every route, `/` renders the shared feed, and staff navigation is hidden client-side. `/kids`, create-post, and mutation paths already perform server authorization. See `proposal.md` and the role-based application-area spec. Next.js 16.3 guidance supports nested layouts, server redirects, cached authorization helpers, and authentication-only Proxy checks.

## Goals / Non-Goals

**Goals:** Server-guarded role areas, terminating compatibility redirects, distinct responsive shells, and staff-feature reuse.

**Non-Goals:** Family feed/data, database/RLS changes, role switching, or a new authorization framework.

## Decisions

| Decision | Choice and rationale | Alternative rejected |
|---|---|---|
| Route tree | Keep `/login`, `/activate`, `/auth/callback` public. Add `/staff`, `/staff/kids/**`, `/staff/crear-publicacion`, `/family` (shell/placeholder), and protected `/access-pending`; `/` dispatches. Static segments outrank `app/[...placeholder]`, avoiding conflicts. | Route groups cannot create the required URLs. |
| Profile authority | Keep `getCurrentAppProfile()` server-only; add `requireArea("staff" | "family")` and a profile-destination function in `utils/supabase/profile.ts`. Staff/admin map to `/staff`, parents to `/family`, all untrusted states to `/access-pending`. Area layouts guard before rendering; pages/actions and RLS remain authoritative. | Proxy role queries are slow and insufficient authorization. Client context is presentation-only. |
| Profile placement | Remove profile loading/provider from `app/layout.tsx`; protected layouts use the cached helper and provide shells a minimal display profile. | Global loading couples public routes to profile availability. |
| Shells | Extract frame/brand/logout primitives to `components/shared/AppShell.tsx`; `components/staff/StaffShell.tsx` and `components/family/FamilyShell.tsx` own separate nav arrays. Path-aware nav uses longest segment-boundary matching. Family modules import no staff controls, queries, or room data. | `StaffNavigationOnly` cannot isolate server output. |
| Feature movement | Move feed to `app/staff/page.tsx`, kids route files to `app/staff/kids/**`, and create-post page to `app/staff/crear-publicacion/page.tsx`. Reuse authorized action/query modules. Change feature links/router destinations and revalidation to canonical staff paths; retain legacy revalidation only while aliases exist. | Duplicated route implementations drift. |

### Redirect contract

| Request | Staff/admin | Parent | Pending/missing/error | Anonymous |
|---|---|---|---|---|
| `/` | `/staff` | `/family` | `/access-pending` | `/login` by Proxy |
| `/staff/**` | render | `/family` | `/access-pending` | `/login` |
| `/family/**` | `/staff` | render | `/access-pending` | `/login` |
| `/access-pending` | `/staff` | `/family` | render | `/login` |
| `/kids[/…]` | same suffix under `/staff/kids` | `/family` | `/access-pending` | `/login` |
| `/crear-publicacion` | `/staff/crear-publicacion` | `/family` | `/access-pending` | `/login` |

`app/kids/[[...path]]/page.tsx` preserves only the known `view=archived` query. Canonical URLs never redirect to legacy URLs. Login still targets `/`; logout fully navigates to `/login`.

```text
request -> Proxy session check -> server profile resolver
                              -> canonical render | one-way redirect | access-pending
```

## File Changes

| Files | Action |
|---|---|
| `app/page.tsx`, `app/layout.tsx`, `proxy.ts`, `utils/supabase/profile.ts` | Dispatcher, profile placement/guards; preserve public route set. |
| `app/staff/**`, `app/family/**`, `app/access-pending/page.tsx` | Create canonical areas and terminal pending page. |
| `app/kids/**`, `app/crear-publicacion/page.tsx` | Move UI routes; leave role-aware aliases and reusable action modules. |
| `components/open-daycare.tsx`, `components/feed.tsx`, `components/kids.tsx`, `components/create-post.tsx`, `components/shared/AppProfileProvider.tsx` | Extract shells and update canonical navigation. |
| `app/posts/actions.ts`, `app/kids/actions.ts`, `app/kids/parent-invitations/actions.ts` | Update canonical revalidation paths without weakening guards. |

## Verification

Run lint, TypeScript, and build. Using Playwright/manual sessions for every role/profile state, exercise each redirect row, deep aliases, responsive nav, direct server actions, and logout Back/bookmarks; assert family HTML contains no staff links, controls, or room/feed data.

## Threat Matrix

| Boundary | Applicability | Design response | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A: no execution classification | None | N/A |
| Git repository selection | N/A: no VCS automation | None | N/A |
| Commit state | N/A: no commit automation | None | N/A |
| Push state | N/A: no push automation | None | N/A |
| PR commands | N/A: no PR automation | None | N/A |

## Risks / Trade-offs

- [Redirect loop or stale hard-coded path] → one-way matrix plus repository-wide path audit and role matrix verification.
- [Large route move] → use reversible slices and the 400-line review gate.
- [Layout guard mistaken for full security] → preserve authorization in every server action/query and unchanged RLS.

## Migration Plan

1. Add resolver, guards, shells, pending page, and canonical routes while legacy routes still work.
2. Move/reuse staff pages; update links, router destinations, and revalidation paths.
3. Replace legacy pages with one-way aliases; run the complete verification matrix.
4. Roll back by restoring the old root/feed and legacy pages, then removing canonical redirects/shells; no data rollback is required.
