# SPEC 04 — Add Kid Dialog

> **Status:** Approved
> **Depends on:** SPEC 02
> **Date:** 2026-08-14
> **Objective:** Replace the static new-child page with an accessible validated dialog that temporarily adds a child to the `/kids` directory.

## Scope

**In:**

- Change the `/kids` `Agregar niño` CTA from navigation to `/kids/new` into a control that opens a modal dialog.
- Build the dialog from `references/pantallas/agregar-nino.dc.html` while preserving the established OpenDayCare visual language and responsive behavior.
- Include `Nombre completo`, `Fecha de nacimiento`, and `Sala` as required fields.
- Retain `Alergias` and `Notas médicas` as optional visual fields.
- Provide a `Sala` selector with `Soles` and `Lunita` options.
- Format birth-date input as `DD/MM/AAAA` while the user types or pastes digits.
- On save, validate that the name is not blank, the room is selected, and the date is a real past calendar date in `DD/MM/AAAA` format.
- Display inline validation messages below invalid fields only after a save attempt and move focus to the first invalid field.
- Add a valid submission as a temporary card in the matching room section, update that section's count, and close and reset the dialog.
- Calculate the new card's age from its birth date and display `sin padres vinculados`.
- Keep the initial `SALA SOLES` section and create a `SALA LUNITA` section only after a child is added to Lunita.
- Support closing without saving through Cancelar, the close button, Escape, and an overlay click.
- Remove the obsolete `/kids/new` route.

**Out of scope (for future specs):**

- APIs, databases, server actions, authentication, and persistence across reloads.
- Editing or deleting a newly added child.
- Profiles, parent linking, allergies badges, or medical-note presentation for newly added children.
- Search or filter behavior.
- Additional room options beyond Soles and Lunita.

## Data model

The directory data becomes client-side state and resets to the eight reference children when `/kids` reloads.

```ts
type Room = "Soles" | "Lunita";

type AddedKid = {
  id: string;
  name: string;
  birthDate: string; // DD/MM/YYYY
  room: Room;
  allergies: string;
  medicalNotes: string;
  linkedParents: 0;
};

type AddKidForm = Omit<AddedKid, "id" | "linkedParents">;
```

## Implementation plan

1. Remove `app/kids/new/page.tsx` so the former standalone new-child route no longer resolves.
2. Convert the `/kids` directory interaction into a client-side component that owns the dialog visibility and temporary added-child state while retaining the eight static reference cards.
3. Replace the `Agregar niño` link with an accessible button that opens the dialog, moves focus into it, and restores focus to the trigger after closing.
4. Add the modal dialog structure with the referenced fields, optional allergy and medical-note controls, `Soles` and `Lunita` selector, Cancelar, close button, overlay, and Escape dismissal behavior.
5. Implement the birth-date mask for typed and pasted digits, preserving the `DD/MM/AAAA` format during editing.
6. Validate a save attempt, render inline errors below each invalid required field, focus the first invalid field, and reject dates that are malformed, impossible, current, or future.
7. On valid save, append the child to its selected room, derive the displayed age, update the room count, create the Lunita section when needed, and close and reset the dialog.
8. Verify dialog behavior at desktop and mobile widths, then run `npx tsc --noEmit`, `npx eslint app components`, and `npm run build`.

## Acceptance criteria

- [x] Clicking `Agregar niño` at `/kids` opens a modal dialog without changing the URL.
- [x] The dialog visually follows `references/pantallas/agregar-nino.dc.html` and remains usable without horizontal overflow at a 375 px viewport.
- [x] The dialog contains Nombre completo, Fecha de nacimiento, Sala, Alergias, and Notas médicas controls.
- [x] Nombre completo, Fecha de nacimiento, and Sala are required, while Alergias and Notas médicas do not block saving.
- [x] The Sala selector exposes exactly Soles and Lunita.
- [x] Typing or pasting birth-date digits formats the value as `DD/MM/AAAA`.
- [x] Attempting to save an incomplete or invalid form shows an inline message below every invalid required field and focuses the first invalid field.
- [x] A date such as `31/02/2024`, a current date, or a future date cannot be saved.
- [x] Saving valid values closes and clears the dialog, adds one card to the selected room, and updates that room's displayed count by one.
- [x] A saved child card shows the calculated age and `sin padres vinculados`.
- [x] Saving a child in Lunita creates a `SALA LUNITA` section with its own count.
- [x] Cancelar, the close button, Escape, and clicking the overlay close the dialog without adding a child.
- [x] Reloading `/kids` restores the original eight static children and removes children added during the prior session.
- [x] `/kids/new` returns HTTP 404.
- [x] `npx tsc --noEmit`, `npx eslint app components`, and `npm run build` succeed.

