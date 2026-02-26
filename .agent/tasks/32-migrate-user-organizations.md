# Task 32: Migrate User Organizations

## Phase
Phase 4 — Supporting Data

## Source
- **Old table**: `user_organizations` (PK: UUID)

## Target
- **New table**: `user_organizations` (PK: UUID)

## Transformation Rules
Direct copy — both UUID PKs, same schema.

## File
`src/phases/phase-4/migrate-user-organizations.ts`

## Dependencies
- Task 00, Task 07, Task 10
