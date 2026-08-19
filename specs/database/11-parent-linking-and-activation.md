# SPEC 11 — Persistent Parent Linking and Activation

> **Status:** Approved
> **Depends on:** SPEC 05, SPEC 08, SPEC 09, SPEC 10
> **Date:** 2026-08-18
> **Objective:** Replace the temporary parent-link dialog with a tenant-safe invitation, Resend email, and Supabase account-activation flow for persistent parent-child relationships.

## Why this spec exists

SPEC 10 intentionally removed the temporary parent and invitation mocks while introducing UUID-backed persisted children. This spec restores the workflow as a real, database-backed capability without reintroducing Mateo-specific routes or client-only state.

## Scope

**In:**

- Persist parent-child relationships for every accessible child UUID.
- Allow active `staff` and `admin` users to invite a parent only for an active child in their own daycare.
- Replace the static modal token with a random five-character token using an uppercase and digit alphabet without ambiguous characters.
- Store the token as a secure hash plus server-only encrypted ciphertext so the same token can be resent after a failed delivery without storing it in plaintext.
- Persist invitations with a seven-day expiration, one-use business status, and separate Resend delivery status.
- Reject an existing pending invitation for the same normalized email and child before sending another email.
- Reject an invitation when the normalized email already has an accepted parent-child relationship for the child.
- Send an HTML and plain-text invitation email through the server-only Resend Node SDK.
- Include the activation URL and the five-character token in the email.
- Display the generated token to staff after a successful invitation and preserve the OpenDayCare modal hierarchy from SPEC 05.
- Keep the same invitation row, token, and expiration when Resend fails.
- Keep the modal open with an inline error and retry action after Resend failure.
- Show a failed invitation on the child profile with an action that retries the same invitation record.
- Support both `/activate?code=TOKEN` and manual token entry on `/activate`.
- Show the invited email as read-only during activation and allow the invited user to edit the display name.
- Create a new parent account with Supabase Auth email/password signup and mandatory email confirmation.
- Create new parent application profiles as `role = parent` and `status = pending` using invitation-derived daycare data.
- Provide an explicit existing-parent login branch that accepts the invitation without creating another account.
- Add a PKCE `/auth/callback` route that exchanges the Supabase confirmation code, preserves the invitation token, and completes acceptance.
- Accept invitations transactionally and idempotently for the same authenticated parent and token.
- Create exactly one `parent_children` relationship, mark the invitation accepted, and change the new parent profile from `pending` to `active` after confirmed email and valid acceptance.
- Sign out after acceptance and redirect new and existing parents to `/login?activation=success` with a visible success message.
- Require Supabase email confirmation, PKCE, and `/auth/callback` in the configured Auth Redirect URLs.
- Add server-side validation, tenant isolation, RLS, grants, concurrency protection, and generic errors that do not disclose cross-daycare data.

**Out of scope (for future specs):**

- Standalone invitation-management screens.
- Independent cancellation controls or cancellation workflows.
- Re-send controls from unrelated lists or dashboards; retry exists only in the profile flow for a failed delivery.
- Editing a relationship after acceptance.
- Removing or revoking an accepted parent-child relationship.
- Parent dashboard, parent feed, daily summaries, posts, comments, or notifications.
- Resend webhooks and delivered, bounced, or complained status synchronization.
- Guaranteed exactly-once email delivery beyond Resend's documented idempotency window.
- Creating or provisioning `staff` or `admin` accounts.
- Password reset, OAuth, social login, or MFA.
- Multi-daycare memberships for one parent account.
- Invitations from archived children.
- Physical deletion of children, users, invitations, or relationships.

## Data model

All persisted enum values, relationship values, delivery values, and database codes use English. The UI translates them to Spanish.

### Enums

```sql
create type public.relationship_type as enum (
  'father',
  'mother',
  'guardian'
);

create type public.invitation_status as enum (
  'pending',
  'accepted',
  'expired',
  'cancelled'
);

create type public.invitation_delivery_status as enum (
  'sent',
  'failed'
);
```

