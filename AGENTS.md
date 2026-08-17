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
- Create every database-related spec under `specs/database/`, never directly under `specs/`.
- Do not remove the generated `BEGIN:nextjs-agent-rules` block; read the relevant local Next.js guide before changing Next.js-specific code.

## OpenCode

- `opencode.json` enables the local `playwright` MCP through `@playwright/mcp@latest`; use it for browser verification and store its artifacts in `.playwright-mcp/`.
- `/spec` (from `.agents/skills/spec/`) is a manual, no-code workflow that clarifies a feature and writes a sequential `Draft` spec in `specs/`.
- `/spec-impl` (from `.agents/skills/spec-impl/`) only implements an `Approved` spec. It uses `specs/.spec-config.yml` to decide whether to create a `spec-NN-slug` branch (default: `AutoCreateBranch: true`), pauses after each implementation step, and never commits automatically.
- `spec-verifier` (`.opencode/agents/spec-verifier.md`) is a custom primary agent responsible for verifying spec acceptance criteria against implementation using build tools, Context7 Next.js guidance, Playwright MCP browser testing, and visual screenshot comparisons. Its edit permissions are restricted to `specs/*.md`.

## Supabase

- The global OpenCode configuration at `~/.config/opencode/opencode.json` provides an authenticated `supabase` MCP server for project `buhfslxahextimvdfveh`, with account, database, debugging, development, functions, branching, storage, and docs features.
- Use the `supabase` skill in `.agents/skills/supabase/` for every Supabase task, including the MCP server, Auth, Database, Storage, Realtime, Edge Functions, CLI, and `supabase-js` integrations.
- Application code must interact with Supabase through the official `@supabase/supabase-js` and `@supabase/ssr` packages. Reuse `utils/supabase/client.ts` in Client Components and `utils/supabase/server.ts` in Server Components, Server Actions, and Route Handlers; keep session refresh in `proxy.ts` via `utils/supabase/middleware.ts` instead of creating ad hoc clients or calling the Data API directly.
- Before implementing a Supabase feature, review the current changelog and relevant documentation. Verify completed changes with an appropriate query, build, or request rather than assuming they worked.
- Every database modification, including schema, RLS, functions, grants, and seed/data changes, must be implemented in a versioned migration and applied with `apply_migration`. Never issue DDL or persistent writes through `execute_sql`; reserve it for read-only inspection and verification.
- Use `.agents/skills/supabase-postgres-best-practices/` before writing or modifying Postgres schemas, migrations, SQL queries, indexes, RLS policies, database functions, or performance-related database code.
- Preserve RLS on exposed tables, never expose service-role or secret keys to the client, and follow the security guidance in the Supabase skill for Auth, Storage, views, and privileged functions.
- Skills are managed through `skills-lock.json` and belong only in `.agents/skills/`; do not create a project `.claude/` directory.

## Language

- Write repository artifacts in English; communicate with the user in Spanish.
