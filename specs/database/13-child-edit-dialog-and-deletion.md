# SPEC 13 — Child Edit Dialog and Permanent Deletion

> **Status:** Implemented
> **Depends on:** SPEC 05, SPEC 10, SPEC 11, SPEC 12
> **Date:** 2026-08-25
> **Objective:** Replace standalone child editing with an accessible in-page edit dialog and add authorized permanent child deletion that removes only child-owned links while preserving shared posts and media.

## Why this spec exists

SPEC 10 established persisted child lifecycle management, SPEC 11 added invitations and parent-child links, and SPEC 12 added child recipient snapshots for posts with private photos. The current staff profile exposes two edit CTAs and still renders a standalone edit form, while the existing `ON DELETE RESTRICT` foreign keys intentionally prevent direct child deletion. This spec consolidates child editing into the established dialog interaction and defines one restricted database deletion boundary without destroying shared room history or media.

## Scope

**In:**

- Remove the small edit CTA beside the child's name from the staff child profile.
- Keep exactly one primary `Editar datos` CTA that opens an in-page accessible edit dialog without changing the URL.
- Reuse `updateChild` and `ChildFormFields` for the dialog's persisted child-data form.
- Move archive and restore controls into the edit dialog.
- Add permanent child deletion beside the lifecycle controls for both active and archived children.
- Require the user to type the child's exact displayed name before enabling irreversible deletion.
- Allow active `staff` and `admin` users to delete children in their own daycare.
- Enforce the active same-daycare `staff`/`admin` rule in the database, not only in the UI or server action.
- Redirect direct `/staff/kids/[childId]/edit` requests to `/staff/kids/[childId]` so the standalone form is never rendered.
- Delete invitations, `parent_children` links, and `post_children` associations before deleting the child row.
- Preserve parent users, Supabase Auth accounts, posts, `post_photos` rows, and Storage objects.
- Keep edit, archive, and deletion failures inline in the dialog.
- Preserve the accessible modal behavior established by `ParentLinkDialog`.
- Require implementation on a new branch before any code or migration edit.

**Out of scope (for future specs):**

- Deleting or modifying `public.users` rows or Supabase Auth accounts when a child is deleted.
- Deleting, editing, reassigning, or rewriting `public.posts` or `public.post_photos`.
- Deleting objects from the `post-photos` Storage bucket or changing Storage policies or APIs.
- Restoring a permanently deleted child, audit history, a recycle bin, or an administrative recovery workflow.
- Bulk child deletion, room deletion, room management, or post-recipient management outside the child-deletion transaction.
- A second edit route, a new child-edit page, or a standalone deletion page.
- Any code, migration, configuration, branch, or database change during creation of this Draft spec.

## Data model

This feature introduces no new tables, columns, enums, or Storage objects. It adds one versioned database function and one application deletion-action state while reusing the existing child, invitation, parent-link, post-recipient, post, and photo models.

### Restricted deletion function

The migration creates this public RPC as the only authorized physical child-deletion boundary:

```sql
create function public.delete_child(p_child_id uuid)
returns boolean
language plpgsql
security definer
set search_path = '';
```

The function must:

- Resolve the caller with `auth.uid()` and reject a missing authenticated identity.
- Resolve the caller's `public.users` row and require `status = 'active'` with `role in ('staff', 'admin')`.
- Resolve the child's daycare through `public.children.room_id -> public.rooms.daycare_id` and require it to equal the caller's `users.daycare_id`.
- Lock the target child row with `FOR UPDATE` before checking or deleting dependencies.
- Accept both `active` and `archived` child rows.
- Delete in this exact dependency order: `public.invitations`, `public.parent_children`, `public.post_children`, then `public.children`.
- Run all deletes inside the one function transaction without an intermediate commit.
- Return success only after the child row has been deleted; raise one safe generic failure for missing, unauthorized, cross-daycare, or otherwise unavailable children.
- Qualify every relation and callable object because the function uses an empty fixed `search_path`.

The existing foreign keys remain `ON DELETE RESTRICT`. The ordered deletes satisfy those constraints without changing them to cascading deletes.

### Rows that must remain

The deletion transaction must not delete or update:

- `public.users` parent rows.
- Supabase `auth.users` rows or Auth identities.
- `public.posts` rows, including posts published to a shared room.
- `public.post_photos` rows.
- `storage.objects` rows or physical objects in the `post-photos` bucket.

