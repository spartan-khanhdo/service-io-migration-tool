# Task 34: Migrate API Keys

## Phase
Phase 5 — Tokens & Misc

## Source
- **Old table**: `api_keys` (PK: UUID)
- **Old columns**: `id`, `organization_id`, `name`, `key`, `is_active`, `last_used_at`, `created_at`, `updated_at`

## Target
- **New table**: `api_keys` (PK: UUID)
- **Post Flyway 057**: Relaxed `organization_id` to nullable.

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `id` | `id` | PRESERVE |
| `organization_id` | `organization_id` | Direct copy, nullable (relaxed by 057) |
| `name` | `name` | Direct copy |
| `key` | `key` | Direct copy |
| `is_active` | `is_active` | Direct copy |
| `last_used_at` | `last_used_at` | Direct copy |

## Notes
- **Flyway 057** relaxed `organization_id` to nullable — no rows skipped now
- Previously skipped rows with NULL `organization_id` — now **all rows migrated**
- Changed from individual inserts to `batchInsert()`

## File
`src/phases/phase-5/migrate-api-keys.ts`

## Dependencies
- Task 00, Task 07
