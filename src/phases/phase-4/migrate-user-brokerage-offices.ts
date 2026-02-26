import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 4.5";

/**
 * Migrate user_brokerage_offices table.
 *
 * Old: user_brokerage_offices(id, user_id, brokerage_id, office_id, active, created_by, modified_by, deleted_at, deleted_by, created_at, updated_at)
 * New (post-050): user_brokerage_offices(id, user_id, brokerage_id, office_id, active,
 *      created_by, modified_by, deleted_by, created_at, updated_at, deleted_at)
 *
 * Migration 050 added: created_by, modified_by, deleted_by (now matches old DB).
 * brokerage_id and office_id are NOT NULL in new but nullable in old.
 */
export async function migrateUserBrokerageOffices(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting user_brokerage_offices migration...");

  const { rows } = await oldDb.query(
    `SELECT id, user_id, brokerage_id, office_id, active,
            created_by, modified_by, deleted_at, deleted_by, created_at, updated_at
     FROM user_brokerage_offices
     WHERE brokerage_id IS NOT NULL AND office_id IS NOT NULL
     ORDER BY created_at NULLS LAST`
  );

  // Count skipped rows
  const { rows: totalRows } = await oldDb.query(`SELECT COUNT(*) as count FROM user_brokerage_offices`);
  const totalCount = parseInt(totalRows[0].count, 10);
  const skipped = totalCount - rows.length;

  log(PHASE, `Found ${rows.length} user_brokerage_offices (skipped ${skipped} with NULL brokerage_id/office_id)`);
  if (rows.length === 0) return;

  const columns = [
    "id", "user_id", "brokerage_id", "office_id", "active",
    "created_by", "modified_by", "deleted_by",
    "created_at", "updated_at", "deleted_at",
  ];

  const values = rows.map((r) => [
    r.id,
    r.user_id,
    r.brokerage_id,
    r.office_id,
    r.active,
    r.created_by ?? null,
    r.modified_by ?? null,
    r.deleted_by ?? null,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    r.deleted_at,
  ]);

  const inserted = await batchInsert(newDb, "user_brokerage_offices", columns, values, { phase: PHASE });
  log(PHASE, `User brokerage offices migration complete: ${inserted} inserted out of ${rows.length}`);
}
