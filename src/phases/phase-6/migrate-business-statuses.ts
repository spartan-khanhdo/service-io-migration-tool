import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 6.2";

/**
 * Migrate business_statuses table.
 *
 * Old: (id UUID, business_id, user_id, status, created_at, updated_at)
 * New: (id UUID, business_id, user_id, status, created_at, updated_at, deleted_at)
 *
 * Direct copy — only added deleted_at.
 */
export async function migrateBusinessStatuses(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting business_statuses migration...");

  const { rows } = await oldDb.query(
    `SELECT id, business_id, user_id, status, created_at, updated_at
     FROM business_statuses ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} business_statuses in old DB`);
  if (rows.length === 0) return;

  const columns = [
    "id", "business_id", "user_id", "status",
    "created_at", "updated_at", "deleted_at",
  ];

  const values = rows.map((r) => [
    r.id,
    r.business_id,
    r.user_id,
    r.status,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    null, // deleted_at
  ]);

  const inserted = await batchInsert(newDb, "business_statuses", columns, values, { phase: PHASE });
  log(PHASE, `Business statuses migration complete: ${inserted} inserted out of ${rows.length}`);
}
