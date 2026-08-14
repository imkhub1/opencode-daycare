# SPEC 03 — Authentication Interfaces

> **Status:** Implemented
> **Depends on:** SPEC 01
> **Date:** 2026-08-14
> **Objective:** Add static responsive login and account-activation interfaces at `/login` and `/activate` based on the supplied OpenDayCare references.

## Scope

**In:**

- Add a static login interface at `/login` from `references/pantallas/login.dc.html`.
- Remove the Personal and Familia role selector from the login interface.
- Make the static login CTA navigate to the teacher feed at `/`.
- Add a static account-activation interface at `/activate` from `references/pantallas/activar-cuenta.dc.html`.
- Connect the visible secondary links between `/login` and `/activate`.
- Keep the account-activation CTA visual only, without a navigation destination.
- Reuse the existing OpenDayCare fonts, palette, inline sun icon, and Tailwind styling conventions.
- Adapt both interfaces for mobile widths; hide the coral promotional panel in the mobile login view.

**Out of scope (for future specs):**

- Authentication, authorization, sessions, and route protection.
- Credential verification, password recovery, validation messages, and form submission.
- APIs, databases, server actions, or persistence.
- Account activation behavior and a family feed destination.
- Consent storage or enforcement for child photos.
- Pixel-perfect comparison with the static references.

## Data model

This feature introduces no new data structures. The supplied email, invitation code, child, room, and consent copy are static presentation values that reset on reload.

## Implementation plan

1. Add a presentational authentication component under `components/` that reuses `Icon` from `components/open-daycare.tsx` for the sun mark and supplies the shared field treatment.
2. Add `app/login/page.tsx` with the desktop two-column login composition, static staff email, password field, visual password-recovery control, CTA to `/`, and secondary link to `/activate`.
3. Add `app/activate/page.tsx` with the static Mateo invitation card, invitation code, email and password fields, visual consent notice, inert activation CTA, and secondary link to `/login`.
4. Apply responsive classes so `/login` hides its promotional panel on narrow widths and both pages retain readable spacing and controls without horizontal overflow.
5. Verify the two routes in desktop and mobile viewports, then run `npx tsc --noEmit`, `npx eslint app components`, and `npm run build`.

## Acceptance criteria

- [x] `/login` returns HTTP 200 and displays the OpenDayCare login interface.
- [x] `/login` does not display Personal, Familia, or an `INGRESO COMO` selector.
- [x] The `/login` primary CTA navigates to `/`.
- [x] The `/login` secondary invitation link navigates to `/activate`.
- [x] `/activate` returns HTTP 200 and displays the static Mateo and Sala Soles invitation details with code `7K4P9`.
- [x] The `/activate` secondary login link navigates to `/login`.
- [x] The `/activate` primary CTA does not navigate or mutate displayed data.
- [x] Form controls, password recovery, and consent treatment do not validate, persist, call APIs, or create a session.
- [x] At a 375 px viewport, the `/login` promotional panel is hidden and neither route has horizontal overflow.
- [x] `npx tsc --noEmit` succeeds.
- [x] `npx eslint app components` succeeds.
- [x] `npm run build` succeeds.

## Decisions

- **Yes:** `/login` and `/activate` are the public App Router paths. They are concise and were explicitly confirmed.
- **No:** Personal and Familia role selection. The requested login design uses one undifferentiated entry point.
- **Yes:** Login navigates to `/`. The existing teacher feed is the only implemented destination.
- **No:** A family feed destination from activation. No family feed is in this scope.
- **Yes:** The activation CTA is inert. It preserves the supplied interface without inventing an unimplemented workflow.
- **Yes:** Secondary links connect the two supplied screens. They are the visible relationship declared by the references.
- **No:** Local interaction state or validation. The existing application specifications use static UI-only behavior.
- **Yes:** Responsive mobile adaptation. It prevents desktop-only composition from overflowing on narrow screens.
- **No:** Direct Google Fonts stylesheet tags. The root layout already loads Fredoka and Nunito through `next/font`.

## Risks

| Risk | Mitigation |
| --- | --- |
| Static form controls can imply working authentication | Keep CTAs and auxiliary controls explicitly non-mutating and exclude authentication from scope. |
| The login reference contains role behavior that is not wanted | Omit the selector and its role-specific routing entirely. |
| No mobile references were provided | Verify at 375 px and preserve the established responsive visual language. |

## What is **not** in this spec

- Real login, activation, password recovery, consent handling, or session management.
- A family feed or routing from activation to a family destination.
- API, database, server-action, persistence, or validation work.

Each excluded capability requires a future spec before implementation.

## Verification

**Date:** 2026-08-14

- **Commands:** `npx tsc --noEmit`, `npx eslint app components`, and `npm run build` passed. `npm run lint` exits with 2 errors and 8 warnings only in the pre-existing excluded reference file `references/pantallas/support.js`.
- **Routes and controls:** Playwright verified HTTP 200 at `/login` and `/activate`; `/login` contains no Personal, Familia, or `INGRESO COMO` text; its visible links target `/` and `/activate`; `/activate` shows `Mateo · Sala Soles` and `7K4P9`, its login link targets `/login`, and clicking its primary button retains `/activate`.
- **Static behavior:** Code inspection and runtime checks confirm server-rendered static controls with no client state, API call, session, validation, or persistence path.
- **Responsive/runtime:** Checked `1280 × 800` and `375 × 667`. At mobile width the login promotional panel is hidden, and document widths are 375 px at `/login` and 360 px at `/activate`, so neither overflows a 375 px viewport. Console: 0 errors and 0 warnings.
- **Artifacts:** Playwright snapshots and console logs are in `.playwright-mcp/`, including `page-2026-08-14T08-00-30-956Z.yml`, `page-2026-08-14T08-00-31-654Z.yml`, and `page-2026-08-14T08-00-32-817Z.yml`.
- **Visual-reference limitation:** No login or activation raster image exists under `references/screenshots/`; verification used the supplied HTML references and browser layout checks. Screenshot capture was not exposed by the available Playwright MCP tools.
