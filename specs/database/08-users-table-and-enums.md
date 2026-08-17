# SPEC 08 — Users table with enums, RLS, and seed staff user

> **Status:** Implemented
> **Depends on:** Spec 07 (daycares table)
> **Date:** 2026-07-08
> **Objective:** Create the `user_role` and `user_status` enums, the `users` table with RLS, an `auth.users` trigger, and a test staff user.

## Scope

**In:**

- Create the `user_role` (`staff`, `parent`, `admin`) and `user_status` (`pending`, `active`) enums.
- Create the `users` table with the following columns: `id` (uuid PK, FK → `auth.users(id)` ON DELETE CASCADE), `daycare_id` (uuid FK → `daycares`), `role` (user_role), `status` (user_status, default `active`), `full_name` (text), `avatar_url` (nullable text), `notify_on_post` (boolean, default true), `daily_summary_enabled` (boolean, default true), and `created_at` / `updated_at` (timestamptz).
- Enable Row Level Security (RLS) on the `users` table.
- Create basic RLS policies: read access for authenticated users in the same daycare and write access for staff/admin users.
- Create an `AFTER INSERT ON auth.users` trigger that automatically inserts a row into `users`, passing `daycare_id`, `role`, and `full_name` from `raw_user_meta_data`.
- Insert a test staff user: `kevin@google.com` with password `Abc123456@`, linked to "Guardería Sala Soles".
- Apply it as a Supabase migration using `apply_migration`.

**Out of scope (for future specs):**

- The `invitations`, `rooms`, `children`, `posts`, and other tables.
- The complete parent signup/invitation flow.
- UI for user management (visual CRUD).
- Migrating existing mocks to real data.

## Data model

### Enums

```sql
CREATE TYPE user_role AS ENUM ('staff', 'parent', 'admin');
CREATE TYPE user_status AS ENUM ('pending', 'active');
```

### `users` table

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daycare_id uuid REFERENCES daycares(id),
  role user_role NOT NULL,
  status user_status NOT NULL DEFAULT 'active',
  full_name text NOT NULL,
  avatar_url text,
  notify_on_post boolean NOT NULL DEFAULT true,
  daily_summary_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

### RLS Policies

```sql
-- Read: authenticated users can view users in their own daycare
CREATE POLICY "users_read_own_daycare" ON users
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT u.id FROM users u WHERE u.daycare_id = users.daycare_id
    )
  );

-- Write: only staff and admin users can insert
CREATE POLICY "users_staff_insert" ON users
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT u.id FROM users u WHERE u.id = auth.uid() AND u.role IN ('staff', 'admin')
    )
  );

-- Update: staff and admin users can update
CREATE POLICY "users_staff_update" ON users
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT u.id FROM users u WHERE u.id = auth.uid() AND u.role IN ('staff', 'admin')
    )
  );

-- Delete: only admin users can delete
CREATE POLICY "users_admin_delete" ON users
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT u.id FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );
```

### Trigger for `auth.users`

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, daycare_id, role, full_name, status)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'daycare_id')::uuid,
    (NEW.raw_user_meta_data->>'role')::user_role,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE((NEW.raw_user_meta_data->>'status')::user_status, 'active')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Seed data

```sql
-- Create a staff user in auth.users and its corresponding row in users
-- Note: auth.users is managed through the Supabase Auth API, not direct inserts.
-- For seeding, use the Supabase Auth function to create the user.
-- In the migration, insert directly into auth.users using the Supabase hook.

-- The handle_new_user trigger will create the row in users
-- when the user is created in auth.users.
```

> **Note:** The `kevin@google.com` user and password will be created through the Supabase Auth API (not direct SQL), since `auth.users` is managed by Supabase. The `handle_new_user` trigger will automatically create the row in `users` with the provided metadata.

## Implementation plan

1. Create a Supabase migration containing:
   - The `user_role` and `user_status` enums.
   - The `users` table with foreign keys and defaults.
   - RLS enablement.
   - Read/write RLS policies.
   - The `handle_new_user` trigger for `auth.users`.
2. Apply the migration with `apply_migration`.
3. Create the staff user `kevin@google.com` with password `Abc123456@` through the Supabase Auth API (or `supabase auth signup`), passing `raw_user_meta_data` with the `daycare_id` for "Guardería Sala Soles", `role: 'staff'`, and `full_name: 'Kevin'`.
4. Use `list_tables` to verify that the table exists and `execute_sql` to confirm that the staff user was created.

## Acceptance criteria

