# Task 30: Migrate Business Listing Extensions

## Phase
Phase 4 — Supporting Data

## Source
- **Old table**: `business_listing_extensions` (PK: INT)

## Target
- **New table**: `business_listing_extensions`
- Check Kotlin entity for exact schema changes

## Transformation Rules
Check for PK type change and any column additions/removals.

## File
`src/phases/phase-4/migrate-business-listing-extensions.ts`

## Dependencies
- Task 00, Task 13
