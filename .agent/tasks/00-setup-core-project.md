# Task 00: Setup Core Project

## Phase
Setup

## Priority
HIGHEST — All other tasks depend on this

## Description
Initialize the Node.js/TypeScript migration tool project with all core infrastructure.

## Deliverables

### 1. Project Init
- `package.json` with scripts: `migrate`, `migrate:phase1`, ..., `migrate:verify`
- `tsconfig.json` (strict mode)
- `.env.example` with OLD_DB_* and NEW_DB_* variables
- `.gitignore`
- `pnpm-lock.yaml`

### 2. Dependencies
- `pg` — PostgreSQL client
- `dotenv` — Environment variables
- `tsx` — Run TypeScript directly
- `typescript` — Type checking
- `@types/pg`, `@types/node`

### 3. Core Modules

#### `src/config/database.ts`
- `createOldDbPool()` — Read-only connection to old PHP DB
- `createNewDbPool()` — Read-write connection to new Kotlin DB
- Connection pooling with `pg.Pool`

#### `src/parser/composite-type.ts`
- `parseTableItemType(raw: string): { id: string, name: string, slug: string } | null`
- `parseStateType(raw: string): { id: string, name: string, slug: string, short: string } | null`
- `parseNaicsType(raw: string): { id: string, code: string, title: string } | null`
- Handle NULL, empty string, and malformed values

#### `src/parser/polymorphic.ts`
- `transformModelType(phpModelType: string): string`
- Map: `App\Models\User` → `user`, `App\Models\Business` → `business`, `App\Models\Organization` → `organization`

#### `src/mapping/id-mapping-store.ts`
- In-memory store: `Map<string, Map<string|number, string>>`
- `set(table: string, oldId: string|number, newId: string): void`
- `get(table: string, oldId: string|number): string | undefined`
- `getOrThrow(table: string, oldId: string|number): string`

#### `src/util/batch.ts`
- `batchInsert(pool, table, columns, rows, batchSize=500)`
- Use `ON CONFLICT DO NOTHING` for idempotency
- Log progress every batch

#### `src/util/logger.ts`
- `log(phase: string, message: string)`
- Timestamp + phase prefix

#### `src/index.ts`
- Entry point that orchestrates Phase 0 → 6
- Accept CLI args: `--phase=1`, `--table=users`, `--dry-run`

### 4. Phase 0: Validation
#### `src/phases/phase-0-validate.ts`
- Verify old DB connection
- Verify new DB connection
- Count records in old DB per table
- Verify new DB tables exist (Flyway migrations applied)
- Log summary

## Acceptance Criteria
- [ ] `pnpm install` succeeds
- [ ] `pnpm migrate --dry-run` connects to both DBs and logs table counts
- [ ] Composite type parser handles: valid values, NULL, empty strings
- [ ] ID mapping store works correctly
- [ ] All types compile with strict TypeScript

## Dependencies
None