Deleting `post_children` removes the deleted child from each post's recipient snapshot, but the post record, its shared-room history, its photo metadata, and its Storage object remain. Existing visibility rules determine whether a parent can still see a historical post after that child's relationship is removed; this spec does not add a new post-visibility rule.

### Privileges and RLS boundary

The migration must explicitly preserve the direct-table security boundary:

- Revoke default and direct `DELETE` privileges on the child and child-link tables from `PUBLIC`, `anon`, and `authenticated`.
- Revoke all default execution on `public.delete_child(uuid)` from `PUBLIC`, `anon`, and `authenticated` before granting only `EXECUTE` to `authenticated`.
- Add no broad `DELETE` policy to any table.
- Keep table RLS enabled and keep direct table `DELETE` unavailable even though the function runs as `SECURITY DEFINER`.
- Do not use client-supplied role, status, daycare, or Auth metadata as authorization input.

The `SECURITY DEFINER` function is deliberately placed in `public` because the application calls the named public RPC. Its explicit identity, active-role, same-daycare, fixed-search-path, revoke-by-default, and authenticated-only checks are mandatory mitigations for the elevated execution context.

### Application deletion state

The server action uses a serializable state equivalent to:

```ts
type ChildDeletionState = {
  success: boolean;
  message?: string;
  childId?: string;
};
```

The action receives the child UUID and the typed confirmation name, validates the UUID and the exact current displayed name server-side, invokes `public.delete_child(uuid)`, revalidates the directory and profile paths, and returns a safe inline error without exposing database details.

## UI and route behavior

### Child profile entry point

- Remove the small `Editar` control rendered beside the child's name.
- Render one primary `Editar datos` button in the existing profile action area.
- Opening the button displays the edit dialog in place and leaves `/staff/kids/[childId]` unchanged.
- The dialog initializes all fields from the current persisted child and uses the existing `ChildFormFields` component, including the `DD/MM/AAAA` birth-date mask, enrollment date, room, allergies, medical notes, and photo-consent checkbox.
- The existing `updateChild` action remains the persistence path for edits.
- A successful edit closes the dialog, refreshes the profile data, restores focus to the edit trigger, and stays on the same URL.
- An edit validation or persistence error keeps the dialog open, renders the error inline, and preserves the entered values.

### Lifecycle controls

- For an active child, the dialog shows archive and permanent-delete controls beside one another.
- For an archived child, the dialog shows restore and permanent-delete controls beside one another.
- Archive still requires an explicit confirmation before submission.
- Restore does not require confirmation and uses the existing restore action.
- Archive and restore failures remain inline in the open dialog.
- Successful archive and restore retain the existing lifecycle destinations: archive returns to `/staff/kids?view=archived`, while restore refreshes the current profile state.

### Permanent deletion confirmation

- The permanent-delete control is present for both `active` and `archived` children.
- The dialog displays the current child name as the confirmation target.
- The irreversible submit button is disabled until the confirmation input exactly equals the displayed name, including case and whitespace; the comparison does not trim, lowercase, or otherwise normalize the value.
- The server action repeats the comparison against the current child name before invoking the database function.
- A mismatch never calls `public.delete_child` and produces an inline error.
- A pending deletion disables the relevant controls and communicates progress without closing the dialog prematurely.
- A successful deletion revalidates the directory and navigates to `/staff/kids`.
- A deleted UUID no longer resolves at `/staff/kids/[childId]` and renders the existing not-found response.
- A deletion error keeps the dialog open and displays a safe inline error.

### Dialog accessibility and responsive behavior

The edit dialog mirrors the interaction contract of `ParentLinkDialog`:

- Use `role="dialog"`, `aria-modal="true"`, and a unique labelled heading.
- Move initial focus to the first editable field when the dialog opens.
- Close through the close control, `Escape` when no mutation is pending, and a real overlay click.
- Trap `Tab` and `Shift+Tab` within enabled dialog controls.
- Restore focus to the `Editar datos` trigger after every successful or dismissive close path.
- Keep validation and mutation feedback associated with the relevant controls and exposed through an appropriate live or alert region.
- Constrain the dialog to the viewport and allow internal vertical scrolling for long forms and lifecycle controls.
- Prevent horizontal overflow at the mobile viewport while retaining the established desktop visual hierarchy.
- Do not navigate when opening or dismissing the dialog.

