# Task 40: Migrate Notification Batches

## Phase
Phase 5 — Tokens & Misc

## Source
- **Old table**: `notification_batches` (PK: UUID)
- **Old columns**: `id`, `recipient_email`, `recipient_id`, `notification_batch_type`, `event`, `data` (JSON), `batch_identifier`, `sent_at`, `is_admin`, `business_id`, `created_at`, `updated_at`

## Target
- **New table**: `notification_batches` (PK: UUID)
- **Post Flyway 062**: Renamed `recipient_id` → `user_id`. Added `recipient_email`, `event`, `data` (JSONB), `batch_identifier`, `is_admin`, `business_id`. Dropped `notification_ids`, `scheduled_for`, `status`, `error_message`, `processed_at` (was `sent_at`, renamed then dropped by 062).

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `id` | `id` | PRESERVE |
| `recipient_id` | `user_id` | Direct copy (renamed) |
| `notification_batch_type` | `batch_type` | Direct copy, default `"unknown"` |
| `recipient_email` | `recipient_email` | Direct copy (added in 062) |
| `event` | `event` | Direct copy (added in 062) |
| `data` | `data` | JSON → JSONB (added in 062) |
| `batch_identifier` | `batch_identifier` | Direct copy (added in 062) |
| `sent_at` | _(dropped)_ | Column renamed to `processed_at` then dropped by 062 |
| `is_admin` | `is_admin` | Direct copy, default `false` (added in 062) |
| `business_id` | `business_id` | Direct copy (added in 062) |

## Notes
- **Flyway 062** aligned notification_batches with PHP — much simpler mapping now
- No fake/placeholder columns needed (was very complex before 062)
- Rows with NULL `recipient_id` still skipped
- Uses individual inserts (not batch) for ON CONFLICT handling

## File
`src/phases/phase-5/migrate-notification-batches.ts`

## Dependencies
- Task 00, Task 10
