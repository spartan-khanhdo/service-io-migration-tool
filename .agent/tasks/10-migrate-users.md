# Task 10: Migrate Users

## Phase
Phase 2 — Core Entities

## Priority
HIGHEST — Many tables reference users

## Source
- **Old table**: `users` (PK: UUID)
- **Key old columns**: `id`, `email`, `password`, `first_name`, `last_name`, `phone`, `phone_extension`, `linkedin`, `profile_photo_path`, `address`, `bio_url`, `communication_consent_at`, `is_walkthrough_finished`, `lang`, `password_change_at`, `email_verified_at`, `status`, `pending_invite`, `two_factor_method`, `two_factor_secret`, `two_factor_recovery_codes`, `two_factor_set_at`, `last_activity`, `remember_token`, `organization_id`, `source`, `created_by`, `modified_by`, `deleted_by`, `created_at`, `updated_at`, `deleted_at`

## Target
- **New table**: `users` (PK: UUID)
- **Post Flyway 042**: Dropped `address_2`, `city`, `state_code`, `zipcode`, `country`, `state_id`, `city_id`, `county_id`. Added `bio_url`, `communication_consent_at`, `email_name_search_vector` (auto-generated).

## Transformation Rules
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `id` | `id` | PRESERVE |
| `email` | `email` | Direct copy |
| `password` | `password` | Direct copy (both bcrypt) |
| `first_name` | `first_name` | Direct copy |
| `last_name` | `last_name` | Direct copy |
| `phone` | `phone` | Direct copy |
| `phone_extension` | `phone_extension` | Direct copy |
| `linkedin` | `linkedin` | Direct copy |
| `profile_photo_path` | `profile_photo_path` | Direct copy |
| `address` | `address` | Direct copy |
| `bio_url` | `bio_url` | Direct copy (added in 042) |
| `communication_consent_at` | `communication_consent_at` | Direct copy (added in 042) |
| `is_walkthrough_finished` | `is_walkthrough_finished` | Direct copy, default `false` |
| `two_factor_method` | `two_factor_method` | `'none'` → `NULL` |
| `status` | `status` | Normalized to lowercase |
| `source` | `source` | Default `"manual"` |
| `two_factor_code` | — | DROP |
| `two_factor_expires_at` | — | DROP |
| `location_city` (composite) | — | DROP (042 removed city, city_id) |
| `location_state` (composite) | — | DROP (042 removed state_code, state_id) |
| `location_county` (composite) | — | DROP (042 removed county_id) |

## Notes
- **Flyway 042** removed all address/location decomposition columns from new DB
- No composite type parsing needed anymore for users migration
- `email_name_search_vector` is auto-generated (STORED), no insert needed

## File
`src/phases/phase-2/migrate-users.ts`

## Acceptance Criteria
- [ ] All users migrated with preserved UUIDs
- [ ] `bio_url` and `communication_consent_at` preserved from old DB
- [ ] Passwords preserved (bcrypt hashes)
- [ ] Soft-deleted users included
- [ ] Count matches

## Dependencies
- Task 00
