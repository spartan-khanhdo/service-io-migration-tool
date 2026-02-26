# Task 01: Migrate States

## Phase
Phase 1 — Reference Data

## Priority
HIGH — Counties, Cities, Users, Businesses depend on states ID mapping

## Source
- **Old table**: `states` (PK: UUID)
- **Old columns**: `id` (UUID), `name`, `slug`, `short`, `created_at`, `updated_at`

## Target
- **New table**: `states` (PK: UUID)
- **New columns**: `id`, `code`, `name`, `is_active`, `created_at`, `updated_at`, `deleted_at`

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `id` (UUID) | `id` (UUID) | PRESERVE |
| `name` | `name` | Direct copy |
| `slug` | — | DROP |
| `short` | `code` | Direct copy (e.g., "CA") |
| — | `is_active` | Default `true` |
| `created_at` | `created_at` | Direct copy |
| `updated_at` | `updated_at` | Direct copy |
| — | `deleted_at` | `NULL` |

## ID Mapping
Not needed — both old and new use UUID. UUIDs are preserved.

## File
`src/phases/phase-1/migrate-states.ts`

## Acceptance Criteria
- [ ] All states migrated with correct code values
- [ ] ID mapping populated for all states
- [ ] Idempotent: running twice does not duplicate
- [ ] Count matches: old count = new count

## Dependencies
- Task 00 (core project setup)
