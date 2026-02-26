# Task 39: Migrate Backyard Partner Mappings

## Phase
Phase 4 — Supporting Data

## Source
- **Old table**: `backyard_partner_mappings` (PK: UUID)

## Target
- **New table**: `backyard_partner_mappings` (PK: UUID)

## Transformation Rules
Direct copy — both UUID PKs.

## File
`src/phases/phase-4/migrate-backyard-partner-mappings.ts`

## Dependencies
- Task 00, Task 23
