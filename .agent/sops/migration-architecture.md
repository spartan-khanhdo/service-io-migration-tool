# Migration Architecture & Documentation

## 1. Context

### Source (Old)
- **Repo**: `service-loanbud-io`
- **Stack**: PHP / Laravel / Eloquent
- **DB**: PostgreSQL
- **DB Name**: `marketplace`
- **Special**: Uses PostgreSQL composite types for location/industry fields

### Target (New)
- **Repo**: `service-io`
- **Stack**: Kotlin / Exposed ORM
- **DB**: PostgreSQL (Primary + Replica)
- **Migrations**: Flyway (65 migration files, prefix `NNN-description.sql`)
- **Seeds**: 17 seed files in `scripts/database/seeds/`
- **Special**: No foreign key constraints, all referential integrity at app layer

---

## 2. Infrastructure Overview

```
┌──────────────────┐         ┌──────────────────────┐         ┌──────────────────┐
│   Old PHP DB     │         │  Migration Tool      │         │   New Kotlin DB  │
│   (PostgreSQL)   │────────>│  (Node.js/TS)        │────────>│   (PostgreSQL)   │
│                  │  READ   │                      │  WRITE  │                  │
│  - marketplace   │  ONLY   │  - Parse composites  │         │  - Flyway managed│
│  - composite     │         │  - Map IDs           │         │  - No FK         │
│    types         │         │  - Transform data    │         │  - UUID PKs      │
└──────────────────┘         └──────────────────────┘         └──────────────────┘
```

---

## 3. PostgreSQL Composite Types (Old DB)

The old PHP DB uses custom PostgreSQL composite types for location and classification fields.

### `table_item_type`
```sql
CREATE TYPE table_item_type AS (id UUID, name TEXT, slug TEXT);
```
- **Stored as**: `("36f67b29-...","California","california")`
- **Used in**: `users.location_city`, `users.location_county`, `businesses.location_city`, `businesses.location_county`, `businesses.industry`, `broker_profiles.location_city`, `broker_profiles.location_county`

### `state_type`
```sql
CREATE TYPE state_type AS (id UUID, name TEXT, slug TEXT, short TEXT);
```
- **Stored as**: `("36f67b29-...","California","california","CA")`
- **Used in**: `users.location_state`, `businesses.location_state`, `broker_profiles.location_state`

### `naics_type`
```sql
CREATE TYPE naics_type AS (id UUID, code VARCHAR(6), title TEXT);
```
- **Stored as**: `("36f67b29-...","4213","Office administrative services")`
- **Used in**: `businesses.naics_code`

### Parsing Strategy
Strip parentheses, split by comma, handle quoted values:
```typescript
// Input:  ("36f67b29-...","California","california","CA")
// Output: { id: "36f67b29-...", name: "California", slug: "california", short: "CA" }
```

---

## 4. ID Mapping Requirements

### Tables with UUID → UUID (location — no mapping needed)

| Table | Old PK | New PK | Strategy |
|-------|--------|--------|----------|
| `states` | UUID | UUID | PRESERVE — direct copy |
| `counties` | UUID | UUID | PRESERVE — direct copy |
| `cities` | UUID | UUID | PRESERVE — direct copy |
| `city_counties` | UUID | UUID | PRESERVE — direct copy |

### Tables with ID type change (BIGINT → UUID)

| Table | Old PK | New PK | Match By |
|-------|--------|--------|----------|
| `roles` | BIGINT auto-increment | UUID | `name` |
| `permissions` | BIGINT auto-increment | UUID | `name` |

### Tables with PK type change (BIGINT → UUID)

| Table | Old PK | New PK | Strategy |
|-------|--------|--------|----------|
| `media` | BIGINT `id` + `uuid` column | UUID `id` | Use old `uuid` column as new `id` |

### Tables with UUID → UUID (no mapping needed)

All other tables: `users`, `businesses`, `organizations`, `brokerages`, `offices`, `tags`, etc. — preserve original UUIDs.

---

## 5. Polymorphic `model_type` Mapping

| Old Value (PHP) | New Value (Kotlin) |
|-----------------|-------------------|
| `App\Models\User` | `user` |
| `App\Models\Business` | `business` |
| `App\Models\Organization` | `organization` |

Applies to: `model_has_roles.model_type`, `model_has_permissions.model_type`, `media.model_type`, `audit_logs.model`/`auditable_type`, `notifications.notifiable_type`

