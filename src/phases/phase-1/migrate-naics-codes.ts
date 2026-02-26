import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 1.6";

/**
 * Migrate naics_codes table.
 *
 * Old: naics_codes(id UUID, code VARCHAR(6) UNIQUE, title, created_at, updated_at)
 * New: naics_codes(id UUID, code TEXT, title TEXT, created_at, updated_at, deleted_at)
 *
 * Direct copy + add deleted_at=NULL.
 * UUID preserved.
 */
export async function migrateNaicsCodes(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting naics_codes migration...");

  const { rows } = await oldDb.query(
    `SELECT id, code, title, created_at, updated_at FROM naics_codes ORDER BY code`
  );

  log(PHASE, `Found ${rows.length} naics_codes in old DB`);

  if (rows.length === 0) return;

  const columns = ["id", "code", "title", "created_at", "updated_at", "deleted_at"];
  const values = rows.map((r) => [
    r.id,
    r.code,
    r.title,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    null,     // deleted_at
  ]);

  const inserted = await batchInsert(newDb, "naics_codes", columns, values, { phase: PHASE });

  log(PHASE, `NAICS codes migration complete: ${inserted} inserted out of ${rows.length}`);
}
