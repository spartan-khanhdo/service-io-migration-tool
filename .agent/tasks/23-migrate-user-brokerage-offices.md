# Task 23: Migrate User Brokerage Offices

## Phase
Phase 4 — Supporting Data

## Source
- **Old table**: `user_brokerage_offices` (PK: UUID)
- **Old columns**: `id`, `user_id`, `brokerage_office_id`, `created_by`, `modified_by`, `deleted_by`, `created_at`, `updated_at`, `deleted_at`

## Target
- **New table**: `user_brokerage_offices` (PK: UUID)
- **Post Flyway 050**: Added `created_by`, `modified_by`, `deleted_by`.

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `id` | `id` | PRESERVE |
| `user_id` | `user_id` | Direct copy |
| `brokerage_office_id` | `brokerage_office_id` | Direct copy |
| `created_by` | `created_by` | Direct copy (added in 050) |
| `modified_by` | `modified_by` | Direct copy (added in 050) |
| `deleted_by` | `deleted_by` | Direct copy (added in 050) |

## Notes
- **Flyway 050** added audit columns from PHP schema
- Direct copy with `batchInsert()`

## File
`src/phases/phase-4/migrate-user-brokerage-offices.ts`

## Dependencies
- Task 00, Task 10, Task 21, Task 22