---

## 6. Table Mapping (Old → New)

### Direct Copy (same table name, minimal changes)
| Table | Notes |
|-------|-------|
| `organizations` | Add missing new fields as NULL |
| `user_organizations` | Direct copy |
| `business_organizations` | Direct copy |
| `api_keys` | Direct copy |
| `user_agreements` | Direct copy |
| `business_claim_tokens` | Direct copy |
| `business_upload_tokens` | Direct copy |
| `document_upload_tokens` | Direct copy |
| `prequalification_letters` | Direct copy |
| `business_messages` | Direct copy |

### Renamed Tables
| Old Table | New Table | Notes |
|-----------|-----------|-------|
| `business_pre_qualifications` | `business_pre_qualifications` | Same table name retained; column renames only |
| `assignment_history` | `assignment_history` | Same table name now (reverted to PHP schema via Flyway 054) |
| `business_user` | `business_users` | Table rename |
| ~~`dscra_media`~~ | ~~`dsca_media`~~ | _(dropped via Flyway 037)_ |

### Significant Schema Changes
| Table | Key Changes |
|-------|------------|
| `users` | Added `bio_url`, `communication_consent_at`; Dropped address/location decomposition columns (042) |
| `businesses` | Only `naics_code` composite parsed; Dropped 11 location/feature columns (043); Added `slug`, `ytd_pnl_expiry_date`, `changed_values` |
| `media` | BIGINT PK → UUID PK; model_type transform; added path, uploaded_by; Added `manipulations` (046) |
| `roles` | BIGINT → UUID (re-seed) |
| `permissions` | BIGINT → UUID (re-seed) |
| `model_has_roles` | role_id BIGINT → UUID; model_type transform |
| `model_has_permissions` | permission_id BIGINT → UUID; model_type transform |
| `business_notes` | sender_id → author_id; message → content; message_type → note_type; Added `is_updated` (053) |
| `business_messages` | Added `message_type`, `is_updated` (055) |
| `audit_logs` | model/model_id → auditable_type/auditable_id; payload → old_values + new_values; Now partitioned by `created_at` (052); composite PK `(id, created_at)` |
| `broker_profiles` | Added location JSONB columns, `city_id`, `has_signed_contract` (048); Dropped `brokerage_name/office/address` |
| `brokerages` | Simple direct copy now; Dropped `organization_id` and all license/verification fields (047) |
| `offices` | Direct copy with `address` (same name); Dropped 13 columns (049) |
| `states` | Direct copy with `slug`, `short`; added `deleted_at` (Flyway 038 aligned schema with old DB) |
| `counties` | Direct copy with `slug`; added `deleted_at` (Flyway 038 aligned) |
| `cities` | Direct copy with `slug`; added `deleted_at` (Flyway 038 aligned) |
| `industries` | Direct copy with `slug`; added `deleted_at` (Flyway 038 aligned) |
| `tags` | Dropped color, description, organization_id (Flyway 041) |
| `business_tags` | Dropped tagged_by (Flyway 041) |
| `business_organizations` | Dropped relationship_type, assigned_at, assigned_by (Flyway 041); soft delete only |
| `business_pre_qualifications` | Dropped 10 new-only columns: SBA fields, assignment, extension, review/completed (Flyway 041) |
| `business_listing_extensions` | Schema redesigned via Flyway 037; dropped listing_type (Flyway 041) |
| `assignment_history` | Reverted to PHP schema (054); direct column names `assigned_user_id`, `metadata`; `assigned_by` nullable |
| `prequalification_letters` | `modified_by` same name now (060) |

### Migrated via Flyway schema alignment (Phase 6)
| Table | Strategy |
|-------|----------|
| `notifications` | Direct copy — `notifiable_type` polymorphic, `data` TEXT→JSONB via `JSON.stringify` |
| `settings_assets` | Migrate with defaults — old DB has NO `key` col; `key` dropped via Flyway 036; `parent_id` added via Flyway 031; seed data truncated |
| `settings_asset_properties` | Individual inserts (skip dup keys) — aligned via Flyway 032+034; orphaned cols (`name`, `default_value`, `display_order`, `group_name`, `note`) dropped via Flyway 036; `override_scope`+`validation_rules` dropped via Flyway 032; `value` JSON→JSONB via `JSON.stringify` |
| `settings_asset_property_histories` | Migrate — old schema only 4 cols; id BIGINT→UUID; aligned via Flyway 033+035 |
| `business_statuses` | Created in new DB via Flyway 027 — direct copy |
| `user_business_messages` | Created in new DB via Flyway 028 — direct copy |
| `user_business_notes` | Created in new DB via Flyway 029 — direct copy |
| `crm_sync_outbox` | Created in new DB via Flyway 030 — direct copy |

