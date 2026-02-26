# Task 20: Migrate Broker Profiles

## Phase
Phase 4 — Supporting Data

## Source
- **Old table**: `broker_profiles`
- **Old columns**: `id`, `user_id`, `city_id`, `location_city` (table_item_type), `location_county` (table_item_type), `location_state` (state_type), `has_signed_contract`, `role`, `calendar_url`, `description`, `bio_url`, `created_at`, `updated_at`

## Target
- **New table**: `broker_profiles`
- **Post Flyway 048**: Dropped `brokerage_name`, `brokerage_office`, `brokerage_address`. Added `city_id`, `location_city` (JSONB), `location_county` (JSONB), `location_state` (JSONB), `has_signed_contract`.

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `id` | `id` | PRESERVE |
| `user_id` | `user_id` | Direct copy |
| `city_id` | `city_id` | Direct copy (UUID) |
| `location_city` (composite) | `location_city` (JSONB) | Parse composite → JSON.stringify |
| `location_county` (composite) | `location_county` (JSONB) | Parse composite → JSON.stringify |
| `location_state` (composite) | `location_state` (JSONB) | Parse composite → JSON.stringify |
| `has_signed_contract` | `has_signed_contract` | Direct copy, default `true` |
| `role` | `role` | Direct copy |
| `bio_url` | `bio_url` | Direct copy |
| `calendar_url` | — | DROP (not in new schema) |
| `description` | — | DROP (not in new schema) |

## Notes
- **Flyway 048** aligned broker_profiles with PHP — now includes location JSONB and has_signed_contract
- Composite types parsed via `parseTableItemType()` / `parseStateType()` then serialized to JSONB
- `city_name_search_vector` is auto-generated

## File
`src/phases/phase-4/migrate-broker-profiles.ts`

## Dependencies
- Task 00, Task 10
