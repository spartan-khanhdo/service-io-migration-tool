# RFC: Data Migration from Legacy PHP Database to New Kotlin Database

**Status**: Updated for Flyway 000-065. Needs re-testing.
**Author**: Engineering Team
**Date**: 2026-02-26
**Last Updated**: 2026-03-06

---

## 1. Overview

We need to migrate all existing data from the Legacy PostgreSQL database (Host A — `service-loanbud-io`, PHP/Laravel) to the New PostgreSQL database (Host B — `service-io`, Kotlin/Exposed). The migration must preserve all records, timestamps, UUIDs, and audit history with zero data loss.

---

## 2. Architecture Overview

```
Legacy PHP DB (Host A)  ──READ──>  Migration Tool (Node.js/TS)  ──WRITE──>  New Kotlin DB (Host B)
PostgreSQL / Laravel               Parse, Map IDs, Transform               PostgreSQL / Flyway
```

### Flow Explanation

1. **Read** — Migration tool connects read-only to the Legacy DB and fetches all records per table
2. **Transform** — Data is transformed in-memory:
   - PostgreSQL composite types (`state_type`, `table_item_type`, `naics_type`) are parsed into plain columns
   - Primary key types are mapped (BIGINT → UUID for `roles`, `permissions`, `media`)
   - Polymorphic `model_type` values are simplified (`App\Models\User` → `user`)
   - Column renames and schema differences are handled
3. **Write** — Transformed data is batch-inserted into the New DB using parameterized queries with `ON CONFLICT DO NOTHING` for idempotency

---

## 3. Table Mapping (Legacy → New)

### Phase 1: Reference Data

Seed data in the New DB is truncated via `TRUNCATE CASCADE` before insert to avoid unique constraint conflicts.

| # | Old Table | New Table | Changes | Manual Check |
|---|-----------|-----------|---------|-------------|
| 1.1 | `states` | `states` | Direct copy: `id`, `name`, `slug`, `short`; Added: `deleted_at` (NULL); NULL timestamps → `CURRENT_TIMESTAMP` | Verify `short` values (e.g. "CA", "TX") |
| 1.2 | `counties` | `counties` | Direct copy: `id`, `state_id`, `name`, `slug`; Added: `deleted_at` (NULL); NULL timestamps → fallback | Spot check 5 counties have correct `state_id` |
| 1.3 | `cities` | `cities` | Direct copy: `id`, `state_id`, `name`, `slug`; Dropped: `search_vector` (Flyway 036); Added: `deleted_at` (NULL); NULL timestamps → fallback | Verify count |
| 1.4 | `city_counties` | `city_counties` | Dropped: `is_primary` (Flyway 036); Added: `deleted_at` (NULL); NULL timestamps → fallback | Verify count |
| 1.5 | `industries` | `industries` | Direct copy: `id`, `name`, `slug`; Added: `deleted_at` (NULL); NULL timestamps → fallback | Verify count |
| 1.6 | `naics_codes` | `naics_codes` | Direct copy: `id`, `code`, `title`; Dropped: `search_vector` (Flyway 036); Added: `deleted_at` (NULL); NULL timestamps → fallback | Verify `code` and `title` preserved |

### Phase 2: Core Entities

| # | Old Table | New Table | Changes | Manual Check |
|---|-----------|-----------|---------|-------------|
| 2.1 | `organizations` | `organizations` | Direct copy; NULL timestamps → fallback | Verify count and soft-deleted records preserved |
| 2.2 | `roles` | `roles` | **PK changed: BIGINT → UUID**; New UUID auto-generated; ID mapping built by matching `name`; `ON CONFLICT (name, guard_name)` for idempotency | Verify all roles exist with correct names |
| 2.3 | `permissions` | `permissions` | **PK changed: BIGINT → UUID**; Same strategy as roles | Verify all permissions exist |
| 2.4 | `users` | `users` | Added `bio_url`, `communication_consent_at` from old DB; Dropped (042): `address_2`, `city`, `state_code`, `zipcode`, `country`, `state_id`, `city_id`, `county_id` (location decomposition no longer needed — new DB dropped these columns); `email_name_search_vector` auto-generated; Kept: `two_factor_method='none'` → NULL; `status` normalized to lowercase; `source` default 'manual'; NULL timestamps → fallback | Spot check 5 users: `bio_url`, `communication_consent_at` preserved |
| 2.5 | `model_has_roles` | `model_has_roles` | `role_id`: **BIGINT → UUID** (via ID mapping); `model_type`: `App\Models\User` → `user` | Spot check role assignments |
| 2.6 | `model_has_permissions` | `model_has_permissions` | Same transforms as `model_has_roles`; Old DB had 0 records | Confirm 0 records expected |
| 2.7 | `role_has_permissions` | `role_has_permissions` | `role_id`: **BIGINT → UUID**; `permission_id`: **BIGINT → UUID** (both via ID mapping) | Spot check super-admin permissions |

