# Task 04: Migrate City Counties

## Phase
Phase 1 — Reference Data

## Source
- **Old table**: `city_counties` (PK: UUID)
- **Old columns**: `id` (UUID), `city_id` (UUID), `county_id` (UUID), `created_at`, `updated_at`

## Target
- **New table**: `city_counties` (PK: UUID)
- **New columns**: `id`, `city_id` (UUID), `county_id` (UUID), `is_primary`, `created_at`, `updated_at`, `deleted_at`

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `id` (UUID) | `id` (UUID) | PRESERVE |
| `city_id` (UUID) | `city_id` (UUID) | Direct copy |
| `county_id` (UUID) | `county_id` (UUID) | Direct copy |
| — | `is_primary` | Default `false` |
| `created_at` | `created_at` | Direct copy |
| `updated_at` | `updated_at` | Direct copy |
| — | `deleted_at` | `NULL` |

## Notes
Old schema already has both city_id and county_id as UUID — direct copy.

## File
`src/phases/phase-1/migrate-city-counties.ts`

## Dependencies
- Task 00, Task 01, Task 02, Task 03
