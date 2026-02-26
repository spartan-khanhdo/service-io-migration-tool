# Migration Checklist

## Phase 1: Reference Data

**Note:** Seed data (states, industries) truncated via `TRUNCATE CASCADE` before insert to avoid unique constraint conflicts (`idx_states_short_unique`). Schema aligned with old DB via Flyway 038.

| old_table | new_table | note | manual_check |
|---|---|---|---|
| states | states | Direct copy: `id`, `name`, `slug`, `short`; Added `deleted_at` (NULL); NULL timestamps → fallback `CURRENT_TIMESTAMP` | [ ] Verify `short` values (e.g. "CA", "TX") |
| counties | counties | Direct copy: `id`, `state_id`, `name`, `slug`; Added `deleted_at` (NULL); NULL timestamps → fallback | [ ] Spot check 5 counties have correct `state_id` |
| cities | cities | Direct copy: `id`, `state_id`, `name`, `slug`; Added `deleted_at` (NULL); `search_vector` dropped (Flyway 036); NULL timestamps → fallback | [ ] Verify city count |
| city_counties | city_counties | `is_primary` dropped (Flyway 036 — unused); NULL timestamps → fallback | [ ] Verify count |
| industries | industries | Direct copy: `id`, `name`, `slug`; Added `deleted_at` (NULL); NULL timestamps → fallback | [ ] Verify count |
| naics_codes | naics_codes | Direct copy: `id`, `code`, `title`; Added `deleted_at` (NULL); `search_vector` dropped (Flyway 036); NULL timestamps → fallback | [ ] Verify `code` and `title` preserved |

## Phase 2: Core Entities

| old_table | new_table | note | manual_check |
|---|---|---|---|
| organizations | organizations | Direct copy; NULL timestamps → fallback | [ ] Verify count and soft-deleted records preserved |
| roles | roles | **PK changed: BIGINT → UUID** (new UUID auto-generated via `gen_random_uuid()`); ID mapping built by matching `name`; `ON CONFLICT (name, guard_name)` for idempotency | [ ] Verify all roles exist with correct names |
| permissions | permissions | **PK changed: BIGINT → UUID** (new UUID auto-generated); ID mapping built by matching `name`; Same conflict strategy as roles | [ ] Verify all permissions exist |
| users | users | Added `bio_url`, `communication_consent_at` from old DB; Dropped (042): `address_2`, `city`, `state_code`, `zipcode`, `country`, `state_id`, `city_id`, `county_id`; `two_factor_method='none'` → NULL; `status` normalized to lowercase; `source` default 'manual'; NULL timestamps → fallback | [ ] Spot check 5 users: `bio_url`, `communication_consent_at` |
| model_has_roles | model_has_roles | `role_id`: **BIGINT → UUID** (via ID mapping); `model_type`: `App\Models\User` → `user` (polymorphic transform) | [ ] Spot check role assignments |
| model_has_permissions | model_has_permissions | Same transforms as model_has_roles for `permission_id` and `model_type`; Old DB had 0 records | [ ] Confirm 0 records expected |
| role_has_permissions | role_has_permissions | `role_id`: **BIGINT → UUID**; `permission_id`: **BIGINT → UUID** (both via ID mapping) | [ ] Spot check super-admin has expected permissions |

## Phase 3: Business & Related