### Phase 3: Business & Related

| # | Old Table | New Table | Changes | Manual Check |
|---|-----------|-----------|---------|-------------|
| 3.1 | `businesses` | `businesses` | Composite parsing: only `naics_code` remains; Dropped (043): `industry_id`, `state_code`, `state_id`, `county_id`, `city_id`, `city`, `country`, `hide_address`, `is_featured`, `view_count`, `inquiry_count`; Added (043): `slug`, `ytd_pnl_expiry_date`, `changed_values` (JSONB) from old DB; `pre_qualification_status` defaults to 'draft' if NULL; `reporting_year` varchar → int; `cover_image`/`stamped_cover_image` json → jsonb; 45 new-only columns dropped (Flyway 040) | Spot check 5 businesses: `slug`, `asking_price`, `status`, `pre_qualification_status` |
| 3.2 | `business_organizations` | `business_organizations` | Direct copy + `deleted_at` (NULL); `relationship_type`, `assigned_at`, `assigned_by` dropped (Flyway 041) | Verify count |
| 3.3 | `business_user` | `business_users` | **Table renamed**; Added: `deleted_at` (NULL) | Verify count |
| 3.4 | `user_organizations` | `user_organizations` | Direct copy (schema identical) | Check soft-deleted records preserved |
| 3.5 | `business_pre_qualifications` | `business_pre_qualifications` | Renames: `pre_qualification_status` → `status`; `pre_qualification_sub_status` → `sub_status`; `pre_qualification_tertiary_status` → `tertiary_status`; `pre_qualification_reason` → `reason` (was external_notes, changed by 044); `lender_note` → `lender_note` (same name — was internal_notes, reverted by 044); `pre_qualification_started_at` → `submitted_at`; `pre_qualification_ended_at` → `expires_at`; 10 new-only columns dropped (Flyway 041): SBA fields, assignment, extension, review/completed | Spot check `status`, `submitted_at`, `reason`, `lender_note` |
| 3.6 | `tags` | `tags` | Direct copy + `deleted_at` (NULL); `color`, `description`, `organization_id` dropped (Flyway 041) | Verify count |
| 3.7 | `business_tags` | `business_tags` | Direct copy + `deleted_at` (NULL); `tagged_by` dropped (Flyway 041); **Deduplicated**: old DB had duplicate `(business_id, tag_id)` pairs → kept earliest `created_at` | Confirm dedup is acceptable |
| 3.8 | `business_listing_extensions` | `business_listing_extensions` | **Schema redesigned via Flyway 037** to match old PHP schema; Direct copy — all columns nullable except `business_id`; Added: `deleted_at` (NULL); `listing_type` dropped (Flyway 041) | Spot check `ebitda`, `organization_status` |

### Phase 4: Supporting Data

