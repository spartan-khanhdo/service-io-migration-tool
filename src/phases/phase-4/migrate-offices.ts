import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 4.4";

/**
 * Migrate offices table.
 *
 * Old: offices(id, organization_id, name, address, created_by, modified_by, deleted_at, deleted_by, created_at, updated_at)
 *   Note: old DB does NOT have brokerage_id — relationship is managed via user_brokerage_offices.
 *
 * New: offices(id, organization_id, name, address, created_at, updated_at, deleted_at, created_by, modified_by, deleted_by)
 *   Note: brokerage_id dropped from new DB. organization_id added via Flyway 056.
 */
export async function migrateOffices(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting offices migration...");

  const { rows } = await oldDb.query(
    `SELECT id, organization_id, name, address, created_by, modified_by,
            deleted_at, deleted_by, created_at, updated_at
     FROM offices ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} offices in old DB`);
  if (rows.length === 0) return;

  const columns = [
    "id", "organization_id", "name", "address",
    "created_at", "updated_at", "deleted_at",
    "created_by", "modified_by", "deleted_by",
  ];

  const values = rows.map((r) => [
    r.id,
    r.organization_id ?? null,
    r.name,
    r.address || null,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    r.deleted_at,
    r.created_by,
    r.modified_by,
    r.deleted_by,
  ]);

  const inserted = await batchInsert(newDb, "offices", columns, values, { phase: PHASE });
  log(PHASE, `Offices migration complete: ${inserted} inserted out of ${rows.length}`);
}