| old_table | new_table | note | manual_check |
|---|---|---|---|
| businesses | businesses | Only `naics_code` composite parsed now; Dropped (043): `industry_id`, `state_code`, `state_id`, `county_id`, `city_id`, `city`, `country`, `hide_address`, `is_featured`, `view_count`, `inquiry_count`; Added (043): `slug`, `ytd_pnl_expiry_date`, `changed_values` from old DB; `pre_qualification_status` defaults to 'draft'; `reporting_year` varchar → int; `cover_image`/`stamped_cover_image` json → jsonb; 45 new-only columns dropped (Flyway 040) | [ ] Spot check 5 businesses: `slug`, `status`, `pre_qualification_status` |
| business_organizations | business_organizations | Direct copy + `deleted_at` (NULL); `relationship_type`, `assigned_at`, `assigned_by` dropped (Flyway 041); NULL timestamps → fallback | [ ] Verify count |
| business_user | business_users | **Table renamed**: `business_user` → `business_users`; Added `deleted_at` (NULL); NULL timestamps → fallback | [ ] Verify count |
| user_organizations | user_organizations | Direct copy (schema identical); NULL timestamps → fallback | [ ] Check soft-deleted records preserved |
| business_pre_qualifications | business_pre_qualifications | Column renames: `pre_qualification_status` → `status`; `pre_qualification_sub_status` → `sub_status`; `pre_qualification_tertiary_status` → `tertiary_status`; `pre_qualification_reason` → `reason`; `lender_note` → `lender_note` (same name per 044); `pre_qualification_started_at` → `submitted_at`; `pre_qualification_ended_at` → `expires_at`; 10 new-only columns dropped (Flyway 041): SBA fields, assignment, extension, review/completed | [ ] Spot check `status`, `submitted_at`, `reason`, `lender_note` |
| tags | tags | Direct copy + `deleted_at` (NULL); `color`, `description`, `organization_id` dropped (Flyway 041); NULL timestamps → fallback | [ ] Verify count |
| business_tags | business_tags | Direct copy + `deleted_at` (NULL); `tagged_by` dropped (Flyway 041); **Deduplicated**: old DB had duplicate `(business_id, tag_id)` pairs → unique rows migrated (kept earliest `created_at`) | [ ] Confirm dedup is acceptable |

## Phase 4: Supporting Data

| old_table | new_table | note | manual_check |
|---|---|---|---|
| media | media | **PK changed: BIGINT `id` → UUID** (old `uuid` column becomes new `id`); `model_type`: `App\Models\Business` → `business` (polymorphic transform); Added `path` (constructed: `{collection_name}/{uuid}/{file_name}`); Added (046): `manipulations` (JSONB); Relaxed: `mime_type`, `path` now nullable; `custom_properties`, `generated_conversions`, `responsive_images` json → jsonb; `uploaded_by` varchar → UUID; Added `deleted_at` (NULL); BIGINT→UUID ID mapping built for downstream tables | [ ] Spot check `path` format; Verify `model_type` values are lowercase |
| broker_profiles | broker_profiles | Added (048): `city_id`, `location_city` (JSONB), `location_county` (JSONB), `location_state` (JSONB) — composites parsed to JSONB; `has_signed_contract` (default true); Dropped (048): `brokerage_name`, `brokerage_office`, `brokerage_address` | [ ] Spot check location JSONB; Verify `has_signed_contract` |
| brokerages | brokerages | Direct copy — simple schema; Dropped (047): `organization_id`, `license_number`, `license_state`, `license_expiry`, `website`, `logo_url`, `is_verified`, `verified_at`, `verified_by`; No org-finding logic needed | [ ] Verify count |
| offices | offices | Direct mapping — `address` same name in both DBs; Dropped (049): 13 columns (`address_line1`, `address_line2`, `city`, `state`, `zip_code`, `country`, `phone`, `fax`, `email`, `is_headquarters`, `is_active`, `latitude`, `longitude`) | [ ] Verify count |
| user_brokerage_offices | user_brokerage_offices | Added (050): `created_by`, `modified_by`, `deleted_by` from old DB; Rows with NULL `brokerage_id`/`office_id` skipped | [ ] Confirm skipped rows are acceptable |
| document_requests | document_requests | Dropped (051): `document_name`; Added (051): `requested_at`, `created_by`, `modified_by`, `deleted_by` from old DB; `media_id` already UUID | [ ] Verify count |
| business_notes | business_notes | `sender_id` → `author_id`; `message` → `content`; `message_type` → `note_type`; Added (053): `is_updated` from old DB; `attachments` json → jsonb; Added `deleted_at` (NULL) | [ ] Spot check `author_id` = old `sender_id` |
| business_messages | business_messages | `message` → `content`; Added (055): `message_type`, `is_updated` from old DB (restored); `attachments` json → jsonb; Added `deleted_at` (NULL) | [ ] Verify count |
| prequalification_letters | prequalification_letters | `modified_by` → `modified_by` (same name per 060); `media_id` already UUID, no mapping needed; All financial decimals preserved; Added `deleted_at` column (preserved from old) | [ ] Spot check financial values match |
| audit_logs | audit_logs | `model` → `auditable_type` (polymorphic: `App\Models\X` → `x`); `model_id` → `auditable_id`; `payload` JSONB → split: `deleted` events → `old_values`, other events → `new_values`; Rows with NULL `model_id` excluded; Dropped `id_serial`; Migration 052: Partitioned table, composite PK `(id, created_at)`, uses `batchInsertComposite` | [ ] Spot check `auditable_type` values; Verify payload split logic |
| assignment_history | assignment_history | Direct mapping (054 aligned with old DB): `assignment_method` → `assignment_type`; `assignment_reason` → `reason`; `assigned_user_id` same name; `metadata` JSONB same name; `assigned_by` nullable (no fallback UUID); Dropped (054): `previous_assignee_id`, `new_assignee_id`, `assigned_at` | [ ] Verify count |

