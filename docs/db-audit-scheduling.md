# Weekly Database Audit Scheduling

This runbook schedules the OpenDayCare read-only database security audit every Friday at 18:00.

## Important Command Detail

The project command is named `db-audit`, but the non-interactive OpenCode CLI does not expand `/db-audit` when it is passed as a positional message. The supported invocation is:

```bash
opencode run --command db-audit --dir "/path/to/06-open-daycare"
```

The reusable launcher in `scripts/db-audit.mjs` uses that form. It resolves the repository from its own location, handles paths with spaces, prevents overlapping executions, and returns a failure status for blocked or incomplete audits.

## Preconditions

1. Install Node.js. Node 24 is used by the active macOS plist; Node 22 or newer is recommended for other machines.
2. Install OpenCode and set `OPENCODE_BIN` when `opencode` is not on `PATH`.
3. Restart OpenCode after adding or changing `.opencode/commands/db-audit.md` so the command is loaded.
4. Complete the provider and Supabase MCP authentication flow for the same user that will run the scheduler. The project currently documents Supabase MCP authentication with `opencode2 mcp auth supabase`; verify that the exact `opencode` binary used by the scheduler can access the resulting credentials.
5. Run the launcher dry run before registering a scheduler:

   ```bash
   node scripts/db-audit.mjs --dry-run
   ```

The audit is read-only. It must not use `--auto`, service-role keys, database passwords, application secrets, or values from `.env` files.

## Schedule Summary

| Scheduler | Friday at 18:00 interpretation | Recommended use |
| --- | --- | --- |
| macOS `launchd` | Local macOS timezone | Active implementation for this Mac |
| macOS/Linux cron | Local host timezone | Simple fallback; `launchd` is preferred on macOS |
| Windows Task Scheduler | Local Windows timezone | Windows desktop or server |
| Supabase Cron | GMT/UTC unless converted | Trigger an external worker only |
| GitHub Actions | Explicit IANA timezone or UTC | Hosted CI, after non-interactive auth is designed |

## 1. System Cron on macOS/Linux

The cron expression for Friday at 18:00 is `0 18 * * 5`. Cron uses the host's local timezone unless the host configuration says otherwise.

Edit the user's crontab with `crontab -e` and adapt the absolute paths:

```cron
SHELL=/bin/sh
HOME=/Users/kevindiaz
PATH=/Users/kevindiaz/.nvm/versions/node/v24.16.0/bin:/Users/kevindiaz/.homebrew/bin:/usr/local/bin:/usr/bin:/bin

0 18 * * 5 /Users/kevindiaz/.nvm/versions/node/v24.16.0/bin/node "/Users/kevindiaz/Library/CloudStorage/OneDrive-WPPCloud/Escritorio/Proyectos Persoonales/DevTalles - OpenCode/06-open-daycare/scripts/db-audit.mjs" >> "/Users/kevindiaz/Library/Logs/OpenDayCare/db-audit.cron.log" 2>&1
```

On Linux, replace the macOS paths with paths on the Linux checkout and use the Node binary installed on that host. Create the log directory first and make sure the scheduled user owns it. Do not copy macOS OAuth files or the macOS `07-DB-Schema` directory to Linux without reviewing the authentication and reference setup.

On macOS, prefer the `launchd` option below because it integrates with per-user sessions and is the native scheduler.

## 1.1. Windows Task Scheduler GUI

Create a task in **Task Scheduler** with these values:

1. **General**: use the same user that owns the OpenCode credentials. Choose **Run only when user is logged on** unless a separately designed service account has non-interactive credentials. Use **Do not store password** only when that matches the chosen authentication model.
2. **Trigger**: begin a task on a schedule, **Weekly**, Friday, at **6:00 PM**.
3. **Action**: start a program.
   - Program: `C:\Program Files\nodejs\node.exe`
   - Arguments: `"C:\srv\open-daycare\scripts\db-audit.mjs"`
   - Start in: `C:\srv\open-daycare`