### Direct edit route

`app/staff/kids/[childId]/edit/page.tsx` becomes a redirect-only compatibility route. It redirects to `/staff/kids/[childId]` and never loads or renders `ChildEditForm`. The profile route remains responsible for resolving the UUID and returning the existing 404 response for malformed, missing, cross-daycare, or inaccessible children.

## Files

The implementation should be limited to these concrete paths:

- `components/kids.tsx` — remove the duplicate edit CTA, add the accessible edit dialog, reuse `ChildFormFields`, move lifecycle controls, and add typed-name deletion.
- `app/kids/actions.ts` — add the authorized server action that validates the confirmation name, calls `delete_child`, revalidates paths, and preserves existing edit/archive/restore behavior.
- `app/staff/kids/[childId]/page.tsx` — load the authorized room options required by the reused child form and pass them to the profile dialog.
- `app/staff/kids/[childId]/edit/page.tsx` — replace the standalone form page with the profile redirect.
- `supabase/migrations/<timestamp>_delete_child.sql` — create the restricted transactional `public.delete_child(uuid)` function and its privilege boundary.

No Storage API change, Storage migration, configuration change, `ParentLinkDialog` change, or additional application file is expected.

## Implementation plan

Each step is an independent reviewable work unit. Keep its focused verification with the unit, use a Conventional Commit message if committed, and preserve unrelated existing worktree changes.

1. **Open the implementation branch before editing.** After this spec is reviewed and marked `Approved`, start `/spec-impl 13-child-edit-dialog-and-deletion` so the current `AutoCreateBranch: true` workflow creates and switches to `spec-13-child-edit-dialog-and-deletion`. Do not edit code or migrations before the branch exists; keep this Draft creation on the current branch. Confirm the unrelated pending worktree changes are not staged or modified.
2. **Add the database deletion boundary.** Create exactly one timestamped `supabase/migrations/<timestamp>_delete_child.sql` through the approved migration workflow. Implement the fixed-search-path `SECURITY DEFINER` function, caller and tenant checks, child row lock, ordered dependency deletes, revocations, authenticated-only execute grant, and no-delete-policy boundary. Apply it only through the project-approved Supabase workflow, then perform focused catalog and controlled fixture verification before committing `feat(db): add restricted child deletion function`.
3. **Add the server deletion action.** In `app/kids/actions.ts`, add `deleteChild` with UUID validation, current-name comparison, safe error mapping, the `delete_child` RPC call, and directory/profile revalidation. Keep `updateChild`, `archiveChild`, and `restoreChild` as the existing mutation paths. Verify invalid UUIDs, mismatched names, unauthorized RPC errors, and successful state serialization before committing `feat(kids): add authorized child deletion action`.
4. **Replace the profile edit entry point with the dialog.** In `components/kids.tsx`, remove the small name-adjacent edit CTA and wire the sole primary `Editar datos` trigger to an in-page dialog. Reuse `ChildFormFields` and `updateChild`, initialize persisted values, preserve local/server validation, implement the `ParentLinkDialog` accessibility contract, and close-refresh-focus on success. Verify that opening the dialog does not change the URL and that edit failures preserve values before committing `feat(kids): move child editing into accessible dialog`.
5. **Move lifecycle controls and add typed-name deletion.** Render archive/restore and permanent deletion together inside the dialog, preserve archive confirmation and lifecycle destinations, add the exact-name gate for both child statuses, keep all errors inline, and route successful deletion to `/staff/kids`. Verify active and archived controls, disabled/enabled confirmation states, pending behavior, and focus restoration before committing `feat(kids): add confirmed child deletion controls`.
6. **Retire standalone edit rendering.** Change `app/staff/kids/[childId]/edit/page.tsx` to redirect to the profile route and remove any now-unused standalone form wiring without changing the profile's not-found behavior. Verify direct edit requests, malformed UUIDs, missing UUIDs, and deleted UUIDs before committing `refactor(kids): redirect standalone child edit route`.

If the authored implementation exceeds the repository's 400-line review budget, split these work units into chained review slices rather than combining unrelated file-based commits. Do not commit by file type.

## Acceptance criteria

### Workflow and file boundary

