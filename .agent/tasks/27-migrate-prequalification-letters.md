# Task 27: Migrate Prequalification Letters

## Phase
Phase 4 — Supporting Data

## Source
- **Old table**: `prequalification_letters` (PK: UUID)
- **Old columns**: `id`, `pre_qualification_id`, `media_id`, `modified_by`, `created_at`, `updated_at`

## Target
- **New table**: `prequalification_letters` (PK: UUID)
- **Post Flyway 060**: Renamed `updated_by` → `modified_by` (matches PHP column name).

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `id` | `id` | PRESERVE |
| `pre_qualification_id` | `pre_qualification_id` | Direct copy |
| `media_id` | `media_id` | Map via IdMappingStore('media') if BIGINT |
| `modified_by` | `modified_by` | Direct copy (same name now per 060) |

## Notes
- **Flyway 060** renamed `updated_by` → `modified_by` to match PHP
- No more column name mismatch — `modified_by` is now direct copy

## File
`src/phases/phase-4/migrate-prequalification-letters.ts`

## Dependencies
- Task 00, Task 10, Task 13, Task 19
