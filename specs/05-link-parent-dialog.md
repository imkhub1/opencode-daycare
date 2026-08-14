# SPEC 05 — Link Parent Dialog

> **Status:** Implemented
> **Depends on:** SPEC 02
> **Date:** 2026-08-14
> **Objective:** Replace Mateo's standalone parent invitation page with a validated modal that temporarily adds a pending linked parent from his profile.

## Scope

**In:**

- Replace the `Vincular otro padre` navigation on `/kids/mateo-fernandez` with a control that opens a modal without changing the URL.
- Build the modal from `references/pantallas/vincular-padre.dc.html` while preserving the established OpenDayCare visual language and responsive behavior.
- Display Mateo Fernández in the modal header and the static invitation code `7K4P9` with its seven-day expiration copy.
- Include required `Nombre del padre/madre` and `Email` fields.
- Include mutually exclusive `Mamá`, `Papá`, and `Tutor/a` relationship controls with `Mamá` preselected.
- Validate that the name is not blank and the email has a valid format after an invitation attempt.
- Render inline validation messages and focus the first invalid field after a failed invitation attempt.
- On valid submission, close and reset the modal and append the submitted parent to Mateo's linked-parent list as `PENDIENTE` with `invitación enviada` copy.
- Support dismissing without inviting through the close button, Escape, and an overlay click.
- Remove the obsolete `/kids/mateo-fernandez/link-parent` route.

**Out of scope (for future specs):**

- Parent profiles for children other than Mateo.
- Email delivery, invitation-code generation, account activation, authentication, APIs, databases, server actions, and persistence across reloads.
- Duplicate-email prevention.
- Editing, revoking, resending, or activating parent invitations.

## Data model

The linked-parent list becomes client-side state for the Mateo profile and resets to Lucía and Diego when the page reloads.

```ts
type ParentRelationship = "Mamá" | "Papá" | "Tutor/a";

type LinkedParent = {
  id: string;
  name: string;
  email: string;
  relationship: ParentRelationship;
  status: "ACTIVA" | "PENDIENTE";
};

type ParentInvitationForm = {
  name: string;
  email: string;
  relationship: ParentRelationship;
};
```

## Implementation plan

1. Remove `app/kids/mateo-fernandez/link-parent/page.tsx` so the former standalone invitation route no longer resolves.
2. Convert `MateoProfile` in `components/kids.tsx` into a client-side interactive component that owns the modal visibility, invitation form, validation errors, linked-parent list, and return-focus reference.
3. Replace the parent-link `Link` with an accessible button that opens the dialog, focuses the name field, and retains `/kids/mateo-fernandez` as the current URL.
4. Add the responsive modal overlay and reference-based header, notice, two inputs, static `7K4P9` code panel, and invitation CTA.
5. Add mutually exclusive relationship controls with `Mamá` selected when the dialog opens, plus close-button, Escape, and overlay dismissal that discard form values and restore focus to the trigger.
6. Validate the required name and email format on submit, show inline errors below invalid fields, and focus the first invalid field.
7. On valid submission, append a temporary pending parent card with the selected relationship and `invitación enviada` description, then close and reset the dialog.
8. Verify the modal at desktop and mobile widths, then run `npx tsc --noEmit`, `npx eslint app components`, and `npm run build`.

## Acceptance criteria

- [x] Clicking `Vincular otro padre` on `/kids/mateo-fernandez` opens an `aria-modal` dialog without changing the URL.
- [x] The dialog follows `references/pantallas/vincular-padre.dc.html`, identifies Mateo Fernández, displays code `7K4P9`, and has no horizontal overflow at a 375 px viewport.
- [x] The dialog exposes required name and email inputs and relationship controls labeled Mamá, Papá, and Tutor/a.
- [x] Mamá is selected when the dialog opens, and choosing a relationship selects only that option.
- [x] Attempting to send with a blank name or malformed email displays an inline message for every invalid field and focuses the first invalid field.
- [x] A valid submission closes and clears the dialog and appends one parent to Mateo's list with the supplied name, selected relationship, `invitación enviada` copy, and `PENDIENTE` status.
- [x] The close button, Escape, and overlay click close the dialog without adding a parent, discard form values, and restore focus to `Vincular otro padre`.
- [x] Reloading `/kids/mateo-fernandez` restores the two original parent cards and removes parents added during the prior session.
- [x] `/kids/mateo-fernandez/link-parent` returns HTTP 404.
- [x] `npx tsc --noEmit`, `npx eslint app components`, and `npm run build` succeed.

