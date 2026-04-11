import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 4.3";

/**
 * Migrate brokerages table.
 *
 * Old: brokerages(id, name, created_by, modified_by, deleted_at, deleted_by, created_at, updated_at)
 * New (post-047): brokerages(id, name, created_at, updated_at, deleted_at, created_by, modified_by, deleted_by)
 *
 * Migration 047 dropped: organization_id, license_number, license_state, license_expiry,
 * website, logo_url, is_verified, verified_at, verified_by.
 * Now much simpler — direct column mapping.
 */
export async function migrateBrokerages(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting brokerages migration...");

  const { rows } = await oldDb.query(
    `SELECT id, organization_id, name, created_by, modified_by, deleted_at, deleted_by, created_at, updated_at
     FROM brokerages ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} brokerages in old DB`);
  if (rows.length === 0) return;

  const columns = [
    "id", "organization_id", "name",
    "created_at", "updated_at", "deleted_at",
    "created_by", "modified_by", "deleted_by",
  ];

  const values = rows.map((r) => [
    r.id,
    r.organization_id ?? null,
    r.name,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    r.deleted_at,
    r.created_by,
    r.modified_by,
    r.deleted_by,
  ]);

  const inserted = await batchInsert(newDb, "brokerages", columns, values, { phase: PHASE });
  log(PHASE, `Brokerages migration complete: ${inserted} inserted out of ${rows.length}`);
}
