# SPEC 01 — Teacher Feed Home

> **Status:** Approved
> **Depends on:** None
> **Date:** 2026-08-13
> **Objective:** Replace the starter page with a static, responsive teacher feed visually close to the provided OpenDayCare reference and linked to local placeholder routes.

## Scope

**In:**

- Render the teacher feed for Caro Gimenez in Sala Soles at `/`.
- Reproduce the desktop reference structure from `references/pantallas/feed.dc.html` with a fixed sidebar, feed header, composer, section separator, and three publication cards.
- Use the reference's static copy for the room, teacher, children, date, post text, post types, audiences, times, reactions, and comment counts.
- Apply a visually close warm palette, Fredoka and Nunito typography, rounded cards, badges, avatars, and inline SVG icons.
- Provide desktop and mobile layouts.
- Hide the desktop sidebar on narrow viewports and provide a top menu that opens and closes the same navigation links.
- Link every visible control to a local route.
- Show a simple OpenDayCare placeholder page for destinations outside this feed, with its section name and a link back to `/`.

**Out of scope (for future specs):**

- Authentication, authorization, user sessions, and real sign-out behavior.
- Database access, APIs, persistence, or server actions.
- Creating, editing, deleting, reacting to, or commenting on publications.
- Real image upload or a real photo asset for the activity post.
- Full implementations of the linked children, announcements, account, publication, and photo screens.
- Pixel-perfect comparison with the static reference.

## Data model

The feature introduces no persisted data structures. Static presentation data is defined locally for the teacher, room, and the three posts.

```ts
type PostType = "achievement" | "activity" | "announcement";

type FeedPost = {
  id: "mateo-achievement" | "mateo-activity" | "room-announcement";
  type: PostType;
  author: string;
  time: string;
  audience: string;
  body: string;
  reactions: number;
  comments: number;
  photoLabel?: string;
};
```

The data is static for the lifetime of the page and resets on reload because no persistence is introduced.

## Implementation plan

1. Update `app/layout.tsx` with Spanish document metadata and the Fredoka and Nunito font variables used by OpenDayCare.
2. Replace the starter global theme in `app/globals.css` with the light OpenDayCare color tokens, typography defaults, body background, and shared focus styles.
3. Add presentational feed components under `components/` for the brand/avatar treatment, desktop sidebar, mobile navigation menu, composer, post type badge, publication card, and placeholder page shell.
4. Replace `app/page.tsx` with the static teacher feed using the exact three posts and visible content from `references/pantallas/feed.dc.html`.
5. Add placeholder route pages for `/crear-publicacion`, `/ninos`, `/avisos`, `/mi-cuenta`, `/publicaciones/mateo-logro`, `/publicaciones/mateo-actividad`, `/fotos/mateo-temperas`, and `/cerrar-sesion`.
6. Wire all visible logo, navigation, composer, publication action, photo, edit, and sign-out links to `/` or one of the declared local placeholder routes.
7. Verify the desktop and mobile views against `references/screenshots/feed.png`, then run type checking, application linting, and the production build.

## Acceptance criteria

- [ ] Visiting `/` shows the OpenDayCare teacher feed instead of the create-next-app starter content.
- [ ] The desktop view displays a 248 px fixed sidebar with the OpenDayCare brand, New publication CTA, four navigation items, and the Caro Gimenez session block.
- [ ] The main feed displays the Sala Soles header, the composer, the Published today separator, and exactly three static cards matching the reference content.
- [ ] The three cards show achievement, activity, and announcement badges with distinct reference-inspired colors.
- [ ] The activity card includes the static dashed photo placeholder labeled `Foto · pintando con témperas`.
- [ ] The application uses Fredoka for display text and Nunito for interface and body text.
- [ ] At narrow mobile widths, the desktop sidebar is hidden and a top menu exposes the same navigation links.
- [ ] Every visible navigation or action link resolves to `/` or a declared local route without a 404 response.
- [ ] Each non-feed route displays its section placeholder and a link back to `/`.
- [ ] No interaction writes data, calls an API, or requires a user session.
- [ ] `npx tsc --noEmit` succeeds.
- [ ] `npm run lint` reports no errors from application files; the existing `references/pantallas/support.js` error is excluded from this feature's validation.
- [ ] `npm run build` succeeds.

## Decisions

- **Yes:** Static local feed data. The project has neither authentication nor a database.
- **No:** Data persistence. No user action changes the feed in this scope.
- **Yes:** Local placeholder routes for every visible destination. This preserves navigational affordances without implementing unrelated screens.
- **No:** Full versions of linked screens. They require their own specifications and behavior definitions.
- **Yes:** A mobile top menu. Hiding the sidebar without replacement would make the local navigation inaccessible on small screens.
- **No:** Bottom navigation. A top menu keeps the mobile adaptation closer to the desktop information architecture.
- **Yes:** Visually close reproduction. The reference guides the design while allowing responsive and accessible implementation details.
- **No:** Pixel-perfect implementation. It would add unnecessary constraints to a static starter replacement.
- **Yes:** `next/font` font loading. It integrates the chosen Google font families into the existing Next.js layout.
- **No:** Direct Google Fonts stylesheet tag. Font loading belongs in the application layout rather than the static reference markup.

## Risks

| Risk | Mitigation |
| --- | --- |
| The desktop reference has no mobile design | Use the agreed hidden-sidebar and top-menu pattern, and manually inspect a narrow viewport. |
| Static reference anchors do not map directly to App Router paths | Declare every destination path in this spec and verify each route resolves locally. |
| The reference uses inline SVG assets only | Keep icons inline and decorative where appropriate so no unavailable image asset blocks the page. |

## What is **not** in this spec

- Authentication or user-specific rendering.
- Database-backed feed content or persistence.
- Interactive publication, reaction, comment, edit, or photo-upload flows.
- Completed children, announcements, account, detail, or photo pages.

Each excluded capability requires a future spec before implementation.