- [ ] The implementation branch is created and checked out as `spec-13-child-edit-dialog-and-deletion` before any code or migration edit.
- [ ] The spec itself was created on the current branch and remains `Draft` until explicitly approved.
- [ ] The implementation changes only `components/kids.tsx`, `app/kids/actions.ts`, `app/staff/kids/[childId]/page.tsx`, `app/staff/kids/[childId]/edit/page.tsx`, this spec, and one new `supabase/migrations/<timestamp>_delete_child.sql`.
- [ ] No Storage API, Storage policy, Auth account, configuration, or unrelated pending worktree change is modified.

### Database authorization and tenant isolation

- [ ] The versioned migration creates `public.delete_child(uuid)` as a `SECURITY DEFINER` PL/pgSQL function with `set search_path = ''` and schema-qualified references.
- [ ] The function rejects a null or unavailable `auth.uid()` and derives authorization from the caller's `public.users` row rather than editable Auth metadata.
- [ ] The function permits only active `staff` and `admin` callers.
- [ ] The function derives the target daycare through the child's room and rejects a child outside the caller's daycare without revealing cross-tenant details.
- [ ] The function locks the target child row before dependency deletion and accepts both active and archived children.
- [ ] Anonymous, parent, inactive, malformed, missing, and cross-daycare calls cannot delete a child.
- [ ] Direct authenticated table `DELETE` remains denied, no broad `DELETE` policy is added, and only `authenticated` receives execute permission for the RPC after default execution is revoked.
- [ ] Deletion executes in one transaction and removes dependencies in the required order: invitations, `parent_children`, `post_children`, then the child row.
- [ ] A controlled rollback/failure check leaves the child and every dependency intact when the transaction does not complete.
- [ ] An authorized active same-daycare staff member can delete an active child, and an authorized active same-daycare admin can delete an archived child.
- [ ] The database security verification is read-only for catalog, grants, policies, function attributes, and foreign-key inspection, apart from explicitly controlled negative or fixture tests whose failed or rolled-back operations leave no persistent mutation.

### Retained posts, media, and accounts

- [ ] After deletion, the targeted `invitations`, `parent_children`, and `post_children` rows are gone.
- [ ] After deletion, the targeted parent `public.users` rows and corresponding Supabase Auth accounts remain unchanged.
- [ ] After deletion, every related `public.posts` row remains, including posts from a shared room that contain the deleted child in their original recipient snapshot.
- [ ] After deletion, every related `public.post_photos` row remains with its metadata unchanged.
- [ ] After deletion, every related `storage.objects` row and physical Storage object remains unchanged.
- [ ] The staff/admin feed can still resolve the retained shared-room post history after the child association is removed.

### Edit dialog and lifecycle UI

- [ ] The small edit CTA beside the child's name is absent.
- [ ] The profile exposes exactly one primary `Editar datos` edit trigger.
- [ ] Activating the primary trigger opens an in-page `aria-modal` dialog without changing the current URL.
- [ ] The dialog reuses `ChildFormFields` and `updateChild`, initializes all persisted values, and preserves the existing date mask and validation behavior.
- [ ] A successful edit closes the dialog, refreshes the profile, restores trigger focus, and remains on the same child-profile URL.
- [ ] Edit validation and persistence failures remain inline and preserve entered values.
- [ ] Active children show archive and permanent-delete controls in the dialog; archived children show restore and permanent-delete controls in the dialog.
- [ ] Archive still requires confirmation, while restore continues to work without confirmation.
- [ ] Archive and delete failures remain inline without closing the dialog or discarding the current form state.
- [ ] The permanent-delete submit control is disabled until the typed value exactly matches the displayed child name, including case and whitespace.
- [ ] A mismatched confirmation is rejected by the server action and does not call the database deletion function.
- [ ] Successful deletion routes to `/staff/kids`, and the deleted UUID profile returns the existing 404 response.
- [ ] The dialog supports initial focus, close control, `Escape`, overlay dismissal, tab trapping, trigger-focus restoration, internal scrolling, and mobile no-overflow behavior.

### Redirects and quality gates

