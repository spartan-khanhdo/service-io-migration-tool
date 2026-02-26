import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";

const PHASE = "Phase 2.2";

/**
 * Migrate roles: Insert into new DB and build BIGINT → UUID mapping.
 *
 * Old: roles(id BIGINT, name, guard_name, created_at, updated_at)
 * New: roles(id UUID auto-gen, name, guard_name, created_at, updated_at, deleted_at)
 *
 * Unique index: (name, guard_name) WHERE deleted_at IS NULL
 */
export async function migrateRoles(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting roles migration...");

  const oldRoles = await oldDb.query(
    `SELECT id, name, guard_name, created_at, updated_at FROM roles ORDER BY id`
  );

  log(PHASE, `Found ${oldRoles.rows.length} roles in old DB`);

  if (oldRoles.rows.length === 0) return;

  // Insert roles one by one (small dataset), skip if already exists
  let inserted = 0;
  for (const r of oldRoles.rows) {
    const existing = await newDb.query(
      `SELECT id FROM roles WHERE name = $1 AND guard_name = $2 AND deleted_at IS NULL`,
      [r.name, r.guard_name]
    );
    if (existing.rows.length === 0) {
      await newDb.query(
        `INSERT INTO roles (name, guard_name, created_at, updated_at) VALUES ($1, $2, $3, $4)`,
        [r.name, r.guard_name, r.created_at ?? new Date(), r.updated_at ?? new Date()]
      );
      inserted++;
    }
  }

  log(PHASE, `Roles insert complete: ${inserted} inserted out of ${oldRoles.rows.length}`);

  // Build BIGINT → UUID mapping by matching on name
  const newRoles = await newDb.query(`SELECT id, name FROM roles WHERE deleted_at IS NULL`);
  const newRolesByName = new Map<string, string>();
  for (const r of newRoles.rows) {
    newRolesByName.set(r.name, r.id);
  }

  let mapped = 0;
  for (const oldRole of oldRoles.rows) {
    const newId = newRolesByName.get(oldRole.name);
    if (newId) {
      idMap.set("roles", String(oldRole.id), newId);
      mapped++;
      log(PHASE, `  Mapped role: "${oldRole.name}" (old: ${oldRole.id}) → (new: ${newId})`);
    }
  }

  log(PHASE, `Roles mapping complete: ${mapped} mapped out of ${oldRoles.rows.length}`);
}
