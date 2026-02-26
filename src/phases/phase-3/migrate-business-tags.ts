import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";

const PHASE = "Phase 3.7";

/**
 * Migrate business_tags table.
 *
 * Old: business_tags(id, business_id, tag_id, created_at, updated_at)
 * New: business_tags(id, business_id, tag_id, created_at, updated_at, deleted_at)
 *
 * New DB has partial unique index: (business_id, tag_id) WHERE deleted_at IS NULL
 * Old DB may have duplicates, so we deduplicate and insert one by one.
 */
export async function migrateBusinessTags(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting business_tags migration...");

  const { rows } = await oldDb.query(
    `SELECT DISTINCT ON (business_id, tag_id) id, business_id, tag_id, created_at, updated_at
     FROM business_tags ORDER BY business_id, tag_id, created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} unique business_tags in old DB`);
  if (rows.length === 0) return;

  let inserted = 0;
  for (const r of rows) {
    try {
      const result = await newDb.query(
        `INSERT INTO business_tags (id, business_id, tag_id, created_at, updated_at, deleted_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [r.id, r.business_id, r.tag_id, r.created_at ?? new Date(), r.updated_at ?? new Date(), null]
      );
      inserted += result.rowCount ?? 0;
    } catch {
      // Skip duplicates from partial unique constraint
    }
  }

  log(PHASE, `Business tags migration complete: ${inserted} inserted out of ${rows.length}`);
}
