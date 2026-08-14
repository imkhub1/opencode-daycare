<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project

- Single Next.js 16 App Router app: `app/layout.tsx` is the root layout and `app/page.tsx` is the current entrypoint.
- Spec 01 (`01-teacher-feed-home`) is implemented: `/` renders the static teacher feed for Caro Giménez in Sala Soles, supported by presentational components in `components/open-daycare.tsx` and placeholder routes in `app/[...placeholder]/page.tsx`.
- Implement future OpenDayCare features from the static source of truth in `references/pantallas/` and `references/screenshots/`.
- Tailwind CSS 4 is imported in `app/globals.css`; `@/*` maps to the repository root.

## Commands

- Use npm: `package-lock.json` is committed.
- `npm run dev`, `npm run build`, and `npm run lint` are the available scripts; no test or typecheck script exists.
- Run `npx tsc --noEmit` for type checking. `npm run lint` currently fails only in `references/pantallas/support.js`; application files are clean.

## Workflow

- Keep Playwright artifacts in the gitignored `.playwright-mcp/` directory.
- Do not remove the generated `BEGIN:nextjs-agent-rules` block; read the relevant local Next.js guide before changing Next.js-specific code.

## OpenCode

- `opencode.json` enables the local `playwright` MCP through `@playwright/mcp@latest`; use it for browser verification and store its artifacts in `.playwright-mcp/`.
- `/spec` (from `.agents/skills/spec/`) is a manual, no-code workflow that clarifies a feature and writes a sequential `Draft` spec in `specs/`.
- `/spec-impl` (from `.agents/skills/spec-impl/`) only implements an `Approved` spec. It uses `specs/.spec-config.yml` to decide whether to create a `spec-NN-slug` branch (default: `AutoCreateBranch: true`), pauses after each implementation step, and never commits automatically.
- `spec-verifier` (`.opencode/agents/spec-verifier.md`) is a custom primary agent responsible for verifying spec acceptance criteria against implementation using build tools, Context7 Next.js guidance, Playwright MCP browser testing, and visual screenshot comparisons. Its edit permissions are restricted to `specs/*.md`.

## Language

- Write repository artifacts in English; communicate with the user in Spanish.
