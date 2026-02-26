import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 1.1";

/**
 * Migrate states table.
 *
 * Old: states(id UUID, name, slug, short, created_at, updated_at)
 * New: states(id UUID, name, slug, short, created_at, updated_at, deleted_at)
 *
 * Direct copy + add deleted_at=NULL.
 * UUID preserved — no ID mapping needed.
 */
export async function migrateStates(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting states migration...");

  const { rows } = await oldDb.query(
    `SELECT id, name, slug, short, created_at, updated_at FROM states ORDER BY name`
  );

  log(PHASE, `Found ${rows.length} states in old DB`);

  if (rows.length === 0) return;

  const columns = ["id", "name", "slug", "short", "created_at", "updated_at", "deleted_at"];
  const values = rows.map((r) => [
    r.id,
    r.name,
    r.slug,
    r.short,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    null,
  ]);

  const inserted = await batchInsert(newDb, "states", columns, values, { phase: PHASE });

  log(PHASE, `States migration complete: ${inserted} inserted out of ${rows.length}`);
}
