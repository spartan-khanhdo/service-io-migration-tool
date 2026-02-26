# Task 08: Migrate Roles

## Phase
Phase 2 — Core Entities

## Priority
HIGH — model_has_roles depends on roles ID mapping

## Source
- **Old table**: `roles` (PK: BIGINT auto-increment)
- **Old columns**: `id`, `name`, `guard_name`, `created_at`, `updated_at`

## Target
- **New table**: `roles` (PK: UUID)
- **New columns**: `id`, `name`, `guard_name`, `created_at`, `updated_at`, `deleted_at`

## Strategy
**DO NOT migrate data directly.** Instead:
1. New DB should already have roles seeded (from `02-roles.sql`)
2. Query old DB roles: `SELECT id, name FROM roles`
3. Query new DB roles: `SELECT id, name FROM roles`
4. Build ID mapping by matching on `name`:
   - Old: `id=1, name="super-admin"` → New: `id="uuid-xxx", name="super-admin"`
   - `IdMappingStore.set('roles', 1, 'uuid-xxx')`

## File
`src/phases/phase-2/migrate-roles.ts`

## Acceptance Criteria
- [ ] All old role names exist in new DB
- [ ] ID mapping built for all roles
- [ ] No data inserted (only mapping built)

## Dependencies
- Task 00
- New DB must have roles seeded first
