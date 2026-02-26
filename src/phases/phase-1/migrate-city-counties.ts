import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 1.4";

/**
 * Migrate city_counties table.
 *
 * Old: city_counties(id UUID, city_id UUID, county_id UUID, created_at, updated_at)
 * New: city_counties(id UUID, city_id UUID, county_id UUID, created_at, updated_at, deleted_at)
 *
 * Transform: add deleted_at=NULL
 * UUID preserved.
 */
export async function migrateCityCounties(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting city_counties migration...");

  const { rows } = await oldDb.query(
    `SELECT id, city_id, county_id, created_at, updated_at FROM city_counties`
  );

  log(PHASE, `Found ${rows.length} city_counties in old DB`);

  if (rows.length === 0) return;

  const columns = ["id", "city_id", "county_id", "created_at", "updated_at", "deleted_at"];
  const values = rows.map((r) => [
    r.id,
    r.city_id,
    r.county_id,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    null,   // deleted_at
  ]);

  const inserted = await batchInsert(newDb, "city_counties", columns, values, { phase: PHASE });

  log(PHASE, `City counties migration complete: ${inserted} inserted out of ${rows.length}`);
}