| # | Old Table | New Table | Changes | Manual Check |
|---|-----------|-----------|---------|-------------|
| 4.1 | `media` | `media` | **PK changed: BIGINT `id` → UUID** (old `uuid` column becomes new `id`); `model_type`: `App\Models\Business` → `business`; Added: `path` (constructed: `{collection_name}/{uuid}/{file_name}`); Added (046): `manipulations` (JSONB from Spatie MediaLibrary); Relaxed (046): `mime_type`, `path` now nullable; `custom_properties`, `generated_conversions`, `responsive_images` json → jsonb; `uploaded_by` varchar → UUID; Added: `deleted_at` (NULL); BIGINT→UUID ID mapping built for downstream tables | Spot check `path` format; Verify `model_type` lowercase |
| 4.2 | `broker_profiles` | `broker_profiles` | Added (048): `city_id` (UUID), `location_city` (JSONB), `location_county` (JSONB), `location_state` (JSONB) — composite types parsed to JSONB; `has_signed_contract` (BOOLEAN, default true); Dropped (048): `brokerage_name`, `brokerage_office`, `brokerage_address`; Kept: `role`, `bio_url` | Spot check location JSONB format; Verify `has_signed_contract` |
| 4.3 | `brokerages` | `brokerages` | Direct copy — simple schema now; Dropped (047): `organization_id`, `license_number`, `license_state`, `license_expiry`, `website`, `logo_url`, `is_verified`, `verified_at`, `verified_by`; No complex org-finding logic needed | Verify count |
| 4.4 | `offices` | `offices` | Direct mapping — `address` same name in both DBs now; Dropped (049): `address_line1`, `address_line2`, `city`, `state`, `zip_code`, `country`, `phone`, `fax`, `email`, `is_headquarters`, `is_active`, `latitude`, `longitude` (13 columns) | Verify count |
| 4.5 | `user_brokerage_offices` | `user_brokerage_offices` | Added (050): `created_by`, `modified_by`, `deleted_by` from old DB; Rows with NULL `brokerage_id` or `office_id` still skipped (NOT NULL in new DB) | Confirm skipped rows acceptable |
| 4.6 | `document_requests` | `document_requests` | Dropped (051): `document_name`; Added (051): `requested_at`, `created_by`, `modified_by`, `deleted_by` from old DB; `media_id` already UUID, no mapping needed | Verify count |
| 4.7 | `business_notes` | `business_notes` | Renames: `sender_id` → `author_id`; `message` → `content`; `message_type` → `note_type`; Added (053): `is_updated` (from old DB); `attachments` json → jsonb; Added: `deleted_at` (NULL) | Spot check `author_id` = old `sender_id` |
| 4.8 | `business_messages` | `business_messages` | Rename: `message` → `content`; Added (055): `message_type`, `is_updated` (from old DB — restored in new DB); `attachments` json → jsonb; Added: `deleted_at` (NULL) | Verify count |
| 4.9 | `prequalification_letters` | `prequalification_letters` | Rename: `modified_by` → `modified_by` (same name now per 060; was `updated_by` before); `media_id` already UUID; All financial decimals preserved; Added: `deleted_at` (preserved from old) | Spot check financial values |
| 4.10 | `audit_logs` | `audit_logs` | Renames: `model` → `auditable_type` (polymorphic: `App\Models\X` → `x`); `model_id` → `auditable_id`; `payload` JSONB → split: `deleted` events → `old_values`, other events → `new_values`; Rows with NULL `model_id` **excluded**; Dropped: `id_serial`; Migration 052: Table now partitioned by `created_at` (monthly). PK changed to composite `(id, created_at)`. Uses `batchInsertComposite` with `ON CONFLICT (id, created_at) DO NOTHING`. | Spot check `auditable_type`; Verify payload split |
| 4.11 | `assignment_history` | `assignment_history` | Direct mapping now (054 aligned with old DB): `assignment_method` → `assignment_type`; `assignment_reason` → `reason`; `assigned_user_id` → `assigned_user_id` (same name); `metadata` → `metadata` (JSONB, same name); `assigned_by` now nullable (no fallback UUID needed); Dropped (054): `previous_assignee_id`, `new_assignee_id`, `assigned_at` | Verify count; Spot check `assignment_type` values |

### Phase 5: Tokens & Miscellaneous

