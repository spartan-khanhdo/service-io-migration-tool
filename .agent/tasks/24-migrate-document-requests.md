# Task 24: Migrate Document Requests

## Phase
Phase 4 — Supporting Data

## Source
- **Old table**: `document_requests`
- **Old columns**: `id`, `requester_id`, `business_id`, `media_id`, `status`, `comment`, `reason_of_decision`, `requested_at`, `validation_token`, `last_reminder_sent_at`, `category`, `created_by`, `modified_by`, `deleted_by`, `created_at`, `updated_at`

## Target
- **New table**: `document_requests`
- **Post Flyway 051**: Dropped `document_name`. Added `requested_at`, `created_by`, `modified_by`, `deleted_by`.

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `id` | `id` | PRESERVE |
| `requester_id` | `requester_id` | Direct copy |
| `business_id` | `business_id` | Direct copy |
| `media_id` | `media_id` | Map via IdMappingStore('media') if BIGINT |
| `status` | `status` | Direct copy (enum compatible) |
| `comment` | `comment` | Direct copy |
| `reason_of_decision` | `reason_of_decision` | Direct copy |
| `requested_at` | `requested_at` | Direct copy (added in 051) |
| `validation_token` | `validation_token` | Direct copy |
| `last_reminder_sent_at` | `last_reminder_sent_at` | Direct copy |
| `category` | `category` | Direct copy |
| `created_by` | `created_by` | Direct copy (added in 051) |
| `modified_by` | `modified_by` | Direct copy (added in 051) |
| `deleted_by` | `deleted_by` | Direct copy (added in 051) |

## Notes
- **Flyway 051** dropped `document_name`, added `requested_at` and audit columns from PHP
- `media_id` references media by UUID (mapped from BIGINT via IdMappingStore)

## File
`src/phases/phase-4/migrate-document-requests.ts`

## Dependencies
- Task 00, Task 10, Task 13, Task 19
