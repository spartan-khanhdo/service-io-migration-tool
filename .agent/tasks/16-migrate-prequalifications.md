# Task 16: Migrate Prequalifications

## Phase
Phase 3 — Business & Related

## Source
- **Old table**: `business_pre_qualifications` (PK: UUID)
- **Old columns**: `id`, `business_id`, `pre_qualification_status`, `pre_qualification_sub_status`, `pre_qualification_tertiary_status`, `pre_qualification_reason`, `pre_qualification_started_at`, `pre_qualification_ended_at`, `is_latest`, `lender_note`, `created_by`, `modified_by`, `deleted_by`, `created_at`, `updated_at`, `deleted_at`

## Target
- **New table**: `business_pre_qualifications` (PK: UUID)
- **Post Flyway 044**: Dropped `internal_notes`, `external_notes`. Added `reason`, `lender_note`.

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `id` | `id` | PRESERVE |
| `business_id` | `business_id` | Direct copy |
| `pre_qualification_status` | `status` | Direct copy (enum compatible) |
| `pre_qualification_sub_status` | `sub_status` | Direct copy |
| `pre_qualification_tertiary_status` | `tertiary_status` | Direct copy |
| `is_latest` | `is_latest` | Direct copy |
| `pre_qualification_reason` | `reason` | Direct copy (was `external_notes`, now `reason` per 044) |
| `lender_note` | `lender_note` | Direct copy (same name — was `internal_notes`, reverted per 044) |
| `pre_qualification_started_at` | `submitted_at` | Direct copy |
| `pre_qualification_ended_at` | `expires_at` | Direct copy |

## Notes
- **Flyway 044** reverted column names to match PHP: `internal_notes` → `lender_note`, `external_notes` → `reason`
- No placeholder/NULL columns needed — all old columns map directly

## File
`src/phases/phase-3/migrate-business-prequalifications.ts`

## Dependencies
- Task 00, Task 13
