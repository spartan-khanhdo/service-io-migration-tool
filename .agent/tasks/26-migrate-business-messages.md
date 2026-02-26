# Task 26: Migrate Business Messages

## Phase
Phase 4 — Supporting Data

## Source
- **Old table**: `business_messages`
- **Old columns**: `id`, `sender_id`, `business_id`, `message`, `sent_at`, `message_type`, `attachments`, `is_updated`, `created_at`, `updated_at`

## Target
- **New table**: `business_messages`
- **Post Flyway 055**: Added `message_type`, `is_updated` columns back.

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `id` | `id` | PRESERVE |
| `sender_id` | `author_id` | Rename |
| `business_id` | `business_id` | Direct copy |
| `message` | `content` | Rename |
| `message_type` | `message_type` | Direct copy (restored in 055) |
| `attachments` | `attachments` | Direct copy (JSON) |
| `is_updated` | `is_updated` | Direct copy (restored in 055) |
| `sent_at` | — | DROP (use created_at) |

## Notes
- **Flyway 055** restored `message_type` and `is_updated` from PHP schema
- Column renames: `sender_id`→`author_id`, `message`→`content`

## File
`src/phases/phase-4/migrate-business-messages.ts`

## Dependencies
- Task 00, Task 10, Task 13
