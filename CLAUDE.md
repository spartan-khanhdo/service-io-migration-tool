# Service IO Migration Tool

## Overview
Migration tool to transfer data from the old PHP/Laravel database (`service-loanbud-io`) to the new Kotlin/Exposed database (`service-io`).

**Status**: Updated for Flyway 000-065. Needs re-testing after schema alignment migrations 042-065.

## Tech Stack
- **Runtime**: Node.js
- **Language**: TypeScript (strict mode)
- **Package Manager**: pnpm@10.25.0
- **Database Client**: `pg` (node-postgres)
- **Build**: tsx (for running TS directly)

## Project Structure
```
src/
├── index.ts                 # Entry point - orchestrates phases
├── config/
│   ├── database.ts          # Old DB + New DB connection pool config
│   └── ssh-tunnel.ts        # Optional SSH tunnel for AWS RDS
├── parser/
│   ├── composite-type.ts    # Parse PostgreSQL composite types (table_item_type, state_type, naics_type)
│   └── polymorphic.ts       # Transform model_type values (App\Models\X → x)
├── mapping/
│   └── id-mapping-store.ts  # In-memory old_id → new_uuid mapping (roles, permissions, media)
├── phases/
│   ├── phase-0-validate.ts  # Pre-flight checks (DB connectivity, table existence, Flyway state)
│   ├── phase-1/             # Reference data: states, counties, cities, city_counties, industries, naics_codes (6 tables)
│   ├── phase-2/             # Core entities: organizations, roles, permissions, users, model_has_roles/permissions, role_has_permissions (7 tables)
│   ├── phase-3/             # Business & related: businesses, business_organizations, business_users, user_organizations, pre_qualifications, tags, business_tags, business_listing_extensions (8 tables)
│   ├── phase-4/             # Supporting data: media, broker_profiles, brokerages, offices, user_brokerage_offices, document_requests, business_notes, business_messages, prequalification_letters, audit_logs, assignment_history (11 tables)
│   ├── phase-5/             # Tokens: user_agreements, api_keys, business_claim_tokens, business_upload_tokens, document_upload_tokens, notification_batches (6 tables)
│   ├── phase-6/             # Remaining: notifications, business_statuses, user_business_messages, user_business_notes, crm_sync_outbox, settings_assets, settings_asset_properties, settings_asset_property_histories (9 tables — note: settings_asset_properties uses individual inserts due to partial unique index)
│   └── phase-7-verify.ts    # Post-migration validation: row count comparison across all 46 tables
└── util/
    ├── batch.ts             # Batch insert processor (default 500 rows/batch, ON CONFLICT DO NOTHING)
    └── logger.ts            # Timestamped progress logging with phase identifiers
```

**Total: 48 migration files** (7 phase orchestrators + 47 individual table migrations + 1 verification)

## Conventions
- One file per table migration (e.g., `migrate-users.ts`, `migrate-businesses.ts`)
- Each migration file exports a single async function: `export async function migrateXxx(oldDb, newDb, idMap)`
- Use parameterized queries (`$1, $2`) - NEVER string interpolation for SQL
- All migrations must be idempotent (use `ON CONFLICT DO NOTHING` or truncate-then-insert)
- Log progress: `[Phase X] Migrating table_name: 0/1000 done`
- Preserve original `created_at`, `updated_at` timestamps - do NOT let triggers override them

## Database Connections
- **Old DB**: Read-only connection to PHP Laravel PostgreSQL database (pool max: 5)
- **New DB**: Read-write connection to Kotlin service PostgreSQL database (pool max: 10)
- Connection config via environment variables (see `.env.example`)
- Optional SSH tunnel support for AWS RDS access

## Running
```bash
pnpm install
pnpm migrate                    # Run full migration (all phases 0-7)
pnpm migrate -- --phase=3       # Run specific phase
pnpm migrate -- --dry-run       # Dry run mode
pnpm migrate:verify             # Run verification only (phase 7)
```

## Prerequisites
- **New DB must have all 65 Flyway migrations applied** (000-065)
  ```bash
  cd /path/to/service-io && make clean-migrate
  ```
- Seed files for roles, permissions, settings_assets will be **truncated** during migration

## Key Transformations
1. **Composite Types**: PHP uses PostgreSQL composite types (`table_item_type`, `state_type`, `naics_type`) → parse and extract plain values or convert to JSONB
2. **ID Mapping**: Roles/Permissions changed from BIGINT → UUID (matched by `name`). Media BIGINT `id` → old `uuid` column becomes new `id`
3. **Polymorphic model_type**: `App\Models\User` → `user`, `App\Models\Business` → `business`, `App\Models\Organization` → `organization` (+ 10 other model types)
4. **Media PK**: BIGINT `id` + `uuid` column → UUID as PK (use old `uuid` column as new `id`)
5. **Table renames**: `business_user` → `business_users`
6. **Column renames**: `sender_id` → `author_id`, `message` → `content` (business_notes); `used` → `is_used` (token tables); `pre_qualification_status` → `status` (pre_qualifications); `assignment_method` → `assignment_type`, `assignment_reason` → `reason` (assignment_history)
7. **Schema alignment (Flyway 036-065)**: Removed Kotlin-only columns, added PHP-only columns, aligned schemas between both services

## Flyway Migration Alignment

The new Kotlin DB requires **65 Flyway migrations (000-065)**. Key schema changes:

| Migration Range | Description |
|-----------------|-------------|
| 036-041 | Initial cleanup: drop search_vectors, dsca_media, align reference tables, drop new-only columns |
| 042-043 | Align users (drop address fields, add bio_url) and businesses (drop 11 cols, add slug/changed_values) |
| 044-046 | Align pre_qualifications (reason/lender_note), temporary_files, media (add manipulations) |
| 047-050 | Align brokerages (drop org_id), broker_profiles (add location JSONB), offices (simplify), user_brokerage_offices (add audit cols) |
| 051-055 | Align document_requests, partition audit_logs, business_notes/messages (add is_updated), assignment_history (revert to PHP schema) |
| 056-061 | Relax nullability (user_agreements, api_keys), simplify token tables, align prequalification_letters |
| 062-065 | Align notification_batches (PHP columns, re-added sent_at), drop unique indexes, simplify settings tables, drop unused tables |

## Important Notes
- Enum values are COMPATIBLE between PHP and Kotlin (no transformation needed)
- Both databases are PostgreSQL
- New DB has NO foreign key constraints (enforced at app layer)
- All tables use soft deletes (`deleted_at`)
- Disable `update_updated_at` triggers before migration, re-enable after
- Results saved to `migration-results.json` for verification
- audit_logs is now partitioned — uses composite PK (id, created_at) for ON CONFLICT
- broker_profiles location composites → JSONB conversion
- api_keys now accepts NULL organization_id (no rows skipped)
- brokerages migration simplified (no org_id lookup needed)
- notification_batches: `sent_at` preserved (re-added to new schema)
- settings_asset_properties: source query deduplicates `(settings_asset_id, key)` via `ROW_NUMBER()` to avoid partial unique index violations
