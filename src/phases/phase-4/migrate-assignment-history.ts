import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 4.11";

/**
 * Migrate assignment_history table (same name in both DBs).
 *
 * Old: assignment_history(id, business_id, assigned_user_id, assigned_by, assignment_method,
 *      assignment_reason, metadata, created_at, updated_at)
 * New (post-054): assignment_history(id, business_id, assignment_type, assigned_user_id,
 *      assigned_by, reason, metadata, created_at, updated_at, deleted_at)
 *
 * Migration 054: Added assigned_user_id, metadata. Dropped previous_assignee_id, new_assignee_id, assigned_at.
 * Relaxed assigned_by (now nullable).
 *
 * Transforms:
 * - assignment_method → assignment_type
 * - assignment_reason → reason
 * - assigned_user_id → assigned_user_id (same name now!)
 * - metadata → metadata (same name now!)
 * - assigned_by → assigned_by (nullable, no fallback needed)
 */
export async function migrateAssignmentHistory(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting assignment_history migration...");

  const { rows } = await oldDb.query(
    `SELECT id, business_id, assigned_user_id, assigned_by, assignment_method,
            assignment_reason, metadata, created_at, updated_at
     FROM assignment_history ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} assignment_history records in old DB`);
  if (rows.length === 0) return;

  const columns = [
    "id", "business_id", "assignment_type", "assigned_user_id",
    "assigned_by", "reason", "metadata",
    "created_at", "updated_at", "deleted_at",
  ];

  const values = rows.map((r) => [
    r.id,
    r.business_id,
    r.assignment_method,                              // → assignment_type
    r.assigned_user_id,                               // same name now
    r.assigned_by ?? null,                            // nullable now
    r.assignment_reason,                              // → reason
    r.metadata ? JSON.stringify(r.metadata) : null,   // same name now
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    null,                                             // deleted_at
  ]);

  const inserted = await batchInsert(newDb, "assignment_history", columns, values, { phase: PHASE });
  log(PHASE, `Assignment history migration complete: ${inserted} inserted out of ${rows.length}`);
}
