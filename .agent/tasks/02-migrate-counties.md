# Task 02: Migrate Counties

## Phase
Phase 1 — Reference Data

## Priority
HIGH — Cities, Users, Businesses depend on counties ID mapping

## Source
- **Old table**: `counties` (PK: UUID)
- **Old columns**: `id` (UUID), `state_id` (UUID), `name`, `slug`, `created_at`, `updated_at`

## Target
- **New table**: `counties` (PK: UUID)
- **New columns**: `id`, `state_id` (UUID), `name`, `fips_code`, `is_active`, `created_at`, `updated_at`, `deleted_at`

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `id` (UUID) | `id` (UUID) | PRESERVE |
| `state_id` (UUID) | `state_id` (UUID) | Direct copy |
| `name` | `name` | Direct copy |
| `slug` | — | DROP |
| — | `fips_code` | `NULL` |
| — | `is_active` | Default `true` |
| `created_at` | `created_at` | Direct copy |
| `updated_at` | `updated_at` | Direct copy |
| — | `deleted_at` | `NULL` |

## ID Mapping
Not needed — UUIDs preserved.

## File
`src/phases/phase-1/migrate-counties.ts`

## Acceptance Criteria
- [ ] All counties migrated with correct state_id UUID references
- [ ] ID mapping populated for all counties
- [ ] Idempotent
- [ ] Count matches

## Dependencies
- Task 00, Task 01 (states ID mapping required)
