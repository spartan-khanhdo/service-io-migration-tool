import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 3.2";

/**
 * Migrate business_organizations table.
 *
 * Old: business_organizations(id, business_id, organization_id, created_at, updated_at)
 * New: business_organizations(id, business_id, organization_id, created_at, updated_at, deleted_at)
 */
export async function migrateBusinessOrganizations(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting business_organizations migration...");

  const { rows } = await oldDb.query(
    `SELECT id, business_id, organization_id, created_at, updated_at FROM business_organizations ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} business_organizations in old DB`);
  if (rows.length === 0) return;

  const columns = [
    "id", "business_id", "organization_id",
    "created_at", "updated_at", "deleted_at",
  ];

  const values = rows.map((r) => [
    r.id,
    r.business_id,
    r.organization_id,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    null,                             // deleted_at
  ]);

  const inserted = await batchInsert(newDb, "business_organizations", columns, values, { phase: PHASE });
  log(PHASE, `Business organizations migration complete: ${inserted} inserted out of ${rows.length}`);
}
