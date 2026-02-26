# Task 09: Migrate Permissions

## Phase
Phase 2 — Core Entities

## Strategy
Same as roles — DO NOT migrate data. Build ID mapping by matching on `name`.

1. New DB should already have permissions seeded (from `03-permissions.sql`)
2. Match old permission names to new permission UUIDs
3. Build `IdMappingStore.set('permissions', old_bigint_id, new_uuid)`

## File
`src/phases/phase-2/migrate-permissions.ts`

## Dependencies
- Task 00
- New DB must have permissions seeded first
