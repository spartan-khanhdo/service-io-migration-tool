# Task 07: Migrate Organizations

## Phase
Phase 2 — Core Entities

## Source
- **Old table**: `organizations` (PK: UUID)
- **Old columns**: `id`, `name`, `alias`, `created_by`, `modified_by`, `deleted_by`, `created_at`, `updated_at`, `deleted_at`

## Target
- **New table**: `organizations` (PK: UUID)
- **New columns**: `id`, `name`, `alias`, `created_by`, `modified_by`, `deleted_by`, `created_at`, `updated_at`, `deleted_at`

## Transformation Rules
Direct copy — schema is essentially identical, both use UUID PKs.

## File
`src/phases/phase-2/migrate-organizations.ts`

## Dependencies
- Task 00