| # | Old Table | New Table | Changes | Manual Check |
|---|-----------|-----------|---------|-------------|
| 5.1 | `user_agreements` | `user_agreements` | `accepted_at` now nullable (relaxed by 056); No fallback needed; Added: `deleted_at` (NULL) | Verify count |
| 5.2 | `api_keys` | `api_keys` | `organization_id` now nullable (relaxed by 057); **All rows migrated** (no longer skip NULL org_id); Added: `deleted_at` (NULL) | Verify count |
| 5.3 | `business_claim_tokens` | `business_claim_tokens` | Rename: `used` → `is_used`; Added: `deleted_at` (NULL); `reverted_at` type changed from TIMESTAMP → TIMESTAMPTZ (058) | Verify count |
| 5.4 | `business_upload_tokens` | `business_upload_tokens` | Rename: `used` → `is_used`; Dropped (059): `collection_name`, `requested_by`, `max_files`, `uploaded_files`, `used_at`; Added: `deleted_at` (NULL); Much simpler — no placeholder values needed | Verify count |
| 5.5 | `document_upload_tokens` | `document_upload_tokens` | Rename: `used` → `is_used`; Dropped (061): `model_type`, `model_id`, `collection_name`, `requested_by`, `max_files`, `uploaded_files`, `used_at`; Added (061): `revoked`, `webhook_url` from old DB; Added: `deleted_at` (NULL); Much simpler — no placeholder values needed | Verify count |
| 5.6 | `notification_batches` | `notification_batches` | Now aligns with PHP (062); Direct mapping: `recipient_id` → `user_id`; `notification_batch_type` → `batch_type`; `sent_at` preserved; Added (062): `recipient_email`, `event`, `data` (JSONB), `batch_identifier`, `is_admin`, `business_id` from old DB; Dropped (062): `notification_ids`, `scheduled_for`, `status`, `error_message`; NULL `recipient_id` rows still skipped | **IMPORTANT**: Confirm skipped rows; Spot check `batch_type` |

### Phase 6: Remaining Tables (Flyway-aligned)

| # | Old Table | New Table | Changes | Manual Check |
|---|-----------|-----------|---------|-------------|
| 6.1 | `notifications` | `notifications` | `notifiable_type` polymorphic transform (`App\Models\User` → `user`); `data` TEXT → JSONB via `JSON.stringify`; Added: `deleted_at` (NULL) | Spot check `data` is valid JSON |
| 6.2 | `business_statuses` | `business_statuses` | Table created via Flyway 027; Direct copy; Added: `deleted_at` (NULL) | Spot check status values |
| 6.3 | `user_business_messages` | `user_business_messages` | Table created via Flyway 028; Direct copy; Added: `deleted_at` (NULL) | Check `business_message_id` references valid messages |
| 6.4 | `user_business_notes` | `user_business_notes` | Table created via Flyway 029; Direct copy; Added: `deleted_at` (NULL) | Check `business_note_id` references valid notes |
| 6.5 | `crm_sync_outbox` | `crm_sync_outbox` | Table created via Flyway 030; Direct copy; Added: `deleted_at` (NULL) | Verify count |
| 6.6 | `settings_assets` | `settings_assets` | Direct copy: `id`, `name`, `description`, `parent_id`; `is_active` dropped (064); **Seed data truncated before insert** | Check `parent_id` hierarchy |
| 6.7 | `settings_asset_properties` | `settings_asset_properties` | Renames: `settings_asset_id` → `asset_id`; `is_overridable` → `is_user_overridable`; `value` JSON → JSONB; `value_type` dropped (064); Orphaned cols dropped (Flyway 036); **Individual inserts** (not batch) due to partial unique index; Source query **deduplicates** `(settings_asset_id, key)` via `ROW_NUMBER()` — keeps most recently updated active row per group | Verify count; Spot check deduplicated keys |
| 6.8 | `settings_asset_property_histories` | `settings_asset_property_histories` | Old schema only 4 cols; **id BIGINT → UUID** (`crypto.randomUUID()`); Renames: `property_id` → `settings_asset_property_id`; `old_value` → `value` | Verify count |

### Tables Not Migrated

| Old Table | New Table | Reason |
|-----------|-----------|--------|
| `backyard_partner_mappings` | _(not in new DB)_ | 0 records in old DB; table does not exist in new DB |
| _(not in old DB)_ | `organization_admins` | New table only; no source data in old DB |
| _(not in old DB)_ | `refresh_tokens` | New table only; empty at migration time |
| _(not in old DB)_ | `business_status_histories` | New table only; empty at migration time |
| `password_reset_tokens` | _(dropped)_ | Dropped (065) — tokens expired, no legacy data |
| `user_setting_overrides` | _(dropped)_ | Dropped (065) — Kotlin-only, no legacy data |
| `organization_setting_overrides` | _(dropped)_ | Dropped (065) — Kotlin-only, no legacy data |

