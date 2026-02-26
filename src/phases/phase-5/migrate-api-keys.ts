import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 5.2";

/**
 * Migrate api_keys table.
 *
 * Old: api_keys(id, name, api_key, organization_id nullable, created_at, updated_at)
 * New (post-057): api_keys(id, organization_id nullable, name, api_key, created_at, updated_at, deleted_at)
 *
 * Migration 057: organization_id relaxed to nullable. Now all rows can be migrated.
 */
export async function migrateApiKeys(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting api_keys migration...");

  const { rows } = await oldDb.query(
    `SELECT id, name, api_key, organization_id, created_at, updated_at
     FROM api_keys ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} api_keys in old DB`);
  if (rows.length === 0) return;

  const columns = ["id", "organization_id", "name", "api_key", "created_at", "updated_at", "deleted_at"];

  const values = rows.map((r) => [
    r.id,
    r.organization_id ?? null,
    r.name,
    r.api_key,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    null,
  ]);

  const inserted = await batchInsert(newDb, "api_keys", columns, values, { phase: PHASE });
  log(PHASE, `API keys migration complete: ${inserted} inserted out of ${rows.length}`);
}
