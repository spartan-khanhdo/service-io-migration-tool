# Task 33: Migrate User Agreements

## Phase
Phase 5 — Tokens & Misc

## Source
- **Old table**: `user_agreements` (PK: UUID)
- **Old columns**: `id`, `user_id`, `agreement_type`, `accepted_at`, `ip_address`, `user_agent`, `created_at`, `updated_at`

## Target
- **New table**: `user_agreements` (PK: UUID)
- **Post Flyway 056**: Relaxed `accepted_at` to nullable.

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `id` | `id` | PRESERVE |
| `user_id` | `user_id` | Direct copy |
| `agreement_type` | `agreement_type` | Direct copy |
| `accepted_at` | `accepted_at` | Direct copy, nullable (relaxed by 056) |
| `ip_address` | `ip_address` | Direct copy |
| `user_agent` | `user_agent` | Direct copy |

## Notes
- **Flyway 056** relaxed `accepted_at` to nullable — removed fallback to `created_at`
- Direct copy with `batchInsert()`

## File
`src/phases/phase-5/migrate-user-agreements.ts`

## Dependencies
- Task 00, Task 10
