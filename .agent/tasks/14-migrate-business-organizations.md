# Task 14: Migrate Business Organizations

## Phase
Phase 3 — Business & Related

## Source
- **Old table**: `business_organizations` (PK: UUID)

## Target
- **New table**: `business_organizations` (PK: UUID)

## Transformation Rules
Direct copy — both UUID PKs, same schema.

## File
`src/phases/phase-3/migrate-business-organizations.ts`

## Dependencies
- Task 00, Task 07, Task 13
