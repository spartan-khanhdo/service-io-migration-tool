import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 4.4";

/**
 * Migrate offices table.
 *
 * Old: offices(id, brokerage_id, name, address, created_by, modified_by, deleted_at, deleted_by, created_at, updated_at)
 * New (post-049): offices(id, brokerage_id, name, address, created_at, updated_at, deleted_at, created_by, modified_by, deleted_by)
 *
 * Migration 049 dropped: address_line1, address_line2, city, state, zip_code, country,
 *   phone, fax, email, is_headquarters, is_active, latitude, longitude
 * Migration 049 added: address (TEXT)
 *
 * Now direct mapping — old `address` → new `address`.
 */
export async function migrateOffices(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting offices migration...");

  const { rows } = await oldDb.query(
    `SELECT id, brokerage_id, name, address, created_by, modified_by,
            deleted_at, deleted_by, created_at, updated_at
     FROM offices ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} offices in old DB`);
  if (rows.length === 0) return;

  const columns = [
    "id", "brokerage_id", "name", "address",
    "created_at", "updated_at", "deleted_at",
    "created_by", "modified_by", "deleted_by",
  ];

  const values = rows.map((r) => [
    r.id,
    r.brokerage_id,
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
