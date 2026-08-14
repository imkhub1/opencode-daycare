# SPEC 02 — Kids Interfaces

> **Status:** Approved
> **Depends on:** SPEC 01
> **Date:** 2026-08-14
> **Objective:** Replace the children placeholder with static responsive interfaces for the `/kids` management flow based on the provided OpenDayCare references.

## Scope

**In:**

- Replace the `/ninos` navigation target with `/kids` throughout the OpenDayCare shared navigation.
- Render the static children directory at `/kids` from `references/pantallas/ninos.dc.html`.
- Render the static Mateo Fernández profile at `/kids/mateo-fernandez` from `references/pantallas/perfil-nino.dc.html`.
- Render static interfaces for adding and editing Mateo, linking a parent, and viewing Mateo's daily summary.
- Add these routes:
  - `/kids/new`
  - `/kids/mateo-fernandez/edit`
  - `/kids/mateo-fernandez/day-summary`
  - `/kids/mateo-fernandez/link-parent`
- Reuse the existing OpenDayCare visual language, sidebar, mobile navigation, fonts, palette, avatars, and inline SVG icons.
- Mark `Niños` as the active navigation item for every `/kids` screen.
- Preserve the existing mobile pattern by hiding the desktop sidebar, exposing the top menu, and stacking desktop columns.
- Use static reference content for the eight children, Mateo's profile, linked parents, forms, invitation code, and day summary.
- Make only Mateo's directory card navigable.
- Keep visual input controls, CTAs, search, selector pills, and forms non-persistent and without browser state changes.
- Remove the `/ninos` placeholder destination.

**Out of scope (for future specs):**

- Authentication, authorization, sessions, APIs, databases, server actions, and persistence.
- Creating, editing, filtering, deleting, or linking children and parents.
- Profiles for the seven children other than Mateo.
- Interactive search, form submission, invitation delivery, or summary selection.
- Redirecting `/ninos` to `/kids`.
- Completed publication-detail screens.
- Pixel-perfect comparison with the static references.

## Data model

The feature introduces no persisted data structures. Static presentation data is local to the children interface components.

```ts
type Kid = {
  id: "mateo-fernandez" | "sofia-mendez" | "benjamin-ruiz" | "valentina-soto" | "tomas-diaz" | "emma-castro" | "lucas-romero" | "olivia-vega";
  name: string;
  age: string;
  linkedParents: string;
  initial: string;
  avatarTone: string;
  badge?: string;
};

type LinkedParent = {
  name: string;
  relationship: "Mamá" | "Papá";
  status: "ACTIVA" | "PENDIENTE";
  statusDescription: string;
  initial: string;
  avatarTone: string;
};
```

The data remains static for the lifetime of each page and resets on reload.

## Implementation plan

1. Update `components/open-daycare.tsx` so shared navigation links to `/kids` instead of `/ninos` and can render `Niños` as the active section.
2. Remove the `ninos` destination from `app/[...placeholder]/page.tsx`, leaving `/ninos` unavailable.
3. Add `components/kids.tsx` with presentational components and static data for the directory cards, Mateo profile, child form, parent invitation, and daily summary.
4. Add `app/kids/page.tsx` with the responsive children directory, the eight reference cards, static search field, and `/kids/new` CTA.
5. Add `app/kids/mateo-fernandez/page.tsx` with Mateo's details, allergy note, linked parents, edit CTA, daily-summary CTA, and parent-link CTA.
6. Add `app/kids/new/page.tsx` and `app/kids/mateo-fernandez/edit/page.tsx` using the referenced static child form without submission behavior.
7. Add `app/kids/mateo-fernandez/link-parent/page.tsx` using the referenced static parent invitation interface without sending an invitation.
8. Add `app/kids/mateo-fernandez/day-summary/page.tsx` using the static Mateo summary, visual child selector, metric cards, mood card, and publication links.
9. Verify the `/kids` routes at desktop and mobile widths, then run `npx tsc --noEmit`, `npm run lint`, and `npm run build`.

## Acceptance criteria

