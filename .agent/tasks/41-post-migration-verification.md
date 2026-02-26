# Task 41: Post-Migration Verification

## Phase
Phase 6 — Verification

## Priority
HIGHEST — Must run after all migration phases

## Description
Verify data integrity after migration completes.

## Checks

### 1. Record Count Comparison
For each migrated table, compare:
- Old DB count (WHERE deleted_at IS NULL)
- New DB count (WHERE deleted_at IS NULL)
- Old DB count (including soft-deleted)
- New DB count (including soft-deleted)

### 2. Referential Integrity
Since new DB has no FK constraints, verify at application level:
- Users with `organization_id` referencing non-existent organizations
- Businesses with `seller_id`/`broker_id` referencing non-existent users
- Business_users referencing non-existent users or businesses
- model_has_roles referencing non-existent roles or users
- Document_requests referencing non-existent businesses or media

### 3. Spot Check Samples
For each major table, pick 5-10 random records and compare field-by-field:
- Users: email, name, status, location fields parsed correctly
- Businesses: name, asking_price, status, location/industry parsed correctly
- Media: model_type transformed, file metadata preserved

### 4. Enum Value Validation
Verify no invalid enum values exist in new DB:
- `SELECT DISTINCT status FROM users` — all should be valid UserStatus values
- `SELECT DISTINCT status FROM businesses` — all should be valid BusinessStatus values
- `SELECT DISTINCT model_type FROM model_has_roles` — should be `user`, not `App\Models\User`

### 5. UUID Integrity
- No NULL primary keys
- No duplicate UUIDs within tables

## File
`src/phases/phase-6-verify.ts`

## Deliverables
- Verification report (JSON or console output)
- PASS/FAIL status for each check
- List of any anomalies found

## Dependencies
- All previous tasks completed