### Tables Dropped from New DB (Flyway 037)

| Table | Reason |
|-------|--------|
| `dsca_media` (old name: `dscra_media`) | **Confirmed not in old DB** — PHP migration `2025_12_02_084918_remove_unused_tables.php` dropped it; verified via live query (`SELECT EXISTS ... → false`). New DB had Flyway schema + Kotlin stubs but no repository, service, or controller (dead code). |

---

## 4. Key Transformations

### 4.1 PostgreSQL Composite Types

The Legacy DB uses custom composite types that must be parsed into plain columns:

| Composite Type | Format | Used In |
|---------------|--------|---------|
| `state_type` | `("uuid","California","california","CA")` | `users.location_state`, `businesses.location_state`, `broker_profiles.location_state` |
| `table_item_type` | `("uuid","California","california")` | `users.location_city/county`, `businesses.location_city/county/industry`, `broker_profiles.location_city/county` |
| `naics_type` | `("uuid","4213","Office administrative services")` | `businesses.naics_code` |

### 4.2 Primary Key Mapping (BIGINT → UUID)

| Table | Old PK | New PK | Strategy |
|-------|--------|--------|----------|
| `roles` | BIGINT auto-increment | UUID | Match by `name`, generate new UUID |
| `permissions` | BIGINT auto-increment | UUID | Match by `name`, generate new UUID |
| `media` | BIGINT `id` + `uuid` column | UUID `id` | Use old `uuid` column as new `id` |

ID mappings are built in-memory and used by downstream tables (`model_has_roles`, `model_has_permissions`, `document_requests`, etc.).

### 4.3 Polymorphic `model_type` Mapping

| Old Value (PHP) | New Value (Kotlin) | Affected Tables |
|-----------------|-------------------|-----------------|
| `App\Models\User` | `user` | `model_has_roles`, `model_has_permissions`, `media`, `audit_logs`, `notifications` |
| `App\Models\Business` | `business` | `media`, `audit_logs` |
| `App\Models\Organization` | `organization` | `audit_logs` |

### 4.4 Enum Compatibility

All enum values are **fully compatible** between PHP and Kotlin — no transformation needed. Kotlin enums store as lowercase strings (e.g., `ACTIVE` → `"active"`, `SUPER_ADMIN` → `"super-admin"`), which match the existing PHP database values exactly.

---

## 5. Data Warnings & Known Issues

| Issue | Table | Detail | Action Required |
|-------|-------|--------|-----------------|
| Skipped NULL FK rows | `user_brokerage_offices` | Rows skipped where `brokerage_id` or `office_id` is NULL | Verify these are orphaned/invalid data |
| Skipped NULL `model_id` | `audit_logs` | Rows excluded where `model_id` is NULL | Verify these are system-level logs |
| Skipped NULL `recipient_id` | `notification_batches` | Rows skipped where `recipient_id` is NULL | Verify these are broadcast/system notifications |
| Deduplicated rows | `business_tags` | Duplicate `(business_id, tag_id)` pairs removed; kept earliest `created_at` | Confirm dedup is expected |
| Deduplicated keys | `settings_asset_properties` | Source query deduplicates `(settings_asset_id, key)` via `ROW_NUMBER()` — keeps most recently updated active row | Verify deduplicated count matches expectations |
| Seed data truncated | `settings_assets`, `states`, `industries` | New DB seed data truncated before inserting old data | Verify seed data not needed post-migration |

---

## 6. Goals

1. **Zero data loss** — All active and soft-deleted records must be migrated
2. **UUID preservation** — All existing UUIDs are preserved where both databases use UUID PKs
3. **Timestamp preservation** — Original `created_at` and `updated_at` values are maintained (triggers disabled during migration)
4. **Audit trail integrity** — `audit_logs` history is accurately preserved with correct type mappings
5. **Idempotent execution** — Migration can be re-run safely (`ON CONFLICT DO NOTHING`)
6. **Automated verification** — Phase 7 compares record counts between old and new databases for all 46 tables

---

## 7. Execution Plan

### Pre-Migration

1. `pg_dump` Legacy DB → `backup-pre-migration.sql`
2. Ensure New DB has all 65 Flyway migrations applied (000-065): `cd service-io && make clean-migrate`
3. Run seed files for: roles, permissions, settings_assets, settings_asset_properties
4. Test migration tool on staging/local environment