## Phase 5: Tokens & Misc

| old_table | new_table | note | manual_check |
|---|---|---|---|
| user_agreements | user_agreements | `accepted_at` now nullable (056); No fallback needed; Added `deleted_at` | [ ] Verify count |
| api_keys | api_keys | `organization_id` now nullable (057); **All rows migrated**; Added `deleted_at` | [ ] Verify count |
| business_claim_tokens | business_claim_tokens | `used` → `is_used`; All other columns direct copy; Added `deleted_at` (NULL) | [ ] Verify count |
| business_upload_tokens | business_upload_tokens | `used` → `is_used`; Dropped (059): `collection_name`, `requested_by`, `max_files`, `uploaded_files`, `used_at`; Simple direct mapping now; Added `deleted_at` | [ ] Verify count |
| document_upload_tokens | document_upload_tokens | `used` → `is_used`; Dropped (061): `model_type`, `model_id`, `collection_name`, `requested_by`, `max_files`, `uploaded_files`, `used_at`; Added (061): `revoked`, `webhook_url` from old DB; Added `deleted_at` | [ ] Verify count |
| notification_batches | notification_batches | Now aligns with PHP (062); `recipient_id` → `user_id`; `notification_batch_type` → `batch_type`; `sent_at`/`processed_at` dropped (062 renames then drops); Added (062): `recipient_email`, `event`, `data` (JSONB), `batch_identifier`, `is_admin`, `business_id`; Dropped: `notification_ids`, `scheduled_for`, `status`, `error_message`, `processed_at`; NULL `recipient_id` skipped | [ ] Spot check `batch_type`, `event`, `data` |

## Phase 6: Remaining Tables (Flyway-aligned)