`invitation_status = cancelled` exists for the shared domain model, but this spec does not expose a cancellation action.

### `public.parent_children`

```sql
create table public.parent_children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete restrict,
  relationship public.relationship_type not null,
  created_at timestamptz not null default now(),
  constraint parent_children_parent_child_unique unique (parent_id, child_id)
);
```

Create indexes for `parent_id` and `child_id` to support parent feeds, tenant checks, joins, and foreign-key operations.

### `public.invitations`

```sql
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete restrict,
  invited_by uuid not null references public.users(id) on delete restrict,
  full_name text not null,
  email text not null,
  relationship public.relationship_type not null,
  code_hash text not null unique,
  code_ciphertext text not null,
  status public.invitation_status not null default 'pending',
  delivery_status public.invitation_delivery_status not null default 'failed',
  delivery_error text,
  resend_email_id text,
  last_delivery_attempt_at timestamptz,
  sent_at timestamptz,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invitations_full_name_not_blank check (btrim(full_name) <> ''),
  constraint invitations_email_normalized check (email = lower(btrim(email))),
  constraint invitations_code_hash_not_blank check (btrim(code_hash) <> ''),
  constraint invitations_code_ciphertext_not_blank check (btrim(code_ciphertext) <> ''),
  constraint invitations_accepted_at_consistent check (
    (status = 'accepted') = (accepted_at is not null)
  ),
  constraint invitations_accepted_requires_sent check (
    status <> 'accepted' or delivery_status = 'sent'
  ),
  constraint invitations_sent_timestamp_consistent check (
    (delivery_status = 'sent') = (sent_at is not null)
  )
);
```

Additional indexes and uniqueness rules:

- A partial unique index on `(child_id, lower(email))` where `status = 'pending'` rejects pending duplicates under concurrency.
- An index on `(child_id, status)` supports profile reads and lazy expiration.
- An index on `lower(email)` supports existing-account and duplicate checks.
- An index on `expires_at` supports expiration maintenance.
- `email` is normalized with `btrim(...)->lower(...)` before insertion and comparison.
- `code_ciphertext` is encrypted and decrypted only in server-side functions or server-only application code using a required secret environment variable.
- The plaintext token is never returned by a public database function and is never included in a client bundle.
- The five-character token uses an alphabet such as `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, excluding ambiguous characters.
- Node server code generates the token with `node:crypto`, hashes it with SHA-256 for database comparison, and encrypts it with AES-256-GCM using `PARENT_INVITATION_CODE_KEY`; the encrypted value stores the IV and authentication tag in a documented envelope format.
- PostgreSQL functions compare the SHA-256 digest of a submitted token; they do not generate, decrypt, or access the Node encryption key.
- A retry never changes `code_hash`, `code_ciphertext`, `expires_at`, or `created_at`.

### Application DTOs

```ts
type ParentRelationship = "Mamá" | "Papá" | "Tutor/a";
type ParentInvitationStatus = "pending" | "accepted" | "expired" | "cancelled";
type InvitationDeliveryStatus = "sent" | "failed";

type ParentInvitation = {
  id: string;
  childId: string;
  childName: string;
  fullName: string;
  email: string;
  relationship: ParentRelationship;
  status: ParentInvitationStatus;
  deliveryStatus: InvitationDeliveryStatus;
  expiresAt: string;
  sentAt: string | null;
  deliveryError: string | null;
};

