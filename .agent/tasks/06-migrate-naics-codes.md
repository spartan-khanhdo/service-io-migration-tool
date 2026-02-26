# Task 06: Migrate NAICS Codes

## Phase
Phase 1 — Reference Data

## Source
- **Old table**: `naics_codes`
- **Old columns**: `id`, `title`, `code`, `created_at`, `updated_at`

## Target
- **New table**: `naics_codes`
- **New columns**: Check Kotlin entity for exact schema

## Transformation Rules
Mostly direct copy. Check if PK type changed.

## File
`src/phases/phase-1/migrate-naics-codes.ts`

## Dependencies
- Task 00