### New Tables (Kotlin only, skip migration)
| Table | Strategy |
|-------|----------|
| `refresh_tokens` | Empty |
| `business_status_histories` | Empty or generate from audit_logs |
| `notification_batches` | Already migrated in Phase 5.6 |

**Dropped by Flyway 065**: `password_reset_tokens`, `user_setting_overrides`, `organization_setting_overrides` — these tables no longer exist in the new DB.

### Dropped Tables (Flyway 037)
| Table | Reason |
|-------|--------|
| `dsca_media` (old: `dscra_media`) | **Confirmed not in old DB** — PHP migration `2025_12_02` dropped it; verified via live query. New DB dead code (no repo/service) |

### Not in New DB
| Table | Reason |
|-------|--------|
| `backyard_partner_mappings` | 0 records in old DB, table not in new DB |

---

## 7. Enum Compatibility

All enum values are **COMPATIBLE** — no transformation needed.

Kotlin enums use `toString()` override:
- `name.lowercase()` → `ACTIVE` stores as `"active"`
- `name.lowercase().replace("_", "-")` → `SUPER_ADMIN` stores as `"super-admin"`

These match exactly with the PHP database values.

---

## 8. Migration Phases (Execution Order)

```
Phase 0: Pre-flight validation
  └── Verify connections, count records, check new DB is ready

Phase 1: Reference data (no dependencies) — seed data truncated first
  ├── 1.1 states
  ├── 1.2 counties (depends on states ID map)
  ├── 1.3 cities (depends on states ID map)
  ├── 1.4 city_counties (depends on cities + counties ID map)
  ├── 1.5 industries
  └── 1.6 naics_codes

Phase 2: Core entities
  ├── 2.1 organizations
  ├── 2.2 roles (re-seed, build ID map)
  ├── 2.3 permissions (re-seed, build ID map)
  ├── 2.4 users
  ├── 2.5 model_has_roles (depends on roles ID map)
  └── 2.6 model_has_permissions (depends on permissions ID map)

Phase 3: Business & related
  ├── 3.1 businesses (depends on naics_codes only)
  ├── 3.2 business_organizations
  ├── 3.3 business_users
  ├── 3.4 prequalifications (from business_pre_qualifications)
  ├── 3.5 tags
  ├── 3.6 business_tags
  └── 3.8 business_listing_extensions (schema redesigned via Flyway 037, direct copy)

Phase 4: Supporting data
  ├── 4.1 media (build media ID map: BIGINT → UUID)
  ├── 4.2 broker_profiles (composites → JSONB)
  ├── 4.3 brokerages
  ├── 4.4 offices
  ├── 4.5 user_brokerage_offices
  ├── 4.6 document_requests (depends on media ID map)
  ├── 4.7 business_notes (column renames)
  ├── 4.8 business_messages
  ├── 4.9 prequalification_letters
  ├── 4.10 audit_logs (restructure)
  ├── 4.11 assignment_histories
  └── 4.12 (removed — business_listing_extensions moved to 3.8; dsca_media dropped via Flyway 037)

Phase 5: Tokens & misc
  ├── 5.1 user_agreements
  ├── 5.2 api_keys
  ├── 5.3 business_claim_tokens
  ├── 5.4 business_upload_tokens
  ├── 5.5 document_upload_tokens
  └── 5.6 notification_batches

Phase 6: Remaining tables (Flyway-aligned, 027-035)
  ├── 6.1 notifications (polymorphic + JSON.stringify for JSONB)
  ├── 6.2 business_statuses (direct copy)
  ├── 6.3 user_business_messages (direct copy)
  ├── 6.4 user_business_notes (direct copy)
  ├── 6.5 crm_sync_outbox (direct copy)
  ├── 6.6 settings_assets (truncate seed data, no key col in old DB)
  ├── 6.7 settings_asset_properties (individual inserts, skip dup keys)
  └── 6.8 settings_asset_property_histories (id BIGINT→UUID, old only 4 cols)

Phase 7: Post-migration verification
  └── Count checks, FK integrity, spot checks
```