type ParentInvitationForm = {
  name: string;
  email: string;
  relationship: ParentRelationship;
};
```

The staff-only create response additionally contains the one-time plaintext token for display in the modal. Profile reads never return the token.

## Security and database behavior

### Tenant and role rules

- `invitations` and `parent_children` have RLS enabled.
- `anon` receives no direct table access.
- Active `staff` and `admin` users can read invitations and accepted links only when the related child belongs to their daycare.
- Active `staff` and `admin` users cannot insert, update, or delete rows directly; invitation creation, delivery updates, retry, and acceptance use restricted server functions or server actions.
- Parents can read only their own `parent_children` rows after authentication.
- Parents cannot read invitation email addresses, code hashes, ciphertext, delivery metadata, or other daycare data.
- The child must belong to the caller's daycare and have `status = active` when creating or retrying an invitation.
- The invitation's daycare is always derived from `child -> room -> daycare`; no client-provided `daycare_id` is trusted.
- Parent authorization must use database fields and private helpers, never user-editable `raw_user_meta_data` claims.

### Required database functions

The migration creates restricted functions with fixed `search_path`, explicit `SECURITY DEFINER` justification, revoked default execute privileges, and grants only to the roles that need each operation:

- `create_parent_invitation(child_id, full_name, email, relationship, code_hash, code_ciphertext)` validates active staff/admin access, active child status, same-daycare ownership, duplicate pending invitations, and existing accepted links, computes the seven-day expiration, and stores the server-generated hash and ciphertext as `pending/failed` data.
- `prepare_parent_invitation_delivery(invitation_id)` validates that the caller may retry the active child invitation and returns the encrypted token plus the minimum delivery payload; the Node server decrypts the ciphertext and the database never accesses `PARENT_INVITATION_CODE_KEY`.
- `mark_parent_invitation_delivery(invitation_id, delivery_status, delivery_error, resend_email_id)` changes only delivery metadata and timestamps, never identity, child, relationship, token, expiration, or business status.
- `get_invitation_preview(token)` is callable for activation lookup, hashes the submitted token for lookup, and returns only child name, daycare name, invited full name, normalized email, relationship, status, delivery status, and expiration; it lazily marks an expired pending invitation as `expired`.
- `accept_parent_invitation(token, full_name)` hashes the submitted token and runs one transaction for an authenticated user after confirmed email. It locks the invitation, validates token hash, status, expiry, delivery state, email, parent role, and daycare, then creates the unique link, marks the invitation accepted, updates the parent name, and activates a pending parent profile.
- `accept_parent_invitation` is idempotent when the same authenticated parent already owns the link for the same invitation; it returns success without inserting a duplicate row.

The application must not expose a generic RPC that accepts `role`, `status`, `daycare_id`, `invited_by`, `expires_at`, or a plaintext token as trusted identity or authorization input.

### Signup trigger changes

The current `handle_new_user()` trigger trusts `role`, `status`, and `daycare_id` from client-supplied metadata. This spec replaces that behavior for parent activation:

1. Parent signup metadata contains only the invitation token and requested display name.
2. The trigger validates the invitation token, normalized Auth email, pending status, sent delivery status, active child, and unexpired invitation.
3. The trigger derives the daycare through the child and room relation.
4. The trigger inserts `public.users` with `role = 'parent'` and `status = 'pending'`.
5. It uses the submitted display name after trimming, falling back to the invitation name.
6. Signup attempts with missing, invalid, expired, failed-delivery, accepted, cancelled, cross-daycare, or email-mismatched invitations fail without creating a privileged profile.
7. Existing staff/admin provisioning behavior must not be opened to public signup by this spec; staff/admin accounts remain provisioned through the existing trusted process.

### Acceptance transaction

The acceptance path must lock rows in a consistent order and use one transaction:

1. Resolve and lock the invitation by token hash.
2. Validate its status, expiry, delivery state, child, and invited email.
3. Lock or verify the authenticated parent profile.
4. Insert `parent_children` using the unique `(parent_id, child_id)` constraint.
5. Update the invitation to `accepted` with `accepted_at`.
6. Change a matching `parent/pending` profile to `active` and update only the display name.
7. Treat a repeated acceptance by the same parent as success without duplicate insertion.

Concurrent acceptance by different users, mismatched email, another daycare, expired code, cancelled code, failed delivery, or a different existing relationship must fail without partial writes.

## Resend behavior

- Add the pinned `resend` package to `package.json` and `package-lock.json`.
- Add a server-only module such as `utils/email/resend.ts` with `import "server-only"` and a lazy `Resend` client.
- Generate and encrypt tokens only in server-only Node modules before calling `create_parent_invitation`; never pass the encryption key to PostgreSQL or the browser.
- Configure:
  - `RESEND_API_KEY` for the server-only API key.
  - `RESEND_FROM_EMAIL` for a verified sender address.
  - `NEXT_PUBLIC_APP_URL` for the public activation URL.
  - `RESEND_REPLY_TO` optionally for reply routing.
  - `PARENT_INVITATION_CODE_KEY` for encryption/decryption of the token ciphertext.
- Never expose `RESEND_API_KEY` or `PARENT_INVITATION_CODE_KEY` through `NEXT_PUBLIC_` variables, HTML, browser JavaScript, or client error responses.
- The email includes the invited parent name, child name, daycare name, relationship, activation URL, plaintext token, seven-day expiration, and manual activation instructions.
- The email has both HTML and plain-text representations.
- Use a stable Resend idempotency key derived from the invitation ID, such as `parent-invitation/<invitation-id>`.
- `sent` means Resend accepted the request and returned an email ID; it does not mean the recipient received the message.
- On Resend success, mark one row `pending/sent`, persist `resend_email_id`, `sent_at`, and clear `delivery_error`.
- On Resend failure, keep one row `pending/failed`, preserve token and expiry, store a safe error summary, keep the modal/card retryable, and do not report success.
- A retry may be attempted only while the invitation is pending and unexpired; it reuses the same token and expiry.
- Resend idempotency prevents duplicate processing only within its documented 24-hour window; stronger delivery guarantees require a future delivery-attempt model.

## UI and routes

### Staff child profile

- Update `components/kids.tsx` and `app/kids/[childId]/page.tsx` to load accepted parent links and pending invitations from the server.
- Keep the `PADRES VINCULADOS` card on every UUID child profile.
- Render accepted parents with translated relationship and active status.
- Render pending invitations with invited name, normalized email, relationship, expiration, delivery state, and `PENDIENTE` status.
- The `Vincular otro padre` modal keeps the SPEC 05 fields, relationship controls, notice, responsive layout, and accessibility behavior.
- `Mamá` remains the initial selection in the UI and maps to `mother` in the database.
- A valid form submission creates and sends through a server action; it does not append a local fake parent.
- A successful send closes and resets the modal, displays the generated five-character token to staff, and refreshes the persisted profile.
- A failed send keeps the modal open, shows an inline retry error, and preserves the entered form values.
- A failed invitation shown after reload exposes a retry action that uses the same invitation record and token.
- The modal closes through its close button, Escape, and overlay click; dismissal does not create a new invitation and restores focus to the trigger.

### Activation

- `/activate` remains public and accepts `code` from the query string or manual entry.
- A valid pending/sent token loads only the minimum preview data required by the form.
- The invited email is read-only and must match the Auth email case-insensitively.
- The invited name is editable and validated as nonblank.
- The new-account path requests a password and calls Supabase Auth signup with `emailRedirectTo` pointing to `/auth/callback?invite=<token>`.
- The confirmation email is required; signup creates a `parent/pending` profile but does not activate the relationship.
- The existing-account path links to `/login?invite=<token>` and returns to `/activate?code=<token>` after successful login for explicit acceptance.
- Invalid, expired, failed-delivery, cancelled, already accepted, mismatched, or unavailable tokens show generic actionable errors without leaking cross-daycare details.

### Auth callback and login

- Add `/auth/callback` as a Route Handler using the existing Supabase SSR server client.
- Exchange the Supabase PKCE authorization code with `exchangeCodeForSession`.
- Preserve the OpenDayCare invitation token in a separate `invite` query parameter.
- Verify the session email and confirmed state before calling transactional acceptance.
- On successful new-account acceptance, sign out and redirect to `/login?activation=success`.
- On failure, sign out and redirect to `/login?activation=error` with a safe error message.
- Update `components/auth.tsx` and the login route to render activation success/error messages and preserve `invite` when the existing-parent branch logs in.
- Update `proxy.ts` only as needed to allow `/auth/callback`, preserve `/activate?code=...` for an authenticated parent returning from the existing-account login branch, and retain the existing protection of all other routes.

## Files

The implementation should use these concrete paths unless an existing project convention requires an equivalent replacement:

- `supabase/migrations/<timestamp>_create_parent_linking_and_invitations.sql`
- `app/kids/parent-invitations/actions.ts`
- `app/kids/[childId]/page.tsx`
- `app/kids/actions.ts`
- `components/kids.tsx`
- `components/parent-link-dialog.tsx`
- `utils/email/resend.ts`
- `utils/email/parent-invitation.ts`
- `app/activate/page.tsx`
- `app/activate/actions.ts`
- `components/auth.tsx`
- `app/auth/callback/route.ts`
- `proxy.ts`
- `package.json`
- `package-lock.json`
- `.env.template`

## Implementation plan

1. Review the live Supabase Auth configuration and Resend prerequisites. Confirm email confirmation is enabled, PKCE is used, `NEXT_PUBLIC_APP_URL/auth/callback` is an allowed Redirect URL, and the Resend sender domain is verified. Add the pinned `resend` dependency and server-only environment names to `.env.template` without adding secrets.
2. Create and apply a versioned migration under `supabase/migrations/` for the enums, `parent_children`, `invitations`, indexes, constraints, SHA-256 token comparison, RLS, grants, invitation functions, acceptance transaction, and secure parent-signup trigger. Keep token generation and AES-256-GCM encryption in Node server code. Verify the catalog and policies before wiring UI.
3. Add `utils/email/resend.ts` and `utils/email/parent-invitation.ts`. Keep Resend, encryption, token generation, and HTML/text rendering server-only. Add safe error normalization and stable idempotency keys.
4. Add server actions/modules for invitation creation, first delivery, delivery-state update, and same-record retry. Generate the token and ciphertext in Node, pass only the hash/ciphertext to the restricted creation function, validate staff/admin role, active child, tenant, duplicate pending email, accepted existing link, and form input before calling Resend.
5. Replace the current local parent state in `components/kids.tsx` with server-loaded accepted links and invitations. Wire the existing modal to the server action, preserve focus/error behavior, show the staff token only on successful creation/delivery, and render retry state after delivery failure.
6. Extend `app/kids/[childId]/page.tsx` and related server reads so the profile loads only the current daycare's child, accepted links, and safe invitation summaries. Keep archived children unable to create or retry invitations.
7. Convert `/activate` into a functional public preview and registration form. Implement query/manual token lookup, email read-only behavior, editable name, password validation, invalid-token errors, and the explicit existing-parent login branch.
8. Add `/auth/callback` and the Supabase SSR PKCE exchange. Preserve the invite token, verify confirmation, run idempotent acceptance, sign out, and redirect to `/login?activation=success` or a safe error state.
9. Update login/proxy handling for invitation return parameters and activation messages without weakening the existing route protection. Permit an authenticated parent to return to `/activate?code=...` for explicit acceptance, while keeping all other protected-route behavior unchanged. Verify new and existing parent paths end in the requested login state.
10. Verify database isolation, concurrency, Resend success/failure/retry, signup confirmation, callback acceptance, responsive UI, and all application checks described below. Keep any existing unrelated worktree changes intact.

## Acceptance criteria

### Database and security

- [ ] A versioned migration creates `relationship_type` with exactly `father`, `mother`, and `guardian`.
- [ ] A versioned migration creates `invitation_status` with exactly `pending`, `accepted`, `expired`, and `cancelled`.
- [ ] A versioned migration creates `invitation_delivery_status` with exactly `sent` and `failed`.
- [ ] `parent_children` has the specified foreign keys, indexed foreign-key columns, and unique `(parent_id, child_id)` constraint.
- [ ] `invitations` stores normalized email, code hash, encrypted ciphertext, seven-day expiration, business status, delivery status, and delivery metadata with the specified consistency constraints.
- [ ] A partial unique index rejects a second pending invitation for the same child and normalized email under concurrent requests.
- [ ] RLS and grants prevent anonymous, parent, inactive, and cross-daycare users from reading or mutating another daycare's invitation or relationship data.
- [ ] Only active same-daycare staff/admin users can initiate invitations, and archived children are rejected.
- [ ] The database never trusts client-supplied `role`, `status`, `daycare_id`, `invited_by`, or `expires_at` for parent signup or invitation authorization.
- [ ] Public parent signup derives `role = parent`, `status = pending`, and daycare from the valid invitation and active child.
- [ ] Invitation acceptance is one transaction with consistent lock ordering and cannot create duplicate relationships under concurrent requests.
- [ ] Repeating acceptance with the same authenticated parent and token succeeds idempotently without a second relationship.
- [ ] A mismatched email, different parent, expired token, failed delivery, cancelled token, or already accepted token cannot accept the invitation.
- [ ] A new parent becomes `active` only after confirmed email and successful acceptance.

### Invitation and email

- [ ] The child profile shows persisted accepted parents and pending invitations without client-only fake records.
- [ ] The modal supports name, email, `Mamá`, `Papá`, and `Tutor/a`, with `Mamá` initially selected and relationships mutually exclusive.
- [ ] A valid invitation is created only once, sends through server-side Resend, and closes the modal only after Resend succeeds.
- [ ] The generated five-character token is shown to staff after success and included in both the activation URL and the email.
- [ ] The email contains the invited parent name, child name, daycare, relationship, token, activation URL, and seven-day expiration in HTML and plain text.
- [ ] `RESEND_API_KEY` and `PARENT_INVITATION_CODE_KEY` never appear in client JavaScript, HTML, browser logs, or API responses.
- [ ] A pending duplicate email/child invitation is rejected without sending another email.
- [ ] An already-linked email/child pair is rejected without sending another email.
- [ ] A Resend failure leaves the same invitation `pending/failed`, preserves token and expiry, keeps the modal open, and shows a retry action.
- [ ] Retrying a failed invitation reuses the same row, token, expiration, and stable idempotency key.
- [ ] A failed invitation remains visible after reload with a profile retry action and no standalone resend/cancel controls.
- [ ] Close button, Escape, and overlay dismissal discard unsent form values and restore focus to `Vincular otro padre`.

### Activation and authentication

- [ ] `/activate?code=TOKEN` and manual token entry load the same safe invitation preview.
- [ ] The activation form shows the invited email as read-only and permits editing a nonblank display name.
- [ ] Invalid, expired, failed-delivery, cancelled, accepted, unavailable, and malformed tokens show generic errors without cross-daycare data leakage.
- [ ] A new parent signup requires the invitation email, password, and email confirmation; it creates a `parent/pending` profile.
- [ ] Supabase confirmation redirects through `/auth/callback` with PKCE and preserves the invitation token.
- [ ] `/auth/callback` exchanges the authorization code, verifies the confirmed session, accepts the invitation transactionally, signs out, and redirects to `/login?activation=success`.
- [ ] An existing parent can choose the explicit login branch, return to the invitation, and accept without creating another Auth or profile row.
- [ ] Both new and existing parent acceptance paths end at `/login?activation=success` with a visible success message.
- [ ] Activation does not grant a parent access to `/kids`; existing staff/admin route protection remains intact.
- [ ] Supabase email confirmation, PKCE, and the callback Redirect URL are documented as required configuration and verified in the environment used for browser testing.

### Quality and responsive behavior

- [ ] The profile and modal work for multiple persisted child UUIDs and have no horizontal overflow at a 375 px viewport.
- [ ] Desktop visual hierarchy remains consistent with `references/pantallas/vincular-padre.dc.html`.
- [ ] Browser verification reports no unexpected console errors or warnings during invitation, retry, activation, callback, login, and rejection flows.
- [ ] `npx tsc --noEmit` succeeds.
- [ ] `./node_modules/.bin/eslint app components utils proxy.ts` succeeds; any pre-existing reference-file lint failure is reported separately.
- [ ] `npm run build` succeeds.

## Decisions

- **Yes:** Implement one complete database-related spec. The invitation, email, Auth signup, confirmation callback, and relationship acceptance must share security and transaction invariants.
- **Yes:** Apply the model from `07-DB-Schema` with many-to-many `parent_children` relationships and persisted English enum values.
- **Yes:** Allow only active staff/admin users to invite parents for active children in their own daycare. This matches SPEC 10's child-management authorization.
- **No:** Allow invitations from archived children. Archived records are not active family-onboarding targets.
- **Yes:** Generate a random five-character token without ambiguous characters. It preserves the visual length of SPEC 05 while avoiding the fixed demo token.
- **No:** Keep `7K4P9`. It was a reference-only token and is not safe as a shared production code.
- **Yes:** Store a hash plus encrypted ciphertext. The hash protects validation if database data leaks, while ciphertext permits a server-only retry of the same email.
- **No:** Store the token only as plaintext. It would simplify retry but unnecessarily expose an activation credential in database contents.
- **Yes:** Use a separate delivery status. Business state remains `pending` when Resend fails, so the same invitation can be retried without a duplicate.
- **No:** Cancel and recreate on every delivery failure. That would multiply rows and tokens and complicate the user-visible state.
- **Yes:** Reject pending duplicate email/child invitations and already-accepted email/child links before sending.
- **Yes:** Use Resend server-side with configurable environment variables and verified sender configuration.
- **Yes:** Include both activation link and manual token in the email and show the token to staff after a successful send.
- **Yes:** Use Supabase Auth `signUp` with mandatory email confirmation for new parents. Auth remains the source of email and password truth.
- **Yes:** Create new parent profiles as `pending` and activate them only after confirmed email plus transactional acceptance.
- **Yes:** Support existing parent accounts through an explicit login branch instead of attempting a second signup.
- **Yes:** Add a dedicated PKCE callback route. It is the reliable server-side boundary for exchanging confirmation codes and preserving the invitation token.
- **Yes:** Make acceptance idempotent for the same parent and token. Repeated callbacks must not create duplicate relationships.
- **Yes:** Redirect every successful acceptance to `/login?activation=success`. The parent dashboard/feed is not implemented yet.
- **No:** Add a parent dashboard or feed in this spec. It requires its own product and data scope.
- **No:** Add cancellation or independent resend management. Retry is limited to the profile invitation flow for failed delivery.
- **No:** Trust `raw_user_meta_data` for role, status, or daycare. User-editable metadata cannot authorize privileges.
- **Yes:** Require Supabase email confirmation, PKCE, and the callback URL in Auth configuration. These are runtime prerequisites, not optional implementation details.

## Risks

| Risk | Mitigation |
| --- | --- |
| Database row is created but Resend fails | Keep `pending/failed`, preserve encrypted token and expiry, show retry, and never report success. |
| Resend accepts an email but the delivery update fails | Use a stable idempotency key, retry the same row, and document the 24-hour idempotency limit. |
| Five-character tokens are brute-forced | Use an unambiguous random alphabet, hash validation, single-use status, seven-day expiry, generic errors, and rate limiting at the server/provider boundary if available. |
| Encrypted token cannot be retried after key loss | Require `PARENT_INVITATION_CODE_KEY` to be managed as deployment secret and document that key rotation needs a migration strategy. |
| Client metadata escalates a parent to staff/admin or another daycare | Derive parent role, status, and daycare from the invitation in the trusted trigger/function; never authorize from user metadata. |
| RLS leaks emails or tokens to parents | Revoke direct invitation grants and expose only safe preview/function results; test anonymous, parent, inactive, and cross-daycare sessions. |
| Confirmation callback loses the invitation token | Carry the token in a separate `invite` parameter and validate it again server-side after `exchangeCodeForSession`. |
| Concurrent acceptance creates duplicate links | Lock invitation/profile rows consistently and enforce the unique parent-child constraint inside one transaction. |
| A parent account belongs to another daycare | Reject the acceptance without revealing the other account's tenancy details; multi-daycare membership is deferred. |
| There is no parent destination after login | Redirect to `/login?activation=success` with clear messaging until a parent dashboard is specified. |
| Resend idempotency does not guarantee exactly-once after 24 hours | Document the limit and defer durable delivery-attempt tracking and webhooks to a later spec. |

## What is **not** in this spec

- Parent dashboard, family feed, posts, summaries, or notification preferences.
- Invitation cancellation, relationship editing, revocation, or independent resend management.
- Resend webhooks or final delivery/bounce/complaint state.
- Staff/admin provisioning, password recovery, OAuth, social login, or MFA.
- Multi-daycare memberships.
- Invitations from archived children.
- Physical deletion of users, children, invitations, or relationships.
- Guaranteed exactly-once delivery beyond Resend's idempotency window.

Each excluded capability requires a future spec before implementation.

## Verification

### Configuration and dependencies

- Confirm `resend` is pinned in `package.json` and `package-lock.json`.
- Confirm `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`, optional `RESEND_REPLY_TO`, and `PARENT_INVITATION_CODE_KEY` are documented in `.env.template` without secret values.
- Confirm the Resend sender domain is verified.
- Confirm Supabase email confirmation is enabled, PKCE is active, and `${NEXT_PUBLIC_APP_URL}/auth/callback` is an allowed Redirect URL.

### Database and RLS

- Apply the versioned migration through the repository's approved migration workflow.
- Inspect enum values, columns, constraints, foreign keys, indexes, grants, RLS policies, function permissions, and trigger behavior with read-only catalog queries.
- Test same-daycare active staff/admin invitation creation and retry.
- Test rejection for anonymous users, parents, inactive users, cross-daycare children, archived children, malformed child IDs, duplicate pending invitations, and already-linked relationships.
- Test concurrent creation and acceptance requests to prove the partial unique index and parent-child uniqueness constraint.
- Verify failed delivery cannot be accepted and expired pending invitations become `expired` without leaking preview data.
- Verify signup cannot choose `role`, `status`, or `daycare_id` through metadata.
- Verify parent reads expose only their own accepted relationships and never invitation token material or unrelated daycare data.

### Resend and browser flows

- Use a controlled Resend test recipient or mock transport for success and failure paths; do not commit credentials or send uncontrolled messages.
- Verify success creates exactly one pending/sent invitation and displays the five-character token.
- Verify failure keeps pending/failed, leaves the modal open, and retry reuses the same ID, token, expiry, and idempotency key.
- Verify reload exposes a failed invitation card with a retry action and does not create a second row.
- Verify `/activate?code=TOKEN` and manual token entry, read-only email, editable name, and all invalid-token states at `1280 × 800` and `375 × 667`.
- Verify new signup, confirmation email, PKCE callback, idempotent acceptance, sign-out, and `/login?activation=success`.
- Verify existing-parent login and explicit acceptance without duplicate Auth/profile/link rows.
- Verify profile URL remains the UUID route and no obsolete `/kids/mateo-fernandez` or `/kids/.../link-parent` behavior returns.
- Verify browser console has zero unexpected errors or warnings and no secret appears in the DOM or network payloads.

### Commands

```bash
npx tsc --noEmit
./node_modules/.bin/eslint app components utils proxy.ts
npm run build
```

The repository's known lint issue in `references/pantallas/support.js` is unrelated and must be reported separately if `npm run lint` is run.
