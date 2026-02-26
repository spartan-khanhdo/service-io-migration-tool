# Task 15: Migrate Business Users

## Phase
Phase 3 — Business & Related

## Source
- **Old table**: `business_user` (pivot table)

## Target
- **New table**: `business_users` (PK: UUID)
- Table renamed from `business_user` → `business_users`

## Transformation Rules
Copy data, ensure new table has UUID PK and timestamps.

## File
`src/phases/phase-3/migrate-business-users.ts`

## Dependencies
- Task 00, Task 10, Task 13