---

## 9. Execution Plan

### Before Migration Day
1. `pg_dump` old DB → `backup-pre-migration.sql`
2. Ensure new DB has all Flyway migrations applied
3. Run seed files for: roles, permissions, settings_assets, settings_asset_properties
4. Test migration tool on staging/local environment

### Migration Day
1. Stop old PHP service (prevent writes)
2. Final `pg_dump` (point-in-time snapshot)
3. Disable `update_updated_at` triggers on new DB
4. Run migration: Phase 0 → 1 → 2 → 3 → 4 → 5 → 6
5. Re-enable triggers
6. Start new Kotlin service
7. Smoke test critical user flows

### Rollback Plan
- If migration fails: Restore old DB from backup, restart PHP service
- New DB can be dropped and recreated from Flyway migrations
- Migration tool is idempotent — can re-run after fixing issues

---

## 10. Data Preservation Rules

1. **Preserve all UUIDs** where both old and new use UUID PKs
2. **Preserve timestamps** — `created_at`, `updated_at` must match original
3. **Preserve soft-deleted records** — migrate records where `deleted_at IS NOT NULL` too
4. **Skip expired tokens** — tokens where `expires_at < NOW()` can be skipped
5. **Preserve audit trail** — audit_logs should maintain history accuracy

---

## 11. Post-Migration Schema Cleanup (Flyway 036)

Columns dropped because they exist only in new DB (not in old DB) and are not used in Kotlin code:

| Table | Columns Dropped | Reason |
|-------|----------------|--------|
| `city_counties` | `is_primary` | Not in old DB, defined in Kotlin but never used |
| `cities` | `search_vector` + trigger + function + GIN index | Not in old DB, trigger-maintained but never queried by Kotlin |
| `naics_codes` | `search_vector` + trigger + function + GIN index | Same as cities |
| `businesses` | `search_vector` + trigger + function + GIN index | Same as cities |
| `settings_assets` | `key` + unique index | Added by migration 031 but not in old DB, not in Kotlin |
| `settings_asset_properties` | `name`, `default_value`, `display_order`, `group_name`, `note` | Added by migration 032 but not in old DB, not in Kotlin |

Kotlin bug fixes (columns dropped by earlier migrations but still referenced in Kotlin):
- `SettingsAssetPropertyTable`: removed `overrideScope`, `validationRules` (dropped by Flyway 032)
- `SettingsAssetPropertyHistoryTable` + Entity: deleted entirely (all columns dropped by Flyway 033, no repository/service uses them)

## 12. Schema Redesign & Table Drops (Flyway 037)

| Action | Table | Detail |
|--------|-------|--------|
| **DROP** | `dsca_media` (old: `dscra_media`) | **Confirmed not in old DB** — PHP migration `2025_12_02` dropped it; verified via live query. New DB had Kotlin stubs but no repo/service (dead code). `DscaMediaTable.kt` + `DscaMediaEntity.kt` deleted. |
| **REDESIGN** | `business_listing_extensions` | Old schema = 35 cols of listing details (property, financial, employee data). New schema was 10 cols (extension tracking — completely different). Dropped and recreated to match old PHP schema for direct data migration. `BusinessListingExtensionTable.kt` + `Entity.kt` rewritten. |
- `CityCountyTable` + Entity: removed `isPrimary`

## 13. Reference Table Schema Alignment (Flyway 038)

Aligned Phase 1 reference tables with old PHP DB schema — dropped new-only columns, restored `slug` and `short`:

| Table | Changes |
|-------|---------|
| `states` | Renamed `code` → `short`; added `slug`; dropped `is_active` |
| `counties` | Added `slug`; dropped `fips_code`, `is_active` |
| `cities` | Added `slug`; dropped `latitude`, `longitude`, `population`, `timezone`, `is_active` |
| `industries` | Added `slug`; dropped `description`, `display_order`, `is_active` |
| `naics_codes` | Dropped `industry_id`, `description`, `sector`, `subsector`, `industry_group`, `naics_industry`, `national_industry`, `is_active` |

