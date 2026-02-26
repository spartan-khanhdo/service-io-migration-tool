import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 1.2";

/**
 * Migrate counties table.
 *
 * Old: counties(id UUID, state_id UUID, name, slug, created_at, updated_at)
 * New: counties(id UUID, state_id UUID, name, slug, created_at, updated_at, deleted_at)
 *
 * Direct copy + add deleted_at=NULL.
 * UUID preserved for both id and state_id.
 */
export async function migrateCounties(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting counties migration...");

  const { rows } = await oldDb.query(
    `SELECT id, state_id, name, slug, created_at, updated_at FROM counties ORDER BY name`
  );

  log(PHASE, `Found ${rows.length} counties in old DB`);

  if (rows.length === 0) return;

  const columns = ["id", "state_id", "name", "slug", "created_at", "updated_at", "deleted_at"];
  const values = rows.map((r) => [
    r.id,
    r.state_id,
    r.name,
    r.slug,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    null,  // deleted_at
  ]);

  const inserted = await batchInsert(newDb, "counties", columns, values, { phase: PHASE });

  log(PHASE, `Counties migration complete: ${inserted} inserted out of ${rows.length}`);
}
