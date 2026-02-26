import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log, logError } from "../../util/logger.js";
import { batchInsertComposite } from "../../util/batch.js";
import { transformModelType } from "../../parser/polymorphic.js";

const PHASE = "Phase 2.5";

/**
 * Migrate model_has_roles table.
 *
 * Old: model_has_roles(role_id BIGINT, model_type TEXT, model_id UUID)
 * New: model_has_roles(role_id UUID, model_type TEXT, model_id UUID, created_at)
 *
 * Transform:
 * - role_id: BIGINT → UUID via IdMappingStore('roles')
 * - model_type: "App\Models\User" → "user"
 * - model_id: UUID preserved
 * - created_at: NOW() (not in old schema)
 */
export async function migrateModelHasRoles(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting model_has_roles migration...");

  const { rows } = await oldDb.query(
    `SELECT role_id, model_type, model_id FROM model_has_roles`
  );

  log(PHASE, `Found ${rows.length} model_has_roles records in old DB`);

  if (rows.length === 0) return;

  let skipped = 0;
  const columns = ["role_id", "model_type", "model_id", "created_at"];
  const values: unknown[][] = [];

  for (const r of rows) {
    const newRoleId = idMap.get("roles", r.role_id);
    if (!newRoleId) {
      logError(PHASE, `Skipping: role_id=${r.role_id} not found in mapping (model_type=${r.model_type}, model_id=${r.model_id})`);
      skipped++;
      continue;
    }

    values.push([
      newRoleId,
      transformModelType(r.model_type),
      r.model_id,
      new Date(),  // created_at
    ]);
  }

  const inserted = await batchInsertComposite(
    newDb,
    "model_has_roles",
    columns,
    values,
    ["role_id", "model_type", "model_id"],
    { phase: PHASE }
  );

  log(PHASE, `model_has_roles migration complete: ${inserted} inserted, ${skipped} skipped`);
}
