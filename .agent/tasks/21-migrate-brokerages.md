# Task 21: Migrate Brokerages

## Phase
Phase 4 — Supporting Data

## Source
- **Old table**: `brokerages` (PK: UUID)
- **Old columns**: `id`, `name`, `created_by`, `modified_by`, `deleted_at`, `deleted_by`, `created_at`, `updated_at`

## Target
- **New table**: `brokerages` (PK: UUID)
- **Post Flyway 047**: Dropped `organization_id`, `license_number`, `license_state`, `license_expiry`, `website`, `logo_url`, `is_verified`, `verified_at`, `verified_by`.

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `id` | `id` | PRESERVE |
| `name` | `name` | Direct copy |
| `created_by` | `created_by` | Direct copy |
| `modified_by` | `modified_by` | Direct copy |
| `deleted_by` | `deleted_by` | Direct copy |

## Notes
- **Flyway 047** simplified brokerages — no more `organization_id` or license/verification fields
- Migration is now simple batch insert with `batchInsert()`
- No complex org-finding logic needed (was required before 047)
- `name_search_vector` is auto-generated

## File
`src/phases/phase-4/migrate-brokerages.ts`

## Dependencies
- Task 00
