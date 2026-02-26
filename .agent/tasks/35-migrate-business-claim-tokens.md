# Task 35: Migrate Business Claim Tokens

## Phase
Phase 5 — Tokens

## Source
- **Old table**: `business_claim_tokens` (PK: UUID)

## Target
- **New table**: `business_claim_tokens` (PK: UUID)

## Transformation Rules
- Direct copy
- **Skip expired tokens**: `WHERE expires_at > NOW() OR used = true`
- Keep used tokens for audit trail

## File
`src/phases/phase-5/migrate-business-claim-tokens.ts`

## Dependencies
- Task 00, Task 07, Task 10, Task 13
