# Task 03: Migrate Cities

## Phase
Phase 1 — Reference Data

## Priority
HIGH — Users, Businesses depend on cities ID mapping

## Source
- **Old table**: `cities` (PK: UUID)
- **Old columns**: `id` (UUID), `state_id` (UUID), `name`, `slug`, `created_at`, `updated_at`

## Target
- **New table**: `cities` (PK: UUID)
- **New columns**: `id`, `state_id` (UUID), `name`, `latitude`, `longitude`, `population`, `timezone`, `is_active`, `search_vector`, `created_at`, `updated_at`, `deleted_at`

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `id` (UUID) | `id` (UUID) | PRESERVE |
| `state_id` (UUID) | `state_id` (UUID) | Direct copy |
| `name` | `name` | Direct copy |
| `slug` | — | DROP |
| — | `latitude` | `NULL` |
| — | `longitude` | `NULL` |
| — | `population` | `NULL` |
| — | `timezone` | `NULL` |
| — | `is_active` | Default `true` |
| — | `search_vector` | Auto-populated by DB trigger |

## ID Mapping
Not needed — UUIDs preserved.

## File
`src/phases/phase-1/migrate-cities.ts`

## Dependencies
- Task 00, Task 01, Task 02
