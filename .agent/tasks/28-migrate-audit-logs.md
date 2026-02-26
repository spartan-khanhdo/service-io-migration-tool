# Task 28: Migrate Audit Logs

## Phase
Phase 4 — Supporting Data

## Source
- **Old table**: `audit_logs`
- **Old columns**: `id`, `event`, `model`, `model_id`, `user_id`, `payload` (JSON), `created_at`, `updated_at`

## Target
- **New table**: `audit_logs` (range-partitioned by `created_at`)
- **Post Flyway 052**: Partitioned table with composite PK `(id, created_at)`.

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `id` | `id` | PRESERVE |
| `event` | `event` | Direct copy |
| `model` | `auditable_type` | `transformModelType()`: `App\Models\User` → `user` |
| `model_id` | `auditable_id` | Direct copy (UUID) |
| `user_id` | `user_id` | Direct copy |
| `payload` | `old_values` | Copy full payload as old_values |
| — | `new_values` | `NULL` (cannot split retroactively) |

## Notes
- **Flyway 052** converted audit_logs to range-partitioned table by `created_at`
- Composite PK `(id, created_at)` — uses `batchInsertComposite()` with conflict columns `["id", "created_at"]`
- Cannot use regular `batchInsert()` because `ON CONFLICT (id) DO NOTHING` doesn't work with composite PK
- Old system stores single `payload` JSON → put in `old_values`, leave `new_values` as NULL

## File
`src/phases/phase-4/migrate-audit-logs.ts`

## Dependencies
- Task 00, Task 10
