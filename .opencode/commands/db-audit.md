---
description: Run the OpenDayCare read-only database security audit
agent: db-security-auditor
subtask: true
---

Run the default OpenDayCare database security audit for the parent, child, and daycare isolation boundary.

This command is intended for unattended execution. Work only in read-only mode:

- Inspect the local repository, approved database specifications, migrations, the configured external schema reference, and read-only Supabase metadata.
- Do not edit files, create or apply migrations, execute SQL writes, change permissions, switch projects, delegate work, or request interactive approval.
- Do not read or print environment files, credentials, tokens, private keys, ciphertexts, hashes, emails, or parent/child records.
- If authentication is unavailable or required evidence would need an approval, report `BLOQUEADO` or `VERIFICACION_PARCIAL` and stop safely.
- Keep the required Spanish audit report structure from the `db-security-auditor` agent and distinguish local evidence, remote metadata, inferred risks, and unverifiable behavior.
- Return the complete audit report from the subtask instead of replacing it with a high-level summary.

The final line must be exactly one of these markers:

- `AUTOMATION_RESULT: SUCCESS` only when the audit completed with its required evidence and report.
- `AUTOMATION_RESULT: FAILURE` when the audit is blocked, partial, interrupted, or otherwise failed.