4. **Settings**: enable **Run task as soon as possible after a scheduled start is missed** and select **Do not start a new instance** when the task is already running.
5. Set `OPENCODE_BIN` in the user's environment when OpenCode is not available on `PATH`. Use an absolute native `opencode.exe` path rather than a shell-only `.cmd` shim when the Node launcher is run without a shell.

The repository path and Node path must be changed for the target Windows machine. Do not run the task as `SYSTEM` when the audit depends on a user's OpenCode or MCP credentials.

## 1.2. PowerShell Script and Scheduled Task

Save a wrapper such as `C:\srv\jobs\run-db-audit.ps1`:

```powershell
$ErrorActionPreference = 'Stop'

$repo = 'C:\srv\open-daycare'
$node = 'C:\Program Files\nodejs\node.exe'
$env:OPENCODE_BIN = 'C:\Program Files\OpenCode\opencode.exe'

Set-Location -LiteralPath $repo
& $node (Join-Path $repo 'scripts\db-audit.mjs')
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
```

Register the same schedule from PowerShell 7 or Windows PowerShell:

```powershell
$taskName = 'OpenDayCare DB Audit'
$repo = 'C:\srv\open-daycare'
$script = 'C:\srv\jobs\run-db-audit.ps1'
$pwsh = 'C:\Program Files\PowerShell\7\pwsh.exe'
$arguments = '-NoLogo -NoProfile -NonInteractive -File "{0}"' -f $script

$action = New-ScheduledTaskAction `
    -Execute $pwsh `
    -Argument $arguments `
    -WorkingDirectory $repo

$trigger = New-ScheduledTaskTrigger `
    -Weekly `
    -DaysOfWeek Friday `
    -At ([datetime]::Today.AddHours(18))

$settings = New-ScheduledTaskSettingsSet `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable

$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType InteractiveToken `
    -RunLevel Limited

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Force
```

Use `Get-ScheduledTask -TaskName 'OpenDayCare DB Audit'` and `Start-ScheduledTask -TaskName 'OpenDayCare DB Audit'` for inspection and an explicitly authorized manual test.

## 1.3. macOS `launchd` (Active Implementation)

The repository contains a machine-specific `LaunchAgent` at `ops/launchd/com.opendaycare.db-audit.plist`. It runs as the current user every Friday at 18:00 in the macOS local timezone, with no `RunAtLoad` or `KeepAlive` behavior.

Create the per-user directories and validate the plist:

```bash
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs/OpenDayCare"
chmod 700 "$HOME/Library/Logs/OpenDayCare"

plutil -lint \
  "/Users/kevindiaz/Library/CloudStorage/OneDrive-WPPCloud/Escritorio/Proyectos Persoonales/DevTalles - OpenCode/06-open-daycare/ops/launchd/com.opendaycare.db-audit.plist"
```

Install or update the agent for the logged-in user:

```bash
PLIST="$HOME/Library/LaunchAgents/com.opendaycare.db-audit.plist"
REPO="/Users/kevindiaz/Library/CloudStorage/OneDrive-WPPCloud/Escritorio/Proyectos Persoonales/DevTalles - OpenCode/06-open-daycare"

cp "$REPO/ops/launchd/com.opendaycare.db-audit.plist" "$PLIST"
launchctl bootout "gui/$(id -u)/com.opendaycare.db-audit" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl print "gui/$(id -u)/com.opendaycare.db-audit"
```

The `bootstrap` command loads the job but does not run it immediately. After the dry run and the read-only smoke audit have passed, a controlled manual execution can be requested with:

```bash
launchctl kickstart -k "gui/$(id -u)/com.opendaycare.db-audit"
```

Inspect the logs outside the repository:

```bash
less "$HOME/Library/Logs/OpenDayCare/db-audit.launchd.stdout.log"
less "$HOME/Library/Logs/OpenDayCare/db-audit.launchd.stderr.log"
```

Remove the active agent when it is no longer wanted:

```bash
launchctl bootout "gui/$(id -u)/com.opendaycare.db-audit"
rm "$HOME/Library/LaunchAgents/com.opendaycare.db-audit.plist"
```

