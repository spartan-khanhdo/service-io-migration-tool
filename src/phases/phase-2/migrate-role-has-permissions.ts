import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log, logError } from "../../util/logger.js";
import { batchInsertComposite } from "../../util/batch.js";

const PHASE = "Phase 2.7";

/**
 * Migrate role_has_permissions table.
 *
 * Old: role_has_permissions(permission_id BIGINT, role_id BIGINT)
 * New: role_has_permissions(permission_id UUID, role_id UUID)
 *
 * Transform:
 * - permission_id: BIGINT → UUID via IdMappingStore('permissions')
 * - role_id: BIGINT → UUID via IdMappingStore('roles')
 *
 * Note: New DB may already have this seeded (05-role-has-permissions.sql).
 * ON CONFLICT DO NOTHING handles duplicates.
 */
export async function migrateRoleHasPermissions(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting role_has_permissions migration...");

  const { rows } = await oldDb.query(
    `SELECT permission_id, role_id FROM role_has_permissions`
  );

  log(PHASE, `Found ${rows.length} role_has_permissions records in old DB`);

  if (rows.length === 0) return;

  let skipped = 0;
  const columns = ["permission_id", "role_id"];
  const values: unknown[][] = [];

  for (const r of rows) {
    const newPermId = idMap.get("permissions", r.permission_id);
    const newRoleId = idMap.get("roles", r.role_id);

    if (!newPermId || !newRoleId) {
      logError(PHASE, `Skipping: permission_id=${r.permission_id} or role_id=${r.role_id} not found in mapping`);
      skipped++;
      continue;
    }

    values.push([newPermId, newRoleId]);
  }

  const inserted = await batchInsertComposite(
    newDb,
    "role_has_permissions",
    columns,
    values,
    ["permission_id", "role_id"],
    { phase: PHASE }
  );

  log(PHASE, `role_has_permissions migration complete: ${inserted} inserted, ${skipped} skipped`);
}
