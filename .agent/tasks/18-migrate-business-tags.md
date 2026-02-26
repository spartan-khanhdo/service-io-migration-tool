# Task 18: Migrate Business Tags

## Phase
Phase 3 — Business & Related

## Source
- **Old table**: `business_tags` (PK: UUID)

## Target
- **New table**: `business_tags`

## Transformation Rules
Direct copy — both UUID.

## File
`src/phases/phase-3/migrate-business-tags.ts`

## Dependencies
- Task 00, Task 13, Task 17