## Decisions

- **Yes:** Limit the feature to Mateo. Mateo is the only implemented child profile.
- **No:** Build profiles for the other children. Their directory cards do not have profile data or routes.
- **Yes:** Use a client-side modal on Mateo's profile. The requested trigger belongs in that profile and should not navigate away.
- **No:** Retain `/kids/mateo-fernandez/link-parent`. The modal replaces the standalone invitation flow.
- **Yes:** Add successful invitations to temporary client state. It provides visible submission feedback without introducing backend infrastructure.
- **No:** Persist invitations, deliver email, or generate invitation codes. Those behaviors exceed this interface feature.
- **Yes:** Keep `7K4P9` static. It matches the supplied reference.
- **Yes:** Validate required name and email fields after submission. It makes the form actionable without premature errors.
- **Yes:** Preselect Mamá. This is the state shown by the supplied reference.
- **No:** Block duplicate email addresses. The initial static parent records have no email identity and no uniqueness rule was requested.
- **Yes:** Support close button, Escape, and overlay dismissal. They make the dialog dismissible without submitting data.

## Risks

| Risk | Mitigation |
| --- | --- |
| A temporary pending parent can appear durable | Reset the linked-parent list to the two reference records on reload and exclude persistence from scope. |
| Dialog dismissal can retain stale input or lose focus | Reset the form after every close path and return focus to the trigger. |
| A visual reference designed as a page may overflow as a modal | Constrain the dialog height, allow internal vertical scrolling, and verify a 375 px viewport. |

## What is **not** in this spec

- Persistent parent management or invitation delivery.
- Parent profiles for other children.
- Duplicate-email handling.
- Editing, revoking, resending, or activating invitations.

Each excluded capability requires a future spec before implementation.

## Verification

**Date:** 2026-08-14

- **Next.js guidance:** Context7 and the local Next.js 16 documentation require the top-level `"use client"` boundary for state, event handlers, effects, and browser APIs. `components/kids.tsx` already provides that boundary for this interactive modal.
- **Commands:** `npx tsc --noEmit`, `npx eslint app components`, and `npm run build` passed. `npm run lint` still exits with 2 errors and 8 warnings only in the pre-existing excluded reference file `references/pantallas/support.js`; application lint passed.
- **Routes and controls:** Playwright verified `/kids/mateo-fernandez` at HTTP 200. The trigger retained its URL while opening a focused `aria-modal` dialog with Mateo, `7K4P9`, the two fields, and the three relationship controls. Mamá was initially pressed; selecting Papá made it the only pressed relationship. `/kids/mateo-fernandez/link-parent` returned HTTP 404.
- **Submission and reset:** A valid Tutor/a invitation for `Ana Pérez` (`ana@example.com`) closed the dialog, returned focus to the trigger, and added `Ana Pérez`, `Tutor/a · invitación enviada`, and `PENDIENTE`. Reloading restored only Lucía and Diego. The close button, Escape, and a real overlay click closed the dialog; close-button and Escape checks confirmed focus restoration and cleared inputs.
- **Validation correction:** The parent-invitation form now uses `noValidate` so the component's validator runs for malformed emails. Blank submission displays both inline errors and focuses the name field; submitting a nonempty name with `correo-invalido` displays `Ingresa un email válido.` and focuses the email field.
- **Visual and runtime:** Inspected `1280 × 800` and `375 × 667` against `references/pantallas/vincular-padre.dc.html`. The modal preserves the reference hierarchy, palette, typography, notice, relationship pills, invitation-code panel, and CTA. At mobile width, the document measured 360 px within a 375 px viewport; the modal uses vertical internal scrolling. Browser console had 0 application errors or warnings; the only accumulated error was the intentional direct 404 route request. Artifacts: `.playwright-mcp/spec05-verification-desktop.png` and `.playwright-mcp/spec05-verification-mobile.png`.
