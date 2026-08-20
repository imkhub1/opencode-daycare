#!/usr/bin/env node

import { access, mkdir, rmdir, unlink, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repositoryPath = path.resolve(path.dirname(scriptPath), "..");
const configPath = path.join(repositoryPath, "opencode.json");
const commandPath = path.join(repositoryPath, ".opencode", "commands", "db-audit.md");
const lockPath = path.resolve(
  process.env.OPENDAYCARE_AUDIT_LOCK ?? path.join(os.tmpdir(), "opendaycare-db-audit.lock"),
);
const timeoutMs = Number.parseInt(process.env.OPENDAYCARE_AUDIT_TIMEOUT_MS ?? "7200000", 10);
const successMarker = "AUTOMATION_RESULT: SUCCESS";
const failureMarker = "AUTOMATION_RESULT: FAILURE";
const outputLimit = 1024 * 1024;

function fail(message) {
  throw new Error(message);
}

function parseArguments() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const unexpected = args.filter((arg) => arg !== "--dry-run");

  if (unexpected.length > 0) {
    fail(`Unknown argument: ${unexpected.join(", ")}`);
  }

  return { dryRun };
}

async function assertReadable(filePath, label) {
  try {
    await access(filePath, constants.F_OK | constants.R_OK);
  } catch {
    fail(`${label} is not readable: ${filePath}`);
  }
}

async function resolveExecutable(command) {
  const candidates = [];

  if (path.isAbsolute(command) || command.includes(path.sep)) {
    candidates.push(command);
  } else {
    for (const directory of (process.env.PATH ?? "").split(path.delimiter)) {
      if (!directory) continue;
      candidates.push(path.join(directory, command));

      if (process.platform === "win32") {
        candidates.push(path.join(directory, `${command}.exe`));
      }
    }
  }

  for (const candidate of candidates) {
    try {
      await access(candidate, constants.F_OK | constants.X_OK);
      return path.resolve(candidate);
    } catch {
      // Try the next PATH entry.
    }
  }

  fail(`OpenCode executable was not found: ${command}`);
}

function localTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || process.env.TZ || "unknown";
}

function commandArguments() {
  return ["run", "--command", "db-audit", "--dir", repositoryPath];
}

async function validate(opencodeCommand) {
  await assertReadable(repositoryPath, "Repository");
  await assertReadable(configPath, "OpenCode project configuration");
  await assertReadable(commandPath, "OpenCode db-audit command");
  await assertReadable(path.join(repositoryPath, "AGENTS.md"), "Project instructions");
  await assertReadable(opencodeCommand, "OpenCode executable");

  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    fail("OPENDAYCARE_AUDIT_TIMEOUT_MS must be a positive integer");
  }
}

async function acquireLock() {
  if (path.dirname(lockPath) === repositoryPath || lockPath.startsWith(`${repositoryPath}${path.sep}`)) {
    fail("The audit lock must be outside the repository");
  }

  try {
    await mkdir(lockPath, { mode: 0o700 });
  } catch (error) {
    if (error?.code === "EEXIST") {
      console.error(`An OpenDayCare database audit is already running: ${lockPath}`);
      console.log("AUTOMATION_RESULT: SKIPPED");
      return false;
    }

    throw error;
  }

  await writeFile(
    path.join(lockPath, "owner.json"),
    `${JSON.stringify(
      {
        pid: process.pid,
        startedAt: new Date().toISOString(),
        repositoryPath,
      },
      null,
    )}\n`,
    { mode: 0o600 },
  );

  return true;
}

async function releaseLock() {
  try {
    await unlink(path.join(lockPath, "owner.json"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  try {
    await rmdir(lockPath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function preparedEnvironment(opencodeCommand) {
  const pathEntries = [
    path.dirname(opencodeCommand),
    path.dirname(process.execPath),
    process.env.PATH,
  ].filter(Boolean);

  return {
    ...process.env,
    HOME: process.env.HOME || os.homedir(),
    PATH: [...new Set(pathEntries.join(path.delimiter).split(path.delimiter))].join(path.delimiter),
    OPENCODE_DISABLE_AUTOUPDATE: "1",
  };
}

function runOpenCode(opencodeCommand) {
  const child = spawn(opencodeCommand, commandArguments(), {
    cwd: repositoryPath,
    env: preparedEnvironment(opencodeCommand),
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  let timedOut = false;
  let timeoutHandle;
  let killHandle;

  const forward = (stream, chunk) => {
    const text = chunk.toString();
    stream.write(text);
    output = `${output}${text}`.slice(-outputLimit);
  };

  child.stdout.on("data", (chunk) => forward(process.stdout, chunk));
  child.stderr.on("data", (chunk) => forward(process.stderr, chunk));

  const result = new Promise((resolve) => {
    child.once("error", (error) => resolve({ error }));
    child.once("close", (code, signal) => resolve({ code, signal }));
  });

  timeoutHandle = setTimeout(() => {
    timedOut = true;
    console.error(`OpenCode audit exceeded ${timeoutMs} ms; terminating it`);
    child.kill("SIGTERM");
    killHandle = setTimeout(() => child.kill("SIGKILL"), 5000);
  }, timeoutMs);

  return result.then((status) => {
    clearTimeout(timeoutHandle);
    if (killHandle) clearTimeout(killHandle);

    if (status.error) {
      throw status.error;
    }

    if (timedOut) {
      fail("The OpenCode audit timed out");
    }

    if (status.code !== 0) {
      fail(`OpenCode exited with code ${status.code ?? "unknown"}${status.signal ? ` (${status.signal})` : ""}`);
    }

    const successIndex = output.lastIndexOf(successMarker);
    const failureIndex = output.lastIndexOf(failureMarker);

    if (failureIndex > successIndex || successIndex === -1) {
      fail("The audit did not finish with AUTOMATION_RESULT: SUCCESS");
    }
  });
}

async function main() {
  const { dryRun } = parseArguments();
  const requestedCommand = process.env.OPENCODE_BIN || "opencode";
  const opencodeCommand = await resolveExecutable(requestedCommand);

  await validate(opencodeCommand);

  console.log(`OpenDayCare database audit timezone: ${localTimezone()}`);
  console.log(`Repository: ${repositoryPath}`);
  console.log(`OpenCode: ${opencodeCommand}`);
  console.log(`Arguments: ${JSON.stringify(commandArguments())}`);
  console.log(`Lock: ${lockPath}`);

  if (dryRun) {
    console.log("Dry run: no audit was started");
    return;
  }

  const lockAcquired = await acquireLock();
  if (!lockAcquired) return;

  try {
    await runOpenCode(opencodeCommand);
  } finally {
    await releaseLock();
  }
}

main().catch((error) => {
  console.error(`Database audit launcher failed: ${error.message}`);
  console.log(failureMarker);
  process.exitCode = 1;
});
