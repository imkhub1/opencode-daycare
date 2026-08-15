# SPEC 06 — Create Post Dialog

> **Status:** Approved
> **Depends on:** SPEC 01
> **Date:** 2026-08-14
> **Objective:** Replace the feed's new-post navigation with an accessible modal that temporarily adds a publication with drag-and-drop photos.

## Scope

**In:**

- Replace the desktop `+ Nueva publicación` sidebar link on `/` with a control that opens a modal without changing the URL.
- Add an equivalent `Nueva publicación` trigger to the mobile navigation that opens the same modal.
- Build the modal from `references/pantallas/crear-publicacion.dc.html` while preserving the OpenDayCare visual language and responsive behavior.
- Start every modal session with no selected audience, type, description, or photos.
- Provide hardcoded audience controls for Mateo, Sofía, Benjamín, and `Toda la sala`.
- Allow selecting multiple children or `Toda la sala`, with `Toda la sala` mutually exclusive with individual children.
- Provide mutually exclusive post-type controls for Comida, Siesta, Actividad, Logro, Ánimo, Foto, and Anuncio.
- Require an audience, a type, and a non-blank description before publishing.
- Add up to six JPEG, PNG, WebP, or GIF images of at most 10 MB each through the file picker or drag and drop.
- Preview selected photos, allow removing each photo before publishing, and show inline errors for rejected files or an exceeded photo limit.
- Append a valid publication to the feed in client-side state, including its selected type, audience copy, description, and a photo-preview grid.
- Render child audiences as `Para: familias de Mateo y Sofía` and the room audience as `Para: toda la sala`.
- Reset temporary publications to the three reference posts when the page reloads.
- Support dismissal through Cancelar, Escape, and clicking the overlay, discarding the current form and returning focus to the trigger.

**Out of scope (for future specs):**

- APIs, databases, server actions, authentication, and persistence across reloads.
- Publishing from the existing `Compartí un momento...` feed card or any other existing route.
- Editing, deleting, reactions, comments, or detail pages for newly published posts.
- Image upload to remote storage, image transformations, or file retry behavior.
- Additional children, rooms, post types, audience search, and scheduling or drafts.

## Data model

The feed becomes client-side state and resets to the three reference posts when `/` reloads.

```ts
type AudienceChild = "Mateo" | "Sofía" | "Benjamín";
type PostType = "COMIDA" | "SIESTA" | "ACTIVIDAD" | "LOGRO" | "ÁNIMO" | "FOTO" | "ANUNCIO";

type PostPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

type CreatePostForm = {
  children: AudienceChild[];
  wholeRoom: boolean;
  type: PostType | null;
  description: string;
  photos: PostPhoto[];
};

type FeedPost = {
  id: string;
  type: PostType;
  time: string;
  audience: string;
  body: string;
  reactions: number;
  comments: number;
  photos?: PostPhoto[];
};
```

## Implementation plan

1. Convert the home feed in `app/page.tsx` into the client-side owner of modal visibility, temporary feed posts, the create-post form, validation errors, and trigger-focus references.
2. Update `components/open-daycare.tsx` so the desktop sidebar and mobile navigation receive callbacks and render accessible `Nueva publicación` buttons instead of navigation links.
3. Add the responsive dialog overlay, reference-based header, audience controls, type controls, description field, Cancelar action, and Publicar action to the home feed.
4. Implement audience and type selection, including the exclusivity of `Toda la sala` and a single selected type.
5. Implement the hidden file input, drop zone, accepted image and 10 MB validation, six-photo limit, local preview URLs, and removable previews.
6. Validate a publish attempt, display inline errors under invalid controls, focus the first invalid control, and prevent publication until valid.
7. On valid publication, construct the audience copy, append the new feed card with its image grid, revoke discarded preview URLs, close and reset the dialog, and restore focus to the trigger.
8. Verify the dialog and drag-and-drop interaction at desktop and mobile widths, then run `npx tsc --noEmit`, `npx eslint app components`, and `npm run build`.

