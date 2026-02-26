# Task 05: Migrate Industries

## Phase
Phase 1 — Reference Data

## Source
- **Old table**: `industries` (PK: UUID)
- **Old columns**: `id`, `name`, `slug`, `created_at`, `updated_at`

## Target
- **New table**: `industries` (PK: UUID)
- **New columns**: `id`, `name`, `description`, `display_order`, `is_active`, `created_at`, `updated_at`, `deleted_at`

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `id` (UUID) | `id` (UUID) | **PRESERVE** (both UUID) |
| `name` | `name` | Direct copy |
| `slug` | — | DROP |
| — | `description` | `NULL` |
| — | `display_order` | `0` |
| — | `is_active` | `true` |

## ID Mapping
Not needed — UUIDs are preserved.

## File
`src/phases/phase-1/migrate-industries.ts`

## Dependencies
- Task 00