If a process crashes, the launcher may leave an atomic lock in the system temporary directory. Confirm that no audit process is running before removing the lock directory shown by `node scripts/db-audit.mjs --dry-run`.

## 2. Supabase Cron (`pg_cron`)

Supabase Cron cannot execute a local `opencode` binary, access this checkout, or reuse the local OpenCode/MCP OAuth session. It can execute SQL or send an HTTP request through `pg_net`. Therefore it can only be a trigger for an external worker that owns the repository, OpenCode installation, provider credentials, and Supabase MCP authentication.

The following is illustrative only. Do not run it as-is and do not add it as a migration:

```sql
-- Supabase Cron expressions use GMT/UTC. This is 18:00 GMT on Friday.
select cron.schedule(
  'opendaycare-db-audit',
  '0 18 * * 5',
  $job$
    select net.http_post(
      url := 'https://worker.example.invalid/db-audit',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <secret-from-a-managed-secret-store>'
      ),
      body := jsonb_build_object('source', 'supabase-cron')
    );
  $job$
);
```

A real version requires `pg_cron`, `pg_net`, an authenticated and idempotent external endpoint, and secret retrieval through a managed mechanism such as Supabase Vault. Never place a real bearer token in a migration or committed SQL. If the desired time is a local IANA timezone, convert it to GMT with a DST-aware process or use a scheduler that supports an explicit timezone instead.

The external worker must acknowledge the HTTP request quickly, prevent duplicate runs, and execute the same launcher only after its own non-interactive authentication and checkout prerequisites are satisfied.

## 3. GitHub Actions

GitHub Actions can host the scheduler, but a clean hosted runner does not have the external `07-DB-Schema` reference, global OpenCode configuration, provider credentials, or Supabase MCP OAuth credentials from this workstation. The following is an example workflow, not an enabled file in this repository:

```yaml
name: OpenDayCare database audit

on:
  schedule:
    - cron: "0 18 * * 5"
      timezone: "<IANA_TIMEZONE>"
  workflow_dispatch:

concurrency:
  group: opendaycare-db-audit
  cancel-in-progress: false

permissions:
  contents: read

jobs:
  db-audit:
    runs-on: ubuntu-latest
    timeout-minutes: 120
    steps:
      - name: Check out the repository
        uses: actions/checkout@v5

      - name: Set up Node.js
        uses: actions/setup-node@v5
        with:
          node-version: "24.16.0"

      - name: Install the approved OpenCode version
        run: npm install --global opencode-ai@1.18.18

      - name: Validate the launcher
        run: node scripts/db-audit.mjs --dry-run

      - name: Run the read-only database audit
        run: node scripts/db-audit.mjs
        env:
          OPENCODE_DISABLE_AUTOUPDATE: "1"
          # Add only approved non-interactive provider/MCP configuration here.
```

Replace `<IANA_TIMEZONE>` with the intended fixed zone. Scheduled workflows run on the default branch and may be delayed during high GitHub Actions load. Pin action versions to reviewed commit SHAs in a production workflow. Do not run secret-bearing audits from pull requests created by forks, and do not put `.env`, service-role keys, database passwords, invitation keys, or MCP OAuth tokens in the repository.

Before enabling this option, design non-interactive authentication for both the model provider and Supabase MCP, package or recreate the external schema reference, and verify that the runner can access every required read-only tool without approval prompts.

## Failure and Security Behavior

- A missing credential or unavailable read-only tool must result in `BLOQUEADO` or `VERIFICACION_PARCIAL` and `AUTOMATION_RESULT: FAILURE`.
- The launcher does not pass `--auto` and never supplies database or service-role credentials.
- The lock is outside the OneDrive checkout and prevents overlapping runs. Treat a stale lock as a safety stop, inspect its owner metadata, and remove it only after confirming no audit is active.
- Logs can contain the audit report. Keep log directories private, rotate them according to the host policy, and do not publish raw logs as CI artifacts without a sensitive-data review.
- An audit finding is not itself a mutation. Any correction remains subject to the project's explicit edit and migration confirmation workflow.
