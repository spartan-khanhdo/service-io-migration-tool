# Task 29: Migrate Assignment History

## Phase
Phase 4 — Supporting Data

## Source
- **Old table**: `assignment_history` (PK: UUID)
- **Old columns**: `id`, `business_id`, `assigned_user_id`, `assigned_by`, `assignment_method`, `assignment_reason`, `metadata`, `created_at`, `updated_at`

## Target
- **New table**: `assignment_history` (PK: UUID, same name)
- **Post Flyway 054**: Added `assigned_user_id`, `metadata`. Dropped `previous_assignee_id`, `new_assignee_id`, `assigned_at`. Relaxed `assigned_by` to nullable.

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `id` | `id` | PRESERVE |
| `business_id` | `business_id` | Direct copy |
| `assignment_method` | `assignment_type` | Direct copy (renamed) |
| `assigned_user_id` | `assigned_user_id` | Direct copy (same name now per 054) |
| `assigned_by` | `assigned_by` | Direct copy, nullable (no fallback UUID needed) |
| `assignment_reason` | `reason` | Direct copy (renamed) |
| `metadata` | `metadata` | JSON → JSONB (same name now per 054) |

## Notes
- **Flyway 054** reverted assignment_history to PHP schema
- `assigned_user_id` and `metadata` are now direct columns (not mapped to `new_assignee_id`)
- `assigned_by` is nullable — no system UUID fallback needed
- `previous_assignee_id`, `new_assignee_id`, `assigned_at` dropped
- Uses `batchInsert()` now (was individual inserts before)

## File
`src/phases/phase-4/migrate-assignment-history.ts`

## Dependencies
- Task 00, Task 10, Task 13
