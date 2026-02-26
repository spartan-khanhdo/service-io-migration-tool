import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 1.5";

/**
 * Migrate industries table.
 *
 * Old: industries(id UUID, name, slug, created_at, updated_at)
 * New: industries(id UUID, name, slug, created_at, updated_at, deleted_at)
 *
 * Direct copy + add deleted_at=NULL.
 * UUID preserved.
 */
export async function migrateIndustries(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting industries migration...");

  const { rows } = await oldDb.query(
    `SELECT id, name, slug, created_at, updated_at FROM industries ORDER BY name`
  );

  log(PHASE, `Found ${rows.length} industries in old DB`);

  if (rows.length === 0) return;

  const columns = ["id", "name", "slug", "created_at", "updated_at", "deleted_at"];
  const values = rows.map((r) => [
    r.id,
    r.name,
    r.slug,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    null,  // deleted_at
  ]);

  const inserted = await batchInsert(newDb, "industries", columns, values, { phase: PHASE });

  log(PHASE, `Industries migration complete: ${inserted} inserted out of ${rows.length}`);
}