- [ ] Direct `/staff/kids/[childId]/edit` requests redirect to `/staff/kids/[childId]` and never render the standalone form.
- [ ] Invalid, missing, cross-daycare, inaccessible, and deleted child UUIDs do not reveal child data and resolve through the existing not-found behavior.
- [ ] `npx tsc --noEmit` succeeds.
- [ ] `./node_modules/.bin/eslint app components utils proxy.ts` succeeds; the known generated `references/pantallas/support.js` baseline is not attributed to this spec.
- [ ] `npm run build` succeeds.
- [ ] Read-only database inspection verifies the function security attributes, fixed search path, grants, revoked direct deletes, absence of a broad delete policy, required foreign keys, and preserved posts/media metadata.
- [ ] Playwright verifies active-child edit/archive/delete flows and archived-child restore/delete flows at desktop `1280 × 800` and mobile `375 × 667` viewports.
- [ ] Playwright verifies exact-name enablement, inline errors, direct-edit redirect, deleted-profile 404, focus restoration, internal dialog scrolling, and no horizontal overflow.
- [ ] Browser verification reports no unexpected application console errors or warnings during the covered flows.

## Decisions

- **Yes:** Use one in-page edit dialog as the only primary edit entry point. It removes duplicate actions and keeps the staff member on the profile URL.
- **No:** Keep the small edit CTA beside the child's name. Two edit controls create competing hierarchy and duplicate the existing `Editar datos` action.
- **Yes:** Reuse `ParentLinkDialog` interaction behavior, `ChildFormFields`, and `updateChild`. The project already has the required accessibility pattern and server-side child-form validation.
- **No:** Render a second child form or introduce a new standalone edit page. Duplicated fields would allow validation and serialization drift.
- **Yes:** Place archive, restore, and permanent deletion together in the edit dialog. Lifecycle controls belong to the same child-management context and remain available for both persisted statuses.
- **Yes:** Use exact displayed-name typing as the irreversible deletion gate. It makes the destructive target explicit and is stronger than a generic checkbox or a single browser confirmation.
- **No:** Use only a browser `confirm` prompt for permanent deletion. A prompt alone does not require the operator to identify the child deliberately.
- **Yes:** Permit active same-daycare `staff` and `admin` users to delete both active and archived children. This matches the existing child-management role boundary while allowing cleanup of archived records.
- **Yes:** Enforce deletion authorization in `public.delete_child(uuid)`, not only in React or a server action. Direct route and RPC calls must fail closed at the database boundary.
- **Yes:** Use a restricted public `SECURITY DEFINER` function with an empty fixed `search_path`, explicit `auth.uid()` and profile checks, a child row lock, revoked defaults, and authenticated-only execute. The public RPC name is required by the application boundary, so the elevated context must be tightly constrained.
- **No:** Add a broad table `DELETE` grant or RLS delete policy. The function is the only deletion path.
- **Yes:** Delete invitations, parent-child links, and post-child associations before the child row. Existing `ON DELETE RESTRICT` foreign keys require explicit dependency ordering.
- **No:** Change the existing child foreign keys to `CASCADE`. Cascades would make it easier to delete shared posts, photos, or accounts accidentally and would weaken the reviewable deletion boundary.
- **Yes:** Preserve posts, post-photo metadata, and Storage objects. Posts are room history shared beyond one child and are not child-owned records.
- **No:** Delete parent users, Auth accounts, posts, `post_photos`, or Storage objects as part of child removal. Their lifecycle belongs to separate domains.
- **Yes:** Keep the old `/staff/kids/[childId]/edit` URL as a redirect. Existing links remain useful without preserving a second form implementation.
- **No:** Add a new route or change the profile route's existing 404 contract. The profile remains the canonical child destination.
- **Yes:** Create the implementation branch only after this Draft is approved. The current `AutoCreateBranch: true` workflow owns branch creation, while spec creation remains on the current branch.

## Risks

