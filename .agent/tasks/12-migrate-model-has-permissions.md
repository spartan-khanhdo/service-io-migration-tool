# Task 12: Migrate model_has_permissions

## Phase
Phase 2 — Core Entities

## Source
- **Old table**: `model_has_permissions`
- **Old columns**: `permission_id` (BIGINT), `model_type` (TEXT), `model_id` (UUID)

## Target
- **New table**: `model_has_permissions`
- **New columns**: `permission_id` (UUID), `model_type` (TEXT), `model_id` (UUID), `created_at`

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `permission_id` (BIGINT) | `permission_id` (UUID) | Lookup `IdMappingStore.get('permissions', old_id)` |
| `model_type` | `model_type` | `transformModelType()` |
| `model_id` | `model_id` | Direct copy (UUID) |
| — | `created_at` | `NOW()` |

## File
`src/phases/phase-2/migrate-model-has-permissions.ts`

## Dependencies
- Task 00, Task 09, Task 10