- [x] Visiting `/kids` renders the Niños directory rather than the existing placeholder.
- [x] The directory shows exactly eight static cards from the reference under Sala Soles.
- [x] Only Mateo Fernández's card links to `/kids/mateo-fernandez`.
- [x] The other seven child cards are static and do not expose a navigation destination.
- [x] `/kids/mateo-fernandez` renders Mateo's identity, age, room, allergy note, dates, linked parents, and the three visible CTAs.
- [x] `/kids/new` and `/kids/mateo-fernandez/edit` render static child forms without saving data.
- [x] `/kids/mateo-fernandez/link-parent` renders the static invitation interface and code `7K4P9` without sending an invitation.
- [x] `/kids/mateo-fernandez/day-summary` renders Mateo's three reference metric cards, mood, and two highlighted moments.
- [x] Search, form fields, CTA buttons, invitation controls, and summary selector pills do not persist or alter displayed data.
- [ ] All `/kids` screens show `Niños` as the active shared navigation item.
- [ ] Desktop views retain the sidebar and mobile views use the existing top-menu pattern with stacked content.
- [x] `/ninos` no longer resolves as a placeholder route.
- [x] `npx tsc --noEmit` succeeds.
- [x] `npm run lint` reports no errors from application files, excluding the existing reference-file issue.
- [x] `npm run build` succeeds.

## Decisions

- **Yes:** Use `/kids` rather than `/ninos`. This is the requested public route name.
- **No:** Redirect `/ninos` to `/kids`. The obsolete placeholder route is removed instead.
- **Yes:** Include the directory, profile, add, edit, parent-link, and daily-summary interfaces. They are all directly connected by visible reference controls.
- **No:** Add real data mutations. The requested scope is interfaces and components only.
- **Yes:** Keep only Mateo navigable. Mateo is the only child with a supplied detailed profile reference.
- **No:** Reuse Mateo's profile for the other seven children. That would misrepresent their static cards.
- **Yes:** Keep all forms and controls visual only. This preserves the requested UI-only scope.
- **Yes:** Reuse the existing sidebar and mobile-navigation pattern. It preserves the visual system introduced by SPEC 01.
- **No:** Implement interactive mobile navigation beyond the existing pattern. No separate mobile reference was supplied.

## Risks

| Risk | Mitigation |
| --- | --- |
| Reference HTML uses static file links rather than App Router paths | Map each visible implemented destination to the confirmed `/kids` route structure. |
| The eight-child directory only supplies one detailed child profile | Keep the other cards non-navigable rather than inventing profile data. |
| Static form controls can imply working persistence | Keep all mutations out of scope and verify that controls do not alter data. |

## What is **not** in this spec

- Persistence or real child and parent management.
- Profiles for children other than Mateo.
- Search and form behavior.
- Parent invitation delivery.
- A `/ninos` compatibility route.
- Interactive daily-summary selection.

Each excluded capability requires a future spec before implementation.

## Verification

**Date:** 2026-08-14

- **Commands:** `npx tsc --noEmit` and `npm run build` passed. `npm run lint` reports 2 errors and 8 warnings only in excluded `references/pantallas/support.js`; `npx eslint app components` passed.
- **Routes:** `/kids`, `/kids/mateo-fernandez`, `/kids/new`, `/kids/mateo-fernandez/edit`, `/kids/mateo-fernandez/link-parent`, and `/kids/mateo-fernandez/day-summary` returned HTTP 200. `/ninos` returned HTTP 404.
- **Runtime:** At `/kids`, exactly one directory link targets `/kids/mateo-fernandez`; the only other main-content link targets `/kids/new`. Replacing Mateo's name in the edit form and reloading restored `Mateo Fernández`. Browser console reported 0 errors.
- **Visual checks:** Inspected desktop `1280 × 800` and mobile `375 × 667` viewports. Artifacts: `.playwright-mcp/spec02-kids-desktop-current.png`, `.playwright-mcp/spec02-kids-desktop-current.yml`, `.playwright-mcp/spec02-edit-current.yml`, and `.playwright-mcp/spec02-profile-mobile-current.png`.
- **Unchecked — shared navigation:** `/kids/new`, `/kids/mateo-fernandez/edit`, and `/kids/mateo-fernandez/link-parent` render standalone form shells without `Sidebar` or `MobileNavigation`, so they do not mark `Niños` active.
- **Unchecked — responsive shared shell:** Those same standalone form routes lack the required desktop sidebar and existing mobile top-menu pattern. The directory and Mateo profile do retain the sidebar on desktop and stack under the top menu on mobile.
