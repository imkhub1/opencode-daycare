# SPEC 07 — Daycares table with RLS and seed data

> **Status:** Approved
> **Depends on:** None (first table in the schema)
> **Date:** 2026-07-08
> **Objective:** Create the `daycares` table with RLS, an address field, and seed data including "Guardería Sala Soles".

## Scope

**In:**

- Create the `daycares` table with columns: `id` (uuid PK), `name` (text), `address` (nullable text), `created_at` (timestamptz), and `updated_at` (timestamptz).
- Enable Row Level Security (RLS) on the table.
- Create basic RLS policies: public reads and restricted writes (prepared for future roles).
- Insert 4 seed daycares, including "Guardería Sala Soles".
- Apply it as a Supabase migration using the `apply_migration` pattern.

**Out of scope (for future specs):**

- Migrate the existing mocks (`app/_data/mock.ts`, `app/_data/kids.ts`) to real data.
- Create enums (`user_role`, `user_status`, etc.); these will be addressed in later specs.
- Related tables (`users`, `rooms`, `children`, etc.).
- UI for managing daycares (visual CRUD).

## Data model

```sql
CREATE TABLE daycares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE daycares ENABLE ROW LEVEL SECURITY;

-- Read policy: anyone can read (prepared for future auth)
CREATE POLICY "daycares_read" ON daycares
  FOR SELECT
  USING (true);

-- Write policy: restricted (will be adjusted when roles exist)
CREATE POLICY "daycares_insert" ON daycares
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "daycares_update" ON daycares
  FOR UPDATE
  USING (false);

CREATE POLICY "daycares_delete" ON daycares
  FOR DELETE
  USING (false);
```

Seed data:

```sql
INSERT INTO daycares (name, address) VALUES
  ('Guardería Sala Soles', 'Av. Principal 123, Centro'),
  ('Guardería Arcoíris', 'Calle Luna 456, Zona Norte'),
  ('Guardería Semillitas', 'Blvd. del Sol 789, Col. Jardines'),
  ('Guardería Estrellitas', 'Paseo de los Niños 321, Residencial');
```

## Implementation plan

1. Create the `001_create_daycares_table.sql` Supabase migration with:
    - The `daycares` table definition.
    - RLS enabled.
    - Read/write policies.
    - The 4 seed daycares.
2. Apply the migration with `apply_migration`.
3. Verify that the table exists with `list_tables` and confirm the seed data with `execute_sql`.

## Acceptance criteria

- [ ] The `daycares` table exists in the database with `id`, `name`, `address`, `created_at`, and `updated_at` columns.
- [ ] RLS is enabled on the `daycares` table.
- [ ] At least 4 rows exist in `daycares`, including "Guardería Sala Soles".
- [ ] The migration was applied without errors through `apply_migration`.
- [ ] The RLS policies allow SELECT and block INSERT/UPDATE/DELETE.

## Decisions

- **Yes:** Include the `address` field (nullable text) from the start. It will be useful for future daycare directory screens.
- **Yes:** Use restrictive RLS write policies (`false`). They will be adjusted when the role enums and `users` table exist.
- **No:** Migrate mocks now. The fictional data continues to work for UI development.
- **No:** Create enums in this migration. They will be created alongside the tables that need them (`users`, `invitations`, etc.).

## Risks

| Risk | Mitigation |
| --- | --- |
| Overly restrictive RLS policies block development | They can be temporarily disabled with `ALTER TABLE daycares DISABLE ROW LEVEL SECURITY` for local testing, or temporary policies can be created. |
| Seed data in the migration is not idempotent | Use `INSERT ... ON CONFLICT DO NOTHING` or check before inserting if it is re-run. |

## What is **not** in this spec

- Migrate mocks to real Supabase data.
- Create enums or related tables.
- UI for creating, editing, or deleting daycares.
- Integration with the existing screens.

Each of these, if needed, belongs in its own spec.