## Decisions

- **Yes:** Use a client-side modal on `/kids`. The requested trigger is the existing directory CTA and a dialog avoids a separate flow.
- **No:** Keep `/kids/new`. The standalone static form is replaced by the dialog and must no longer be reachable.
- **Yes:** Keep newly added children only in local component state. The requested interaction needs visible feedback without introducing persistence.
- **No:** Use APIs, a database, server actions, or browser storage. They exceed this interface-level feature.
- **Yes:** Enforce a real past birth date in addition to the input mask. A mask alone accepts impossible values.
- **No:** Use a native date input. The required `DD/MM/AAAA` masked text interaction is the specified experience.
- **Yes:** Show validation after save and focus the first invalid control. It avoids premature errors while making failed submission actionable.
- **Yes:** Offer Soles and Lunita. These are the confirmed room options.
- **Yes:** Group saved children by room and create Lunita only when it has a child. This preserves the reference directory while correctly representing the selected room.
- **Yes:** Keep medical fields optional and local. They match the supplied reference but do not alter the directory card.
- **Yes:** Support all standard close paths. Cancelar, close button, Escape, and overlay click make the dialog accessible and dismissible.

## Risks

| Risk | Mitigation |
| --- | --- |
| Date parsing varies by browser locale | Parse the `DD/MM/AAAA` parts explicitly and validate the reconstructed calendar date. |
| Dialog dismissal can leave stale values or focus behind | Reset form state after valid save and restore focus to the trigger after every close path. |
| Temporary state may appear persistent to users | Reset the directory to the reference data on reload and exclude persistence from scope. |

## What is **not** in this spec

- Persistent child management.
- Editing, deleting, or viewing a profile for a newly created child.
- Search behavior.
- Rooms other than Soles and Lunita.

Each excluded capability requires a future spec before implementation.

## Verification

**Date:** 2026-08-14

- **Next.js guidance:** Context7 confirms that interactive App Router components using state, effects, event handlers, and browser APIs must be behind a top-level `"use client"` boundary. `components/kids.tsx` uses that boundary.
- **Commands:** `npx tsc --noEmit`, `npx eslint app components`, and `npm run build` passed. `npm run lint` exits with 2 errors and 8 warnings only in the pre-existing excluded reference file `references/pantallas/support.js`; application lint passed.
- **Routes and runtime:** Playwright verified `/kids` at HTTP 200 and `/kids/new` at HTTP 404. The CTA retained `/kids` while opening an `aria-modal` dialog. The dialog exposed the five specified controls and exactly the `Soles` and `Lunita` options.
- **Form behavior:** Entering `01012020` produced `01/01/2020`. Invalid `31/02/2024` and current `14/08/2026` remained in the dialog with the inline date error and focus on the invalid input. A valid Lunita submission closed and reset the dialog, created `SALA LUNITA` with count 1, and displayed `Ana Pérez` as `6 años · sin padres vinculados`. Reloading restored 8 cards and removed the Lunita section.
- **Dismissal and console:** Cancelar, close button, Escape, and overlay click each closed the dialog without saving; focus returned to `Agregar niño` for Cancelar and Escape. The `/kids` browser console had 0 errors and 0 warnings. The only accumulated console error was the intentional `/kids/new` 404 request.
- **Visual checks:** Inspected `1280 × 800` and `375 × 667` viewports against `references/pantallas/agregar-nino.dc.html`. The modal retained its reference card hierarchy, palette, typography, fields, and responsive single-column layout; mobile document width was 360 px within a 375 px viewport. Artifacts: `.playwright-mcp/spec04-dialog-desktop.png` and `.playwright-mcp/spec04-dialog-mobile.png`.
