# Task 19: Migrate Media

## Phase
Phase 4 — Supporting Data

## Priority
HIGH — document_requests, prequalification_letters reference media

## Source
- **Old table**: `media` (PK: BIGINT auto-increment, has `uuid` column)
- **Old columns**: `id` (BIGINT), `uuid` (UUID), `model_type`, `model_id`, `collection_name`, `name`, `file_name`, `mime_type`, `disk`, `conversions_disk`, `size`, `manipulations`, `custom_properties`, `generated_conversions`, `responsive_images`, `order_column`, `uploaded_by`, `created_at`, `updated_at`

## Target
- **New table**: `media` (PK: UUID)
- **Post Flyway 046**: Added `manipulations` (JSONB). Relaxed `mime_type`, `path` to nullable.

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `uuid` | `id` | Use old `uuid` column as new PK |
| `id` (BIGINT) | — | DROP (but store mapping) |
| `model_type` | `model_type` | `transformModelType()` |
| `model_id` | `model_id` | Direct copy (UUID) |
| `manipulations` | `manipulations` | JSON → JSONB (added in 046, was in old DB) |
| — | `path` | Construct: `{collection_name}/{uuid}/{file_name}` |
| `uploaded_by` | `uploaded_by` | Direct copy |
| — | `deleted_at` | `NULL` |

## ID Mapping
Store `IdMappingStore.set('media', old_bigint_id, old_uuid)` — needed if any table references media by BIGINT id.

## Notes
- **Flyway 046** added `manipulations` JSONB column from Spatie MediaLibrary
- `mime_type` and `path` are now nullable (relaxed by 046)

## File
`src/phases/phase-4/migrate-media.ts`

## Dependencies
- Task 00, Task 10, Task 13
