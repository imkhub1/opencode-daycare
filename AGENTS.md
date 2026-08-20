<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project

- This is a single Next.js 16.3 App Router application. `app/layout.tsx` is the root layout and `app/page.tsx` is the current feed entrypoint.
- `/login` uses Supabase email/password authentication. `/activate` handles parent invitation validation and account activation. `/auth/callback` exchanges Supabase Auth confirmation codes and completes invitation acceptance.
- `/` renders the teacher feed for Caro Gimenez in Sala Soles. Feed posts and the create-post dialog are currently client-side and are not persisted.
- `/kids` and its child routes provide the active and archived children directory for active `staff` and `admin` profiles. Server actions in `app/kids/` enforce the same authorization before database writes.
- Parent invitations are stored and prepared through Supabase database functions and delivered by Resend server actions in `app/kids/parent-invitations/`.
- Implement future OpenDayCare features from the source of truth in `references/pantallas/`, `references/screenshots/`, and the relevant spec in `specs/`.
- Tailwind CSS 4 is imported in `app/globals.css`; `@/*` maps to the repository root.

## Runtime and Environment

- `proxy.ts` refreshes Supabase Auth cookies and redirects unauthenticated requests to `/login`. The public routes are `/login`, `/activate`, and `/auth/callback`.
- Copy `.env.template` to `.env.local` for local development. Required runtime values include the Supabase URL and publishable key, Resend configuration, `PARENT_INVITATION_CODE_KEY`, and `NEXT_PUBLIC_APP_URL`.
- `SUPABASE_DB_PASSWORD` is for Supabase CLI operations only. Never expose it, a service-role key, or any other secret through a `NEXT_PUBLIC_*` variable.
- Reuse `utils/supabase/client.ts` in Client Components and `utils/supabase/server.ts` in Server Components, Server Actions, and Route Handlers. Keep session refresh in `proxy.ts` through `utils/supabase/middleware.ts`; do not create ad hoc clients or call the Data API directly.

## Commands

- Use npm and keep `package-lock.json` in sync. `npm ci` is the reproducible install command.
- `npm run dev` starts the development server.
- `npm run build` creates a production build and `npm run start` serves it.
- `npm run lint` runs ESLint. There is no test script.
- The current lint baseline fails only in `references/pantallas/support.js`: two errors and eight warnings from that generated support file. Application source files are clean.
- Run `npx tsc --noEmit` for TypeScript checking.
- The Supabase CLI is not a package dependency in this repository. Install it separately, run `supabase login`, then use `supabase link --project-ref buhfslxahextimvdfveh` for CLI workflows.

## Database and Supabase

- Versioned database changes belong in `supabase/migrations/`; database-related specs belong in `specs/database/`.
- The repository currently has migrations but no `supabase/config.toml`. Run `supabase init` before using CLI workflows that require local Supabase configuration, then link the workspace to project ref `buhfslxahextimvdfveh`.
- Use the `supabase` skill in `.agents/skills/supabase/` for every Supabase task, including MCP, Auth, Database, Storage, Realtime, Edge Functions, CLI, and `supabase-js` work.
- Before implementing a Supabase feature, review the current Supabase changelog and relevant documentation. Verify completed changes with an appropriate query, build, or request.
- Every schema, RLS, function, grant, or seed/data modification must be represented by a reviewed versioned migration and applied through the project-approved migration workflow, normally the Supabase MCP `apply_migration` tool. Do not use MCP `execute_sql` for persistent DDL or writes.
- Use `.agents/skills/supabase-postgres-best-practices/` before writing or modifying Postgres schemas, migrations, SQL queries, indexes, RLS policies, database functions, or performance-related database code.
- Preserve RLS on exposed tables. Never expose service-role or secret keys to the client. Follow the Supabase skill security guidance for Auth, Storage, views, and privileged functions.
- The project-local `opencode.json` configures the project-scoped remote Supabase MCP. Authenticate it with `opencode2 mcp auth supabase`; do not place a PAT in project configuration. CodeGraph and Context7 are supplied by the global OpenCode configuration.
- Skills are managed through `skills-lock.json` and belong only in `.agents/skills/`; do not create a project `.claude/` directory.

## OpenCode and CodeGraph

- `opencode.json` configures the local Playwright MCP and the Supabase MCP scoped to `buhfslxahextimvdfveh`.
- Keep Playwright artifacts in the gitignored `.playwright-mcp/` directory.
- `.codegraph/` is the generated local CodeGraph index. Use `codegraph status` to inspect it and `codegraph sync` after source changes; do not edit the index manually.
- `/spec` from `.agents/skills/spec/` is a manual, no-code workflow that clarifies a feature and writes a sequential `Draft` spec in `specs/`.
- `/spec-impl` from `.agents/skills/spec-impl/` only implements an `Approved` spec. It uses `specs/.spec-config.yml` to decide whether to create a `spec-NN-slug` branch, with `AutoCreateBranch: true` currently enabled, pauses after each implementation step, and never commits automatically.
- `spec-verifier` in `.opencode/agents/spec-verifier.md` verifies acceptance criteria using build tools, current Next.js guidance, Playwright browser evidence, and visual comparisons. It may edit only `specs/*.md`.

## Workflow

- Do not remove the generated `BEGIN:nextjs-agent-rules` block. Read the relevant local Next.js guide under `node_modules/next/dist/docs/` before changing Next.js-specific code and follow its deprecation notices.
- Validate route, auth, responsive, and visual work with the Playwright MCP when applicable.
- Never change application behavior based only on a screen reference when a relevant spec exists; update or implement the spec workflow first.

## Language

- Write repository artifacts in English; communicate with the user in Spanish.