### Migration Day

1. Stop Legacy PHP service (prevent writes)
2. Final `pg_dump` (point-in-time snapshot)
3. Disable `update_updated_at` triggers on New DB
4. Run migration tool: Phase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7
5. Re-enable triggers
6. Start New Kotlin service
7. Smoke test critical user flows

### Rollback Plan

- **If migration fails**: Restore Legacy DB from backup, restart PHP service
- **New DB recovery**: Drop and recreate from Flyway migrations + seeds
- **Migration tool is idempotent**: Can re-run after fixing issues

---

## 8. Verification

Phase 7 performs automated count comparison across all 46 migrated tables:

```
Last Run: (pending re-test after Flyway 042-065)
Tables checked: —
PASS: —, WARN: —, FAIL: —
Total records: —
```

### Manual Verification Checklist

- [ ] Spot check 5 users: `bio_url`, `communication_consent_at` preserved
- [ ] Spot check 5 businesses: `slug`, `asking_price`, `status`, `pre_qualification_status`
- [ ] Verify role assignments: `model_has_roles` count matches old DB
- [ ] Verify `audit_logs` payload split: `deleted` events → `old_values`, others → `new_values`
- [ ] Verify `media` path format: `{collection_name}/{uuid}/{file_name}`
- [ ] Spot check `broker_profiles` location JSONB format; Verify `has_signed_contract`
- [ ] Spot check `business_pre_qualifications`: `status`, `submitted_at`, `reason`, `lender_note`
- [ ] Verify `assignment_history` count; Spot check `assignment_type` values
- [ ] Confirm `settings_asset_properties` deduplicated count is expected (source query uses `ROW_NUMBER()`)
- [ ] Smoke test: login, create business, view business list in new Kotlin app

---

## 9. Schema Alignment Summary (Flyway 036-065)

Before migration can run, the new Kotlin DB schema was aligned with the old PHP DB via Flyway migrations 036-065:

### Flyway 036-041: Initial cleanup

| Migration | Changes |
|-----------|---------|
| **036** | Drop 8 `search_vector` columns + related triggers/functions (not in old DB) |
| **037** | Drop `dsca_media` table (confirmed dead code); Redesign `business_listing_extensions` to match old PHP schema |
| **038** | Align reference tables: `states.code`→`short`, add `slug` to counties/cities/industries; Drop `is_active`, `fips_code`, `latitude/longitude` etc. from reference tables |
| **039** | Add location UUID columns (`state_id`, `county_id`, `city_id`) to `users` table |
| **040** | Drop 45 new-only columns from `businesses`; Rename `address_line1`→`address`, `is_dba`→`has_dba` |
| **041** | Drop new-only columns from pivot tables: `tags` (color, description, organization_id), `business_organizations` (relationship_type, assigned_at, assigned_by), `business_tags` (tagged_by), `business_pre_qualifications` (10 SBA/assignment/extension columns) |

### Flyway 042-065: Align Kotlin schema with PHP legacy

| Migration Range | Changes |
|-----------------|---------|
| 042-043 | Align `users` (drop address fields, add `bio_url`/`communication_consent_at`) and `businesses` (drop 11 cols, add `slug`/`changed_values`/`ytd_pnl_expiry_date`) |
| 044-046 | Align `business_pre_qualifications` (`reason`/`lender_note`), `temporary_files`, `media` (add `manipulations`) |
| 047-050 | Simplify `brokerages` (drop org_id), add location JSONB to `broker_profiles`, simplify `offices`, add audit cols to `user_brokerage_offices` |
| 051-055 | Align `document_requests`, partition `audit_logs`, add `is_updated` to notes/messages, revert `assignment_history` to PHP schema |
| 056-061 | Relax nullability (`user_agreements`, `api_keys`), simplify token tables, align `prequalification_letters` (`modified_by`) |
| 062-065 | Align `notification_batches` (add PHP columns, re-added `sent_at`), simplify `settings` tables, drop 3 unused tables |

These changes ensure the new DB schema is a **superset** of the old DB — all old columns exist (possibly renamed), and only new-DB-specific columns remain for future features.
