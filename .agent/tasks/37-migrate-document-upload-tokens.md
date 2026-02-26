# Task 37: Migrate Document Upload Tokens

## Phase
Phase 5 — Tokens & Misc

## Source
- **Old table**: `document_upload_tokens` (PK: UUID)
- **Old columns**: `id`, `document_request_id`, `token`, `expires_at`, `used`, `revoked`, `webhook_url`, `created_at`, `updated_at`

## Target
- **New table**: `document_upload_tokens` (PK: UUID)
- **Post Flyway 059**: Dropped `model_type`, `model_id`, `collection_name`, `requested_by`, `max_files`, `uploaded_files`, `used_at`. Added `revoked`, `webhook_url`.

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `id` | `id` | PRESERVE |
| `document_request_id` | `document_request_id` | Direct copy |
| `token` | `token` | Direct copy |
| `expires_at` | `expires_at` | Direct copy |
| `used` | `is_used` | Rename |
| `revoked` | `revoked` | Direct copy (added in 059) |
| `webhook_url` | `webhook_url` | Direct copy (added in 059) |

## Notes
- **Flyway 059** simplified document_upload_tokens — dropped 7 Kotlin-only columns, added 2 PHP columns
- No more fake values for `model_type`, `model_id`, `collection_name`, etc.
- Changed from individual inserts to `batchInsert()`

## File
`src/phases/phase-5/migrate-document-upload-tokens.ts`

## Dependencies
- Task 00, Task 13, Task 24