## Acceptance criteria

- [ ] Clicking the desktop `+ Nueva publicación` control on `/` opens an `aria-modal` dialog without changing the URL.
- [ ] A visible mobile `Nueva publicación` control opens the same dialog at a 375 px viewport.
- [ ] The modal follows `references/pantallas/crear-publicacion.dc.html` and has no horizontal document overflow at a 375 px viewport.
- [ ] Opening the modal shows no selected audience, post type, description, or photos.
- [ ] Mateo, Sofía, and Benjamín can be selected together, while selecting `Toda la sala` clears and excludes child selections.
- [ ] The modal exposes exactly Comida, Siesta, Actividad, Logro, Ánimo, Foto, and Anuncio types, and only one can be selected at a time.
- [ ] Publishing without an audience, type, or non-blank description shows inline errors and focuses the first invalid control.
- [ ] Clicking the photo control or dropping images adds valid JPEG, PNG, WebP, or GIF files of 10 MB or less as previews.
- [ ] The modal accepts at most six photos, allows each selected photo to be removed, and displays inline errors for invalid files, oversized files, or selections over the limit.
- [ ] A valid publication closes and resets the modal, then adds exactly one feed card containing its chosen type, audience copy, description, and selected photo previews.
- [ ] Multiple child recipients render as `Para: familias de Mateo y Sofía`, while the room recipient renders as `Para: toda la sala`.
- [ ] Reloading `/` restores only the three reference posts and removes all temporarily published posts.
- [ ] Cancelar, Escape, and an overlay click close the dialog without publishing, discard selected values and previews, and restore focus to the invoking trigger.
- [ ] `npx tsc --noEmit`, `npx eslint app components`, and `npm run build` succeed.

## Decisions

- **Yes:** Open the modal only from `Nueva publicación`. The existing `Compartí un momento...` card is explicitly excluded.
- **Yes:** Add an equivalent mobile trigger. The desktop sidebar CTA is hidden on small viewports and mobile users need the same entry point.
- **Yes:** Keep publications in component state. It shows the requested result without backend infrastructure and resets on reload.
- **No:** Use APIs, a database, server actions, or browser storage. They exceed this interface-level feature.
- **Yes:** Start with an empty form. The reference supplies visual content, not a required initial publishing state.
- **Yes:** Allow many individual children or the entire room. This supports targeted and broadcast posts while preventing an ambiguous mixed audience.
- **Yes:** Require audience, type, and description. A publication needs a recipient, category, and meaningful content.
- **Yes:** Use file picker and drag and drop. Both are requested paths to the same local photo list.
- **Yes:** Accept JPEG, PNG, WebP, and GIF files up to 10 MB each with a six-photo cap. These are common browser-previewable image formats with bounded local memory use.
- **No:** Persist files or upload them remotely. Object URLs are sufficient for temporary feed previews.
- **Yes:** Show errors inline and focus the first invalid field. This matches the existing dialog validation pattern and makes failures actionable.
- **Yes:** Support Cancelar, Escape, and overlay dismissal. They provide accessible non-submission paths.

## Risks

| Risk | Mitigation |
| --- | --- |
| Local photo previews consume memory | Limit selection to six 10 MB images and revoke discarded object URLs. |
| Drag events can leave the drop area visually active | Reset drag state on drop and drag leave events. |
| The reference page content can exceed a small modal viewport | Constrain dialog height, provide internal vertical scrolling, and verify at 375 px width. |
| Temporary posts or images can appear durable | Reset feed state on reload and exclude persistence from scope. |

## What is **not** in this spec

- Publishing from `Compartí un momento...`.
- Persistent posts or image storage.
- Editing, deletion, reactions, comments, or scheduling for newly created posts.
- Any audience beyond the three hardcoded children and the whole room.

Each excluded capability requires a future spec before implementation.
