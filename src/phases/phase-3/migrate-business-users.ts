import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 3.3";

/**
 * Migrate business_user → business_users (table rename).
 *
 * Old: business_user(id, user_id, business_id, created_at, updated_at)
 * New: business_users(id, user_id, business_id, created_at, updated_at, deleted_at)
 */
export async function migrateBusinessUsers(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting business_users migration (from business_user)...");

  const { rows } = await oldDb.query(
    `SELECT id, user_id, business_id, created_at, updated_at FROM business_user ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} business_user records in old DB`);
  if (rows.length === 0) return;

  const columns = ["id", "user_id", "business_id", "created_at", "updated_at", "deleted_at"];

  const values = rows.map((r) => [
    r.id,
    r.user_id,
    r.business_id,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    null,
  ]);

  const inserted = await batchInsert(newDb, "business_users", columns, values, { phase: PHASE });
  log(PHASE, `Business users migration complete: ${inserted} inserted out of ${rows.length}`);
}
