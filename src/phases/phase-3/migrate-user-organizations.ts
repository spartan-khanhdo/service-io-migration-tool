import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 3.4";

/**
 * Migrate user_organizations table.
 *
 * Old: user_organizations(id, user_id, organization_id, status, accepted_at, rejected_at, is_admin, created_by, modified_by, deleted_by, created_at, updated_at, deleted_at)
 * New: user_organizations(id, user_id, organization_id, status, accepted_at, rejected_at, is_admin, created_by, modified_by, deleted_by, created_at, updated_at, deleted_at)
 *
 * Schema is identical — direct copy.
 */
export async function migrateUserOrganizations(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting user_organizations migration...");

  const { rows } = await oldDb.query(
    `SELECT id, user_id, organization_id, status, accepted_at, rejected_at, is_admin,
            created_by, modified_by, deleted_by, created_at, updated_at, deleted_at
     FROM user_organizations ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} user_organizations in old DB`);
  if (rows.length === 0) return;

  const columns = [
    "id", "user_id", "organization_id", "status",
    "accepted_at", "rejected_at", "is_admin",
    "created_by", "modified_by", "deleted_by",
    "created_at", "updated_at", "deleted_at",
  ];

  const values = rows.map((r) => [
    r.id,
    r.user_id,
    r.organization_id,
    r.status,
    r.accepted_at,
    r.rejected_at,
    r.is_admin,
    r.created_by,
    r.modified_by,
    r.deleted_by,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    r.deleted_at,
  ]);

  const inserted = await batchInsert(newDb, "user_organizations", columns, values, { phase: PHASE });
  log(PHASE, `User organizations migration complete: ${inserted} inserted out of ${rows.length}`);
}
