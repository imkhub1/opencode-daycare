# Tasks: Staff and Family Areas

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 650–900 authored lines |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 foundation → PR 2 staff routes → PR 3 aliases/isolation |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Guards, dispatcher, and shells | PR 1 | `npx tsc --noEmit` | N/A: requires authenticated session | Revert profile, layout, dispatcher, shell files |
| 2 | Canonical staff route migration | PR 2 | `npx tsc --noEmit` | Staff/admin desktop/mobile deep-link matrix | Revert `app/staff/**` and moved routes |
| 3 | Family placeholder, aliases, links, isolation | PR 3 | `npm run lint` | Full role/status and logout matrix | Revert alias/link/revalidation edits |

## 1. Foundation and Guards

- [x] 1.1 Extend `utils/supabase/profile.ts` with destination and `requireArea`; verify active-role mapping and fail-closed states; rollback helper additions.
- [x] 1.2 Remove profile loading from `app/layout.tsx`, preserve public/auth behavior in `proxy.ts`, and verify anonymous routes; rollback layout/proxy edits.
- [x] 1.3 Add safe terminal `app/access-pending/page.tsx`; verify no staff/family data or controls; rollback the page.

## 2. Canonical Areas and Shells (after Phase 1)

- [x] 2.1 Create `components/shared/AppShell.tsx`, `components/staff/StaffShell.tsx`, `components/family/FamilyShell.tsx`; refactor `AppProfileProvider.tsx`/`SidebarUser.tsx`; verify distinct desktop/mobile navigation.
- [x] 2.2 Add `app/staff/layout.tsx`, `app/staff/page.tsx`, `app/family/layout.tsx`, `app/family/page.tsx` as a no-feed placeholder, and dispatcher `app/page.tsx`; verify `/` and cross-area redirects.
- [x] 2.3 Rehome feed wiring in `components/feed.tsx`/`components/open-daycare.tsx`; verify staff/admin feed and controls only under `/staff`.

## 3. Staff Migration and Revalidation (after Phase 2)

- [x] 3.1 Move `app/kids/{loading.tsx,error.tsx,page.tsx,[childId]/page.tsx,[childId]/edit/page.tsx}` to `app/staff/kids/**` and create `app/staff/crear-publicacion/page.tsx`; verify deep links and `view=archived`.
- [x] 3.2 Update `revalidatePath` in `app/posts/actions.ts`, `app/kids/actions.ts`, and `app/kids/parent-invitations/actions.ts`; verify authorization and staff refresh.
- [x] 3.3 Update canonical links/router destinations in `components/kids.tsx`, `components/create-post.tsx`, `components/feed.tsx`, and `components/open-daycare.tsx`; verify no links target legacy pages.

## 4. Compatibility and Isolation (after Phase 3)

- [x] 4.1 Replace legacy `app/kids`/`app/crear-publicacion` pages with role-aware aliases, preserving archived query and suffix; verify terminating safe redirects. **Verified:** the staged local historical-migration bootstrap provisioned staff/admin fixtures before final migrations; the final runtime proved staff/admin aliases and deep suffixes, archived-query preservation, parent fail-closed aliases, pending/missing/invalid fail-closed aliases, and anonymous login handling.
- [x] 4.2 Audit `app/[...placeholder]/page.tsx` and navigation; verify family HTML has no staff links, controls, room data, or feed data.
- [x] 4.3 Confirm no `supabase/` or RLS files change; verify existing action/query guards remain authoritative with `git diff --name-only`.

## 5. Verification (after Phase 4)

- [x] 5.1 Run `npm run lint`; verify no new application errors and record the known `references/pantallas/support.js` baseline of 2 errors and 8 warnings.
- [x] 5.2 Run `npx tsc --noEmit` and `npm run build`; verify type checking and production route generation pass.
- [x] 5.3 Use Playwright/manual desktop/mobile sessions for anonymous, active staff/admin/parent, pending/missing/invalid/error profiles; exercise routes, aliases, actions, logout Back/bookmarks, and family isolation. **Verified:** the rebuilt disposable local fixture matrix passed. Logout now replaces the history entry and the root history guard redirects any restored protected document to `/login`; direct protected bookmarks also redirect to `/login`. Family output stayed isolated, role/status/alias routes resolved fail-closed, responsive navigation passed, and local staff actions passed with delivery correctly reported unavailable without a Resend credential.
