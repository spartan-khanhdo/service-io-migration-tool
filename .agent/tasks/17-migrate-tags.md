# Task 17: Migrate Tags

## Phase
Phase 3 — Business & Related

## Source
- **Old table**: `tags` (PK: UUID)
- **Old columns**: `id`, `name`, `slug`, `created_at`, `updated_at`

## Target
- **New table**: `tags` (PK: UUID)
- **New columns**: `id`, `name`, `slug`, `color`, `description`, `organization_id`, `created_at`, `updated_at`, `deleted_at`

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `id` | `id` | PRESERVE |
| `name` | `name` | Direct copy |
| `slug` | `slug` | Direct copy |
| — | `color` | `NULL` |
| — | `description` | `NULL` |
| — | `organization_id` | `NULL` (global tags) |

## File
`src/phases/phase-3/migrate-tags.ts`

## Dependencies
- Task 00
