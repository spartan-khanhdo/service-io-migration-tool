# Task 25: Migrate Business Notes

## Phase
Phase 4 — Supporting Data

## Source
- **Old table**: `business_notes`
- **Old columns**: `id`, `sender_id`, `business_id`, `message`, `sent_at`, `message_type`, `attachments`, `is_updated`, `created_at`, `updated_at`

## Target
- **New table**: `business_notes`
- **Post Flyway 053**: Added `is_updated` column back.

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `id` | `id` | PRESERVE |
| `sender_id` | `author_id` | Rename |
| `business_id` | `business_id` | Direct copy |
| `message` | `content` | Rename |
| `message_type` | `note_type` | Rename |
| `attachments` | `attachments` | Direct copy (JSON) |
| `is_updated` | `is_updated` | Direct copy (restored in 053) |
| `sent_at` | — | DROP (use created_at) |

## Notes
- **Flyway 053** restored `is_updated` from PHP schema (was previously dropped)
- Column renames: `sender_id`→`author_id`, `message`→`content`, `message_type`→`note_type`

## File
`src/phases/phase-4/migrate-business-notes.ts`

## Dependencies
- Task 00, Task 10, Task 13
