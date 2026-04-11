import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 4.4b";

/**
 * Migrate brokerage_offices table (new junction table).
 *
 * Old: brokerage_offices is derived from the user_brokerage_offices table in old DB
 *      or exists as a dedicated table if the old app created it.
 * New (Flyway 056): brokerage_offices(id, brokerage_id, office_id, created_by, modified_by,
 *                    created_at, updated_at, deleted_at)
 *
 * Direct copy if table exists in old DB.
 */
export async function migrateBrokerageOffices(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting brokerage_offices migration...");

  // Check if brokerage_offices table exists in old DB
  const tableCheck = await oldDb.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_name = 'brokerage_offices' AND table_schema = 'public'
     ) AS exists`
  );

  if (!tableCheck.rows[0].exists) {
    log(PHASE, "brokerage_offices table does not exist in old DB — skipping");
    return;
  }

  const { rows } = await oldDb.query(
    `SELECT id, brokerage_id, office_id, created_by, modified_by,
            created_at, updated_at, deleted_at
     FROM brokerage_offices ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} brokerage_offices in old DB`);
  if (rows.length === 0) return;

  const columns = [
    "id", "brokerage_id", "office_id", "created_by", "modified_by",
    "created_at", "updated_at", "deleted_at",
  ];

  const values = rows.map((r) => [
    r.id,
    r.brokerage_id,
    r.office_id,
    r.created_by ?? null,
    r.modified_by ?? null,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    r.deleted_at,
  ]);

  const inserted = await batchInsert(newDb, "brokerage_offices", columns, values, { phase: PHASE });
  log(PHASE, `Brokerage offices migration complete: ${inserted} inserted out of ${rows.length}`);
}
