# Task 36: Migrate Business Upload Tokens

## Phase
Phase 5 — Tokens & Misc

## Source
- **Old table**: `business_upload_tokens` (PK: UUID)
- **Old columns**: `id`, `business_id`, `token`, `expires_at`, `used`, `created_at`, `updated_at`

## Target
- **New table**: `business_upload_tokens` (PK: UUID)
- **Post Flyway 058**: Dropped `collection_name`, `requested_by`, `max_files`, `uploaded_files`, `used_at`.

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `id` | `id` | PRESERVE |
| `business_id` | `business_id` | Direct copy |
| `token` | `token` | Direct copy |
| `expires_at` | `expires_at` | Direct copy |
| `used` | `is_used` | Rename |

## Notes
- **Flyway 058** simplified business_upload_tokens — dropped 5 Kotlin-only columns
- No more fake/default values for `collection_name`, `requested_by`, `max_files`, etc.
- Changed from individual inserts to `batchInsert()`

## File
`src/phases/phase-5/migrate-business-upload-tokens.ts`

## Dependencies
- Task 00, Task 13
