# Task 22: Migrate Offices

## Phase
Phase 4 — Supporting Data

## Source
- **Old table**: `offices` (PK: UUID)
- **Old columns**: `id`, `brokerage_id`, `name`, `address`, `created_by`, `modified_by`, `created_at`, `updated_at`

## Target
- **New table**: `offices` (PK: UUID)
- **Post Flyway 049**: Dropped `address_line2`, `city`, `state`, `zip_code`, `country`, `phone`, `fax`, `email`, `is_headquarters`, `is_active`, `latitude`, `longitude`. Kept `address` as direct column.

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `id` | `id` | PRESERVE |
| `brokerage_id` | `brokerage_id` | Direct copy |
| `name` | `name` | Direct copy |
| `address` | `address` | Direct copy (same name now per 049) |
| `created_by` | `created_by` | Direct copy |
| `modified_by` | `modified_by` | Direct copy |

## Notes
- **Flyway 049** simplified offices — dropped 13 columns, now matches PHP schema
- No more `address` → `address_line1` rename needed
- No more `country='US'`, `is_headquarters=false`, `is_active=true` defaults
- Uses `batchInsert()` — simple direct column mapping

## File
`src/phases/phase-4/migrate-offices.ts`

## Dependencies
- Task 00, Task 21