| old_table | new_table | note | manual_check |
|---|---|---|---|
| notifications | notifications | Schema already matches; `notifiable_type` polymorphic transform (`App\Models\User` → `user`); `data` TEXT → JSONB (`JSON.stringify` for valid JSONB); Added `deleted_at` (NULL) | [ ] Spot check `data` is valid JSON |
| business_statuses | business_statuses | **New table created via Flyway 027**; Direct copy: `id`, `business_id`, `user_id`, `status`; Added `deleted_at` (NULL) | [ ] Spot check status values |
| user_business_messages | user_business_messages | **New table created via Flyway 028**; Direct copy: `id`, `receiver_id`, `business_message_id`, `read_at`; Added `deleted_at` (NULL) | [ ] Check `business_message_id` references valid messages |
| user_business_notes | user_business_notes | **New table created via Flyway 029**; Direct copy: `id`, `receiver_id`, `business_note_id`, `read_at`; Added `deleted_at` (NULL) | [ ] Check `business_note_id` references valid notes |
| crm_sync_outbox | crm_sync_outbox | **New table created via Flyway 030**; Direct copy all columns; Added `deleted_at` (NULL) | [ ] Verify count |
| settings_assets | settings_assets | Direct copy: `id`, `name`, `description`, `parent_id`; `is_active` dropped (064); **Seed data truncated** | [ ] Check `parent_id` hierarchy |
| settings_asset_properties | settings_asset_properties | Old cols: `key`, `value` JSON, `description`, `is_inherited_from_parent_asset`, `is_overridable`, `settings_asset_id`, `source_property_id`, `user_id`, `created_by`, `updated_by`, `deleted_by`; Mappings: `settings_asset_id` → `asset_id`, `is_overridable` → `is_user_overridable`; `value_type` dropped (064); `value` JSON → JSONB (always `JSON.stringify`); Legacy cols added via Flyway 032+034; New-only unused cols (`name`, `default_value`, `display_order`, `group_name`, `note`) dropped (Flyway 036); `override_scope`+`validation_rules` dropped (Flyway 032); **Individual inserts** (not batch) due to partial unique index on `(asset_id, key)`; Duplicate `(asset_id, key)` pairs skipped | [ ] Investigate skipped duplicates |
| settings_asset_property_histories | settings_asset_property_histories | Old schema only 4 cols: `id` BIGINT, `modification_date`, `old_value` VARCHAR, `property_id` UUID; **id BIGINT → UUID** (`crypto.randomUUID()`); `property_id` → `settings_asset_property_id`; `old_value` → `value`; Schema aligned via Flyway 033+035 | [ ] Verify count |

## Phase 3.8: Business Listing Extensions (added via Flyway 037)

| old_table | new_table | note | manual_check |
|---|---|---|---|
| business_listing_extensions | business_listing_extensions | **Schema redesigned via Flyway 037** to match old PHP schema; Direct copy — all columns nullable except `business_id`; Added `deleted_at` (NULL); `listing_type` dropped (Flyway 041) | [ ] Spot check `ebitda`, `organization_status` |

## Not Migrated

| old_table | new_table | note | manual_check |
|---|---|---|---|
| backyard_partner_mappings | _(not in new DB)_ | Table does not exist in new DB Flyway migrations; Old DB had 0 records | [ ] N/A |
| _(not in old DB)_ | organization_admins | New table only; No source data in old DB | [ ] N/A |
| password_reset_tokens | _(dropped)_ | Dropped (065) | [ ] N/A |
| user_setting_overrides | _(dropped)_ | Dropped (065) | [ ] N/A |
| organization_setting_overrides | _(dropped)_ | Dropped (065) | [ ] N/A |

## Dropped Tables (Flyway 037)

| table | note |
|---|---|
| dsca_media (old: `dscra_media`) | **Confirmed not in old DB** — PHP migration `2025_12_02` dropped it; verified via live query. New DB had Kotlin stubs but NO repo/service/controller (dead code); `DscaMediaTable.kt` + `DscaMediaEntity.kt` deleted |

## Data Warnings Summary

| Issue | Table | Detail | Action Required |
|---|---|---|---|
| Skipped NULL FK rows | user_brokerage_offices | Rows skipped (NULL brokerage_id/office_id) | [ ] Verify these are orphaned/invalid data |
| Skipped NULL model_id | audit_logs | Rows excluded from query (NULL model_id) | [ ] Verify these are system-level logs without model |
| Skipped NULL recipient | notification_batches | Rows skipped (NULL recipient_id) | [ ] Verify these are broadcast/system notifications |
| Deduplicated rows | business_tags | Duplicates removed on (business_id, tag_id) | [ ] Confirm dedup is expected |
| Skipped duplicate keys | settings_asset_properties | Duplicate `(asset_id, key)` pairs in old DB skipped | [ ] Investigate if duplicates are stale data |
| Seed data truncated | settings_assets | New DB seed data truncated (cascade to properties + histories) before inserting old data | [ ] Verify seed data not needed post-migration |
| Seed data truncated | states/industries | New DB seed data truncated before Phase 1 insert | [ ] Verify seed data not needed post-migration |
