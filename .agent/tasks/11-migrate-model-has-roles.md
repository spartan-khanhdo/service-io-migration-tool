# Task 11: Migrate model_has_roles

## Phase
Phase 2 — Core Entities

## Source
- **Old table**: `model_has_roles`
- **Old columns**: `role_id` (BIGINT), `model_type` (TEXT), `model_id` (UUID)

## Target
- **New table**: `model_has_roles`
- **New columns**: `role_id` (UUID), `model_type` (TEXT), `model_id` (UUID), `created_at`

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `role_id` (BIGINT) | `role_id` (UUID) | Lookup `IdMappingStore.get('roles', old_role_id)` |
| `model_type` | `model_type` | `transformModelType()`: `App\Models\User` → `user` |
| `model_id` | `model_id` | Direct copy (UUID) |
| — | `created_at` | `NOW()` or original timestamp if available |

## File
`src/phases/phase-2/migrate-model-has-roles.ts`

## Dependencies
- Task 00, Task 08 (roles ID mapping), Task 10 (users migrated)
