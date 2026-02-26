import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 2.1";

/**
 * Migrate organizations table.
 *
 * Old: organizations(id UUID, name, alias, created_by, modified_by, deleted_by, created_at, updated_at, deleted_at)
 * New: organizations(id UUID, name, alias, created_by, modified_by, deleted_by, created_at, updated_at, deleted_at)
 *
 * Nearly identical schema — direct copy. UUID preserved.
 */
export async function migrateOrganizations(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting organizations migration...");

  const { rows } = await oldDb.query(
    `SELECT id, name, alias, created_by, modified_by, deleted_by, created_at, updated_at, deleted_at
     FROM organizations ORDER BY created_at`
  );

  log(PHASE, `Found ${rows.length} organizations in old DB`);

  if (rows.length === 0) return;

  const columns = ["id", "name", "alias", "created_by", "modified_by", "deleted_by", "created_at", "updated_at", "deleted_at"];
  const values = rows.map((r) => [
    r.id,
    r.name,
    r.alias,
    r.created_by,
    r.modified_by,
    r.deleted_by,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    r.deleted_at,
  ]);

  const inserted = await batchInsert(newDb, "organizations", columns, values, { phase: PHASE });

  log(PHASE, `Organizations migration complete: ${inserted} inserted out of ${rows.length}`);
}
