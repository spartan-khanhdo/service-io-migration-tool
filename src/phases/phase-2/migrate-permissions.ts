import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";

const PHASE = "Phase 2.3";

/**
 * Migrate permissions: Insert into new DB and build BIGINT → UUID mapping.
 *
 * Old: permissions(id BIGINT, name, guard_name, created_at, updated_at)
 * New: permissions(id UUID auto-gen, name, guard_name, created_at, updated_at, deleted_at)
 *
 * Unique index: (name, guard_name) WHERE deleted_at IS NULL
 */
export async function migratePermissions(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting permissions migration...");

  const oldPerms = await oldDb.query(
    `SELECT id, name, guard_name, created_at, updated_at FROM permissions ORDER BY id`
  );

  log(PHASE, `Found ${oldPerms.rows.length} permissions in old DB`);

  if (oldPerms.rows.length === 0) return;

  // Insert permissions one by one (138 rows), skip if already exists
  let inserted = 0;
  for (const r of oldPerms.rows) {
    const existing = await newDb.query(
      `SELECT id FROM permissions WHERE name = $1 AND guard_name = $2 AND deleted_at IS NULL`,
      [r.name, r.guard_name]
    );
    if (existing.rows.length === 0) {
      await newDb.query(
        `INSERT INTO permissions (name, guard_name, created_at, updated_at) VALUES ($1, $2, $3, $4)`,
        [r.name, r.guard_name, r.created_at ?? new Date(), r.updated_at ?? new Date()]
      );
      inserted++;
    }
  }

  log(PHASE, `Permissions insert complete: ${inserted} inserted out of ${oldPerms.rows.length}`);

  // Build BIGINT → UUID mapping by matching on name
  const newPerms = await newDb.query(`SELECT id, name FROM permissions WHERE deleted_at IS NULL`);
  const newPermsByName = new Map<string, string>();
  for (const p of newPerms.rows) {
    newPermsByName.set(p.name, p.id);
  }

  let mapped = 0;
  for (const oldPerm of oldPerms.rows) {
    const newId = newPermsByName.get(oldPerm.name);
    if (newId) {
      idMap.set("permissions", String(oldPerm.id), newId);
      mapped++;
    }
  }

  log(PHASE, `Permissions mapping complete: ${mapped} mapped out of ${oldPerms.rows.length}`);
}