Kotlin code updated:
- 5 Table files, 5 Entity files, 5 Repository files, 4 Response files
- StateRepository: `byCode()` → `byShort()`; CountyRepository: `byStateCode()` → `byStateShort()`
- All `isActive` filters removed from repositories (13 places)
- CityRepository: `orderBy(population)` → `orderBy(name)`
- IndustryRepository: `orderBy(displayOrder)` → `orderBy(name)`
- LocationManager/Controller/Client: endpoints renamed (`/states/code/{code}` → `/states/short/{short}`)

## 14. Users Location References (Flyway 039)

Added UUID location references to decompose composite types into proper relational columns:

| Column | Type | Source |
|--------|------|--------|
| `state_code` | TEXT (renamed from `state`) | `location_state.short` (e.g. "CA") |
| `state_id` | UUID | `location_state.id` |
| `city_id` | UUID | `location_city.id` |
| `county_id` | UUID | `location_county.id` |

Kotlin code updated:
- UserTable: renamed `state` → `stateCode`, added `stateId`, `cityId`, `countyId`
- UserEntity: same rename + 3 new fields + updated `toAuditMap()`
- UserRepository: updated interface, insert, update, toEntity
- BusinessUserRepository: updated toUserEntity
- UserResponse: same rename + 3 new fields
- UpdateUserRequest: same rename + 3 new fields
- DefaultUserManager: updated update() call

## 15. Businesses Table Cleanup (Flyway 040)

Dropped 45 columns from `businesses` table that don't exist in old PHP DB. Renamed 2 columns back to old names. Kept 5 "good default" columns.

**Note**: Migration 043 further dropped 11 columns (`industry_id`, `state_code`, `state_id`, `county_id`, `city_id`, `city`, `country`, `hide_address`, `is_featured`, `view_count`, `inquiry_count`) and added `slug`, `ytd_pnl_expiry_date`, `changed_values`.

### Columns Dropped (45)
`description`, `teaser`, `business_type`, `last_full_year`, `last_full_year_gross_profit`, `last_full_year_ebitda`, `last_full_year_net_income`, `current_year_revenue`, `current_year_gross_profit`, `current_year_seller_discretionary`, `current_year_ebitda`, `current_year_net_income`, `minimum_down_payment`, `real_estate_type`, `real_estate_property_type`, `real_estate_square_feet`, `monthly_rent`, `lease_expiry`, `note_terms`, `franchise_fee`, `address_line2`, `zip_code`, `latitude`, `longitude`, `full_time_employees`, `part_time_employees`, `reason_for_selling`, `training_support`, `inventory_value`, `fixtures_equipment_value`, `status_reason`, `status_changed_by`, `pre_qualification_started_at`, `pre_qualification_reason`, `listing_expires_at`, `published_at`, `featured_at`, `featured_until`, `organization_id`, `brokerage_id`, `office_id`, `sba_prequalified_amount`, `sba_prequalified_at`, `sba_prequalified_expires_at`, `external_id`

### Columns Renamed (2)
- `address_line1` → `address` (back to old PHP name)
- `is_dba` → `has_dba` (back to old PHP name)

### Columns Kept (good defaults)
- `country` (default 'US'), `hide_address` (default true), `is_featured` (default false), `view_count` (default 0), `inquiry_count` (default 0)

### Kotlin Code Updated (19 files)
- **BusinessTable.kt**, **BusinessEntity.kt**: removed 45 fields, renamed 2
- **BusinessRepository.kt**: removed 45 fields from insert/update/convert; removed `byOrganizationId()`, `assignOrganization()`, `updateOrganization()`, `brokerageOfficeByBusinessIds()`; updated search (businessName/shortSummary instead of description/teaser); removed org/brokerage filters
- **BusinessResponse.kt**: removed 45 fields, renamed 2
- **BusinessSummaryResponse.kt**: removed teaser/lastFullYearEbitda/preQualificationReason/preQualificationStartedAt/publishedAt; added shortSummary
- **CreateBusinessRequest.kt**, **UpdateBusinessRequest.kt**: removed dropped fields
- **ListBusinessesRequest.kt**: removed organizationId/brokerageId
- **BusinessFilter.kt**: removed organizationId/brokerageId
- **DefaultBusinessManager.kt**: updated toEntity(), applyUpdate(), toFilter(), export function, org methods (→ pivot table)
- **BusinessExportRow.kt**: removed brokerageOffice field
- **DefaultBusinessPolicy.kt**: isInSameOrganization() uses pivot table instead of direct column
- **BusinessFactory.kt**: added businessRepository to policy factory
- **BusinessPolicyTest.kt**: updated for new policy constructor + pivot table mocking
- **BrokerageRepository.kt**: sbaPrequalifiedAmount → isSbaPreQualified
- **SensitiveFieldDetector.kt**: removed currentYearRevenue/currentYearSellerDiscretionary checks
- **DefaultBrokerSellerManager.kt**: fixed state → stateCode param (from Flyway 039)

