# Task 38: Migrate Organization Admins

## Phase
Phase 4 — Supporting Data

## Source
- **Old table**: `organization_admins`
- **Old columns**: `id`, `user_id`, `organization_id`, `status`, `accepted_at`, `rejected_at`, `created_at`, `updated_at`

## Target
- **New table**: `organization_admins`

## Transformation Rules
Direct copy. Check for schema differences.

## File
`src/phases/phase-4/migrate-organization-admins.ts`

## Dependencies
- Task 00, Task 07, Task 10