| Risk | Mitigation |
| --- | --- |
| An operator permanently deletes the wrong child | Show the exact displayed name, require an exact case- and whitespace-sensitive match, disable the submit button until it matches, and keep the destructive control visually separate from edit/save controls. |
| `SECURITY DEFINER` bypasses ordinary RLS checks | Require `auth.uid()`, an active `public.users` profile, `staff`/`admin` role, same-daycare ownership, a fixed empty `search_path`, fully qualified names, revoked default execution, and authenticated-only execute; verify the catalog state. |
| A cross-daycare UUID is submitted directly | Derive daycare through `children -> rooms`, compare it with the caller profile inside the locked database function, and return a generic failure. |
| A new dependency is added later and blocks deletion or causes an unsafe workaround | Keep the existing `ON DELETE RESTRICT` constraints, verify the dependency catalog before applying the migration, and fail the transaction instead of broadening the delete scope. |
| A partial delete leaves orphaned or inconsistent child links | Lock the child, delete all required dependencies in one function transaction, and verify rollback behavior with a controlled fixture. |
| Shared history or private media is deleted accidentally | The function deletes only child-owned/link rows; it never references `posts`, `post_photos`, or `storage.objects`, and post/media counts and object metadata are checked before and after the fixture deletion. |
| A parent loses access to historical posts after `post_children` removal | Document that the recipient association is intentionally removed while the shared post and media remain; do not silently retain a child link that would violate the required dependency cleanup. |
| A rename races with typed-name confirmation | Validate the name again in the server action against the current child row and let the locked RPC fail safely if the target is no longer available. |
| The modal overflows or traps focus on small screens | Mirror `ParentLinkDialog` focus and dismissal behavior, use internal viewport-constrained scrolling, and verify both required Playwright viewports for overflow and keyboard behavior. |
| Old bookmarks still expect a standalone form | Redirect the old edit URL to the canonical profile and verify that invalid or deleted UUIDs still resolve through the profile's existing not-found behavior. |

## Verification

**Status:** Implemented and verified.

- **Implementation:** The edit dialog, lifecycle controls, exact-name deletion flow, direct-edit redirect, server action, and restricted migration are implemented on `spec-13-child-edit-dialog-and-deletion` without commits.
- **Database:** The migration is applied and read-only catalog verification confirmed the function, fixed empty `search_path`, `SECURITY DEFINER`, authenticated-only execution, revoked direct deletes, enabled RLS, and unchanged restrictive foreign keys. No destructive fixture was run because no safe authenticated fixture harness was available.
- **Application checks:** `npx tsc --noEmit`, `./node_modules/.bin/eslint app components utils proxy.ts`, `npm run build`, and `git diff --check` passed on the final candidate.
- **Browser evidence:** Authenticated desktop/mobile checks passed for the single edit CTA, modal semantics, fields, exact-name gate, focus trapping/restoration, internal scrolling, no horizontal overflow, direct-edit redirect, console, and network behavior. Controlled fixtures proved create/archive/restore/delete cleanup, 404 behavior, and preservation of users, posts, post photos, and Storage objects.
- **Post-deletion redirect:** Two controlled fixtures exposed that client-side navigation occurred after the deleted profile had already rendered its 404. Moving the successful redirect into the Server Action outside its error-catching `try` fixed the race. A final authorized fixture proved immediate navigation to `/staff/kids`, no transient deleted-profile 404, complete child/link cleanup, retained shared counts, and zero console or request errors.

- **Branch evidence:** Confirm the implementation checkout is `spec-13-child-edit-dialog-and-deletion` before inspecting implementation diffs.
- **Database evidence:** Apply the one versioned migration through the approved Supabase workflow, inspect function attributes, `search_path`, grants, RLS policies, foreign-key actions, and table privileges with read-only catalog queries, then run controlled active/archived, role, tenant, dependency, rollback, retention, and direct-delete-denial checks.
- **Application evidence:** Run `npx tsc --noEmit`, `./node_modules/.bin/eslint app components utils proxy.ts`, and `npm run build`. Report the known generated reference-file lint baseline separately if a global lint command is used.
- **Browser evidence:** Use Playwright at `1280 × 800` and `375 × 667` to verify the profile edit dialog, edit success/failure, archive confirmation, restore, typed-name deletion, inline errors, focus restoration, direct-edit redirect, deleted-profile 404, retained shared history, and no horizontal overflow.
- **Review evidence:** Keep focused verification with each work-unit commit, review the complete diff for accidental Storage/API/config changes, and record the final acceptance results before changing the spec state from `Draft`.

## What is **not** in this spec

- A second edit CTA or a standalone child-edit form.
- Child recovery, recycle-bin behavior, audit history, or bulk deletion.
- Independent parent-link or invitation deletion management outside deleting the child.
- Deletion or modification of parent users, Supabase Auth accounts, posts, `post_photos`, or Storage objects.
- Storage API, Storage policy, Auth configuration, room-management, or post-management changes.
- Any implementation, migration application, branch change, configuration change, or unrelated worktree modification while this document remains a Draft.

Each excluded capability requires a future spec before implementation.