### Migration Script Updated
- `migrate-businesses.ts`: removed 45 dropped columns from INSERT; renamed `address_line1` → `address`, `is_dba` → `has_dba`; removed NULL placeholders for dropped columns

### Breaking Changes
- `organization_id`, `brokerage_id`, `office_id` removed from businesses table → organization lookup via `business_organizations` pivot table
- `description`/`teaser` removed from full-text search → replaced with `businessName`/`shortSummary`
- `updateStatus()` signature changed: removed `reason` parameter

## 16. Related Business Tables Cleanup (Flyway 041)

Dropped new-only columns from 5 business-related tables to align with old PHP DB.

### Tables & Columns Dropped

| Table | Columns Dropped | Count |
|-------|----------------|-------|
| `business_organizations` | `relationship_type`, `assigned_at`, `assigned_by` | 3 |
| `business_pre_qualifications` | `sba_prequalified_amount`, `sba_approved_at`, `sba_declined_at`, `sba_decline_reason`, `extended_at`, `extension_count`, `review_started_at`, `completed_at`, `assigned_to`, `assigned_at` | 10 |
| `tags` | `color`, `description`, `organization_id` | 3 |
| `business_tags` | `tagged_by` | 1 |
| `business_listing_extensions` | `listing_type` | 1 |

### Kotlin Code Updated
- **5 Table files**: removed dropped columns from Exposed table definitions
- **5 Entity files**: removed dropped fields from data classes
- **PreQualificationRepository.kt**: removed 10 fields from insert/update/convert; stubbed assign/extend methods; removed byAssignedTo
- **DefaultPreQualificationManager.kt**: removed dropped fields from toResponse; simplified startReview/expire
- **PreQualificationResponse.kt**: removed 9 fields (SBA, extension, review, assignment)
- **PreQualificationSummaryResponse.kt**: removed sbaPrequalifiedAmount
- **TagRepository.kt**: removed color, description, organizationId from insert/convert
- **BusinessTagRepository.kt**: removed taggedBy from insert/convert
- **4 test files**: removed references to dropped columns (assignedBy, sbaPrequalifiedAmount, organizationId)

### Migration Scripts Updated
- `migrate-business-organizations.ts`: removed relationship_type, assigned_at, assigned_by
- `migrate-business-prequalifications.ts`: removed extension_count
- `migrate-tags.ts`: removed color, description, organization_id
- `migrate-business-tags.ts`: removed tagged_by
- `migrate-business-listing-extensions.ts`: removed listing_type

## 17. Schema Alignment (Flyway 042-065)

Summary of schema alignment migrations that bring the new Kotlin DB fully in line with the old PHP DB.

| Migration Range | Description |
|-----------------|-------------|
| 042-043 | Align users (drop address fields, add `bio_url`, `communication_consent_at`) and businesses (drop 11 location/feature cols, add `slug`, `ytd_pnl_expiry_date`, `changed_values`) |
| 044-046 | Align pre_qualifications (`reason`, `lender_note`), temporary_files, media (add `manipulations`) |
| 047-050 | Align brokerages (drop `organization_id` and license/verification fields), broker_profiles (add location JSONB, `city_id`, `has_signed_contract`; drop `brokerage_name/office/address`), offices (simplify — drop 13 cols), user_brokerage_offices (add audit cols) |
| 051-055 | Align document_requests, partition audit_logs by `created_at` (composite PK), business_notes (add `is_updated`), assignment_history (revert to PHP schema — `assigned_user_id`, `metadata`, nullable `assigned_by`), business_messages (add `message_type`, `is_updated`) |
| 056-061 | Relax nullability (user_agreements, api_keys), simplify token tables, align prequalification_letters (`modified_by` same name now) |
| 062-065 | Align notification_batches (PHP columns), drop unique indexes, simplify settings tables, drop unused tables (`password_reset_tokens`, `user_setting_overrides`, `organization_setting_overrides`) |