- [x] The `user_role` and `user_status` enums exist in the database with the correct values.
- [x] The `users` table exists with all specified columns.
- [x] RLS is enabled on the `users` table.
- [x] The RLS policies allow SELECT access for users in the same daycare.
- [x] The RLS policies allow INSERT/UPDATE access for staff and admin users.
- [x] The `handle_new_user` trigger works: creating a user in `auth.users` automatically creates the corresponding row in `users`.
- [x] A staff user with the email `kevin@google.com` exists and is linked to "Guardería Sala Soles".
- [x] The migration was applied through `apply_migration` without errors.

## Decisions

- **Yes:** Create only the `user_role` and `user_status` enums in this migration. The remaining enums will be created when their tables require them.
- **Yes:** Use an `AFTER INSERT ON auth.users` trigger to automatically create the row in `users`. This follows the schema convention.
- **Yes:** Seed a staff user with the credentials `kevin@google.com` / `Abc123456@` for development testing.
- **No:** Include the parent invitation flow. It will be covered in a separate spec.
- **No:** Create a test parent user. Only a staff user is needed for now.

## Risks

| Risk                                                                                           | Mitigation                                                                                                     |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| The `handle_new_user` trigger may fail if `raw_user_meta_data` lacks the expected fields        | Validate that the fields exist before inserting; use `COALESCE` and check for `NULL`.                          |
| Overly restrictive RLS policies may block development                                          | Temporarily disable them with `ALTER TABLE users DISABLE ROW LEVEL SECURITY` for local testing.                |
| Supabase does not support inserting directly into `auth.users`                                 | Use the Supabase Auth API or `supabase auth signup` to create the staff user.                                  |
| The hardcoded password in the spec may be exposed                                              | Use it only for local development, never in production.                                                       |

## What is **not** in this spec

- Parent invitation flow.
- The `rooms`, `children`, `posts`, and other tables.
- UI for user management.
- Migrating mocks to real data.
- Creating enums unrelated to `users`.

Each of these, if needed, will have its own spec.

## Verification

**Date:** 2026-08-17

### Repository validation

- `npx tsc --noEmit`: PASSED with no TypeScript errors.
- `npm run build`: PASSED with Next.js 16.3.0; all 10 routes were generated successfully.
- `npm run lint`: FAILED only in the pre-existing excluded reference asset `references/pantallas/support.js` (2 errors and 8 warnings); no application files produced diagnostics.
- `git diff --check`: PASSED.

### Database evidence

1. **Enums:** Live `pg_enum` inspection returned `user_role = {staff,parent,admin}` and `user_status = {pending,active}`.
2. **Table:** `list_tables` and `information_schema.columns` confirmed all 10 specified columns, types, nullability, and defaults. Catalog constraints confirmed the UUID primary key, `auth.users(id) ON DELETE CASCADE`, and the `daycares(id)` foreign key.
3. **RLS:** `pg_class.relrowsecurity` is `true` for `public.users`.
4. **SELECT policy:** A read-only session simulated as Kevin with database role `authenticated` returned one visible row; `only_same_daycare` evaluated to `true`, and the private helper resolved the expected daycare UUID without recursion.
5. **Write policies:** The live role simulation confirmed `INSERT` and `UPDATE` grants and a true staff authorization predicate. `pg_policies` confirmed that both policies allow `staff` and `admin`, with both `USING` and `WITH CHECK` present for UPDATE.
6. **Auth trigger:** `on_auth_user_created` is enabled on `auth.users`; `handle_new_user` is `SECURITY DEFINER` with an empty `search_path`. The Auth signup request returned HTTP 200 during implementation, and the resulting Auth UUID has a matching automatically-created `public.users` row.
7. **Staff seed:** `kevin@google.com` exists in `auth.users` with a password and has a matching `public.users` profile: `role = staff`, `status = active`, `full_name = Kevin`, and daycare `Guardería Sala Soles`. Email confirmation is currently false and was not required by the acceptance criteria.
8. **Migration history:** Supabase lists `20260817060844_create_users_table_and_enums` and the privilege correction `20260817061111_restrict_users_table_privileges`; both `apply_migration` calls returned success.

### Browser and visual verification

- Not applicable: this spec contains no UI, route, responsive behavior, or visual reference.

### Advisor results

- Supabase performance advisors returned no findings.
- Unrelated project-wide security warnings remain for `public.rls_auto_enable()` execute permissions ([anon remediation](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated remediation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)) and disabled leaked-password protection ([remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)). No warning targeted the Spec 08 tables, policies, helpers, or trigger.
