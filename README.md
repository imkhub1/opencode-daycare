# OpenDayCare

OpenDayCare is a daycare communication platform for teachers, staff, and families. It includes authentication, parent invitation and activation flows, a teacher feed, and a staff directory for managing children.

This repository is part of an **OpenCode course by DevTalles**. The project is developed iteratively from the screen references and specifications in this repository.

## Current Scope

- `/login` authenticates users with Supabase Auth using email and password.
- `/activate` validates a parent invitation code and activates or links a parent account.
- `/` renders the teacher feed for Caro Gimenez in Sala Soles. Post creation is currently client-side and is not persisted.
- `/kids` provides the active and archived children directory for active staff and admin users.
- Staff users can create and update children and send, update, cancel, and resend parent invitations.
- Parent invitation emails are sent through Resend after the invitation is prepared by Supabase database functions.
- Placeholder routes and visual references remain available for future screens.

## Tech Stack

- [Next.js](https://nextjs.org/) 16.3 with the App Router
- [React](https://react.dev/) 19
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) 4
- [Supabase](https://supabase.com/) Auth, Postgres, and server-side functions through `@supabase/ssr` and `@supabase/supabase-js`
- [Resend](https://resend.com/) for parent invitation email delivery

## Prerequisites

- Node.js 20.9 or newer
- npm
- A Supabase account with access to the OpenDayCare organization and project
- The Supabase CLI for account login and project linking
- Docker Desktop only when running a local Supabase stack

Install the Supabase CLI on macOS with Homebrew:

```bash
brew install supabase/tap/supabase
supabase --version
```

See the [official Supabase CLI installation guide](https://supabase.com/docs/guides/local-development/cli/getting-started) for other platforms and installation methods.

## Application Setup

Install the locked dependencies, create the local environment file, and start Next.js:

```bash
npm ci
cp .env.template .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated requests are redirected to `/login` by `proxy.ts`.

Fill `.env.local` with values from the Supabase project and the email provider before using authenticated or invitation flows:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL used by browser and server clients. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key used by browser and server clients. |
| `RESEND_API_KEY` | Server-only Resend API key for invitation emails. |
| `RESEND_FROM_EMAIL` | Verified sender address for invitation emails. |
| `RESEND_REPLY_TO` | Optional reply-to address. |
| `PARENT_INVITATION_CODE_KEY` | 64 hexadecimal characters used to encrypt invitation tokens. Generate one with `openssl rand -hex 32`. |
| `NEXT_PUBLIC_APP_URL` | Public application origin used to build activation links, for example `http://localhost:3000` locally. |

`SUPABASE_DB_PASSWORD` is only for Supabase CLI operations. It is not used by the Next.js runtime and must not be exposed to the browser. Do not commit `.env.local` or any real credentials.

## Supabase CLI Authentication

The Supabase CLI login authenticates your personal Supabase account with a Personal Access Token (PAT). There is no separate CLI login for a team: access to an organization and its projects comes from your account membership and role. Every team member should authenticate with their own account and token rather than sharing credentials.

Run the login from the repository root:

```bash
supabase login --name opendaycare
```

When prompted, create or use a token from [Supabase Account Tokens](https://supabase.com/dashboard/account/tokens). The CLI stores the token in the system credential store when available. Never commit a PAT, put it in `.env.local`, or add it to `opencode.json`.

Verify that the account can see the expected organization and project:

```bash
supabase orgs list
supabase projects list
```

This repository uses project ref `buhfslxahextimvdfveh`. If it is not visible, ask an organization owner or administrator to add your Supabase account to the correct team or project.

The repository already contains migrations under `supabase/migrations`, but it does not currently contain `supabase/config.toml`. Initialize the CLI configuration once before linking the workspace:

```bash
supabase init
supabase link --project-ref buhfslxahextimvdfveh
```

`supabase link` may ask for the remote database password. Enter it interactively when needed, or provide it through the `SUPABASE_DB_PASSWORD` environment variable for an approved non-interactive workflow. Do not use the publishable key as the database password.

Use `supabase migration list --linked` to inspect migration history. Database changes for this project must be reviewed as versioned migration files before they are applied.

## OpenCode and Supabase MCP

OpenCode reads the project configuration from `opencode.json` when it is started from this repository. The project configuration contains:

- The local Playwright MCP, started with `npx -y @playwright/mcp@latest`.
- The official remote Supabase MCP at `https://mcp.supabase.com/mcp?project_ref=buhfslxahextimvdfveh`.
- The Supabase MCP is scoped to this project ref so it does not expose the rest of the account.

CodeGraph and Context7 are supplied by the global OpenCode configuration and are available in this project because OpenCode merges global and project configuration. The active MCP inventory should contain all four servers:

```bash
opencode2 mcp list
```

### Authenticate OpenCode with Supabase

OpenCode and the Supabase CLI use separate authentication mechanisms. The CLI uses a Supabase PAT; the Supabase MCP uses browser-based OAuth. Authenticate the MCP once from the repository root:

```bash
opencode2 mcp auth supabase
```

Complete the Supabase browser authorization for the organization that owns this project. If the browser does not open automatically, copy the URL printed by the command into a browser. Then verify the connection:

```bash
opencode2 mcp list
```

The expected result is `supabase connected`. OAuth credentials are stored outside the repository. Never put a Supabase PAT, OAuth token, service-role key, or database password in `opencode.json`.

If OpenCode was already running when `opencode.json` changed, start a new session from the repository root. If the server still shows as `pending`, restart the managed OpenCode service and verify again:

```bash
opencode2 service restart
opencode2 mcp list
```

### Keep OpenCode and Supabase in Sync

MCP authentication only connects OpenCode to Supabase; it does not synchronize the application schema automatically. Keep the following three layers aligned:

1. `opencode.json` registers the project-scoped Supabase MCP.
2. `supabase link --project-ref buhfslxahextimvdfveh` links the local Supabase CLI workspace to the hosted project.
3. `supabase/migrations/` contains the reviewed, versioned database history.

Use these checks after pulling changes or switching machines:

```bash
opencode2 mcp list
supabase migration list --linked
codegraph status
```

When application code changes, refresh the CodeGraph index with `codegraph sync`. When the database changes, add or review a migration, inspect the migration history, run the relevant Supabase advisors, and apply it through the project-approved Supabase MCP migration workflow. Do not use the MCP `execute_sql` tool for persistent schema changes.

## Tools Used in This Project

| Tool | Role |
| --- | --- |
| Next.js 16.3 | App Router runtime, server rendering, route handlers, server actions, and `proxy.ts`. |
| React 19 | Client components and interactive UI. |
| TypeScript | Static type checking with `npx tsc --noEmit`. |
| Tailwind CSS 4 | Application styling and responsive layouts. |
| Supabase Auth, Postgres, and SSR | Authentication, database access, RLS-backed data, and session cookies. |
| Supabase CLI | Account login, organization/project access checks, linking, and migration inspection. |
| Supabase MCP | OpenCode access to project documentation, schema inspection, advisors, and reviewed database migrations. |
| Resend | Parent invitation email delivery. |
| OpenCode | AI-assisted development environment and MCP orchestration. |
| Context7 MCP | Current library and framework documentation for implementation and verification. |
| CodeGraph | Local code index and symbol/call-graph exploration in `.codegraph/`. |
| Playwright MCP | Browser-based route, interaction, responsive, and visual verification. |
| ESLint | JavaScript, TypeScript, and Next.js linting. |
| Git | Source control and review of migrations and application changes. |

OpenCode skills are stored in `.agents/skills/`. The project uses the Supabase and Supabase Postgres best-practices skills for database work, plus the spec and spec-implementation workflows for feature planning and delivery. Playwright artifacts belong in the gitignored `.playwright-mcp/` directory.

Run `codegraph init` once if the local `.codegraph/` index does not exist.

## Available Commands

```bash
npm run dev       # Start the development server
npm run build     # Create a production build
npm run start     # Serve a production build
npm run lint      # Run ESLint
npx tsc --noEmit  # Run TypeScript checking
```

`npm run start` requires a successful `npm run build` first. The project currently has no automated test script.

The current `npm run lint` baseline reports two errors and eight warnings in `references/pantallas/support.js`, a generated reference support file. Application source files pass lint.

## References and Specifications

- `references/pantallas/` and `references/screenshots/` contain the visual source of truth for the course screens.
- `specs/` contains feature specifications.
- `specs/database/` contains database-related specifications and must be used for new database specs.
- `supabase/migrations/` contains versioned database changes.

## Course Context

This is an educational project created for practicing AI-assisted software development workflows with OpenCode. It is not a production-ready daycare management system.
