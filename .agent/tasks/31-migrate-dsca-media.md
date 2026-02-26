# Task 31: Migrate DSCA Media

## Phase
Phase 4 — Supporting Data

## Source
- **Old table**: `dscra_media`
- **Old columns**: `id`, `dscra_id`, `media_id`

## Target
- **New table**: `dsca_media`
- Table renamed: `dscra_media` → `dsca_media`

## Transformation Rules
- `media_id`: May need lookup from IdMappingStore('media') if references BIGINT
- `dscra_id`: Check if references DSCRA table which may also be renamed

## File
`src/phases/phase-4/migrate-dsca-media.ts`

## Dependencies
- Task 00, Task 19
