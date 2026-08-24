## Purpose

This capability establishes secure, role-specific staff and family entry areas while preserving existing authentication, authorization, and compatibility behavior.

## ADDED Requirements

### Requirement: Role-aware root dispatch

The application SHALL resolve the authenticated active profile on the server and SHALL route staff/admin profiles to `/staff/` and parent profiles to `/family/`. It MUST NOT offer a manual role selector.

#### Scenario: Active profile reaches its canonical area

- **GIVEN** an authenticated user has an active `staff`, `admin`, or `parent` profile
- **WHEN** the user requests `/`
- **THEN** the response redirects or resolves to the profile's canonical area without exposing the other area's content

#### Scenario: Profile cannot be trusted

- **GIVEN** the profile is pending, missing, invalid, or cannot be read
- **WHEN** the user requests `/`
- **THEN** the response shows a dedicated access-pending state and exposes neither staff nor family application content

### Requirement: Canonical area boundaries

`/staff/*` SHALL be canonical for active staff and admins, and `/family/*` SHALL be canonical for active parents. A user requesting the other protected area MUST be redirected to the user's own canonical landing area without rendering the requested area's response.

#### Scenario: Authorized staff deep link

- **GIVEN** an active staff or admin user requests a valid `/staff/*` deep link
- **WHEN** the route is resolved
- **THEN** the requested staff page is returned with the shared staff/admin area

#### Scenario: Parent crosses into staff area

- **GIVEN** an active parent requests any `/staff/*` URL directly
- **WHEN** the route is resolved
- **THEN** the parent is redirected to `/family/` and receives no staff page, control, or data

### Requirement: Separate shells and family phase boundary

Staff and admins SHALL share a staff-oriented shell while retaining their existing backend permission differences. Parents SHALL receive a distinct family shell; this phase MUST NOT implement or imply a real linked-child-filtered family feed.

#### Scenario: Family shell without future feed

- **GIVEN** an active parent requests `/family/`
- **WHEN** the page is rendered
- **THEN** a family shell or access-safe placeholder is returned without a child-filtered feed or staff-oriented content

### Requirement: Role-aware responsive navigation and response isolation

The staff area SHALL provide staff navigation on desktop and mobile, and the family area SHALL provide family navigation on desktop and mobile. Family responses MUST NOT contain staff-only links, creation controls, child-management controls, room-operation data, or equivalent staff UI.

#### Scenario: Navigation matches role and viewport

- **GIVEN** an active staff/admin or parent user views the canonical area on desktop or mobile
- **WHEN** the shell is rendered
- **THEN** the corresponding area navigation is present, with desktop and mobile presentation appropriate to that area

### Requirement: Backend authorization remains authoritative

Server authorization SHALL remain the authority for protected pages, reads, and writes; redirects and hidden navigation MUST NOT be treated as security controls. Existing Supabase RLS, roles, profile lifecycle, and staff/admin permission differences SHALL remain unchanged.

#### Scenario: Direct unauthorized operation

- **GIVEN** a parent or inactive/invalid profile submits a staff-only request directly
- **WHEN** the server evaluates the request
- **THEN** it denies the operation and returns no protected staff data, regardless of visible navigation

### Requirement: Transitional legacy aliases

The legacy URLs `/kids` and `/crear-publicacion` SHALL remain usable through server-side, role-aware redirects. Active staff/admin users SHALL reach `/staff/kids` and `/staff/crear-publicacion`; parents SHALL reach `/family/`; invalid profiles SHALL reach access-pending; unauthenticated users SHALL retain login handling.

#### Scenario: Staff bookmark remains usable

- **GIVEN** an active staff/admin user opens `/kids` or `/crear-publicacion`
- **WHEN** the alias is resolved
- **THEN** it redirects to the corresponding canonical staff URL without a loop

#### Scenario: Parent bookmark fails closed

- **GIVEN** an active parent opens either legacy URL
- **WHEN** the alias is resolved
- **THEN** it redirects to `/family/` and does not render staff content or controls

### Requirement: Public routes, history, and redirect safety

Unauthenticated behavior for `/login`, `/activate`, and `/auth/callback` SHALL remain intact, while protected requests SHALL continue to require authentication. Canonical and legacy redirects MUST terminate, preserve usable logout behavior, and prevent browser back navigation from revealing protected content after logout.

#### Scenario: Public authentication flow remains reachable

- **GIVEN** no authenticated session exists
- **WHEN** the user requests an existing public route
- **THEN** that route remains reachable with its current behavior, while a protected route is handled by the existing login flow

#### Scenario: Logout and browser back

- **GIVEN** an authenticated user logs out from either area
- **WHEN** the user presses Back or opens a protected bookmark
- **THEN** the protected response is not returned and the user is sent through login without a redirect loop

### Requirement: No database or RLS migration

This phase SHALL require no database schema, data, RLS, role, or profile-lifecycle change; existing records and authorization policies MUST continue to govern access.

#### Scenario: Existing persistence boundaries remain stable

- **GIVEN** the current database and authorization policies
- **WHEN** canonical areas and aliases are introduced
- **THEN** no database/RLS migration is expected and existing staff/admin and parent access decisions remain unchanged
