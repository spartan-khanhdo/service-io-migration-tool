import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log, logError } from "../../util/logger.js";
import { batchInsertComposite } from "../../util/batch.js";
import { transformModelType } from "../../parser/polymorphic.js";

const PHASE = "Phase 2.6";

/**
 * Migrate model_has_permissions table.
 *
 * Old: model_has_permissions(permission_id BIGINT, model_type TEXT, model_id UUID)
 * New: model_has_permissions(permission_id UUID, model_type TEXT, model_id UUID, created_at)
 *
 * Transform:
 * - permission_id: BIGINT → UUID via IdMappingStore('permissions')
 * - model_type: "App\Models\User" → "user"
 * - model_id: UUID preserved
 * - created_at: NOW()
 */
export async function migrateModelHasPermissions(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting model_has_permissions migration...");

  const { rows } = await oldDb.query(
    `SELECT permission_id, model_type, model_id FROM model_has_permissions`
  );

  log(PHASE, `Found ${rows.length} model_has_permissions records in old DB`);

  if (rows.length === 0) return;

  let skipped = 0;
  const columns = ["permission_id", "model_type", "model_id", "created_at"];
  const values: unknown[][] = [];

  for (const r of rows) {
    const newPermId = idMap.get("permissions", r.permission_id);
    if (!newPermId) {
      logError(PHASE, `Skipping: permission_id=${r.permission_id} not found in mapping`);
      skipped++;
      continue;
    }

    values.push([
      newPermId,
      transformModelType(r.model_type),
      r.model_id,
      new Date(),  // created_at
    ]);
  }

  const inserted = await batchInsertComposite(
    newDb,
    "model_has_permissions",
    columns,
    values,
    ["permission_id", "model_type", "model_id"],
    { phase: PHASE }
  );

  log(PHASE, `model_has_permissions migration complete: ${inserted} inserted, ${skipped} skipped`);
}
