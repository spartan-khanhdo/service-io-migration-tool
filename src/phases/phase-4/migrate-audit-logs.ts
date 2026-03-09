import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsertComposite } from "../../util/batch.js";
import { transformModelType } from "../../parser/polymorphic.js";

const PHASE = "Phase 4.10";

/**
 * Migrate audit_logs table.
 *
 * Old: audit_logs(id, model, model_id, event, user_id, payload JSONB, created_at, updated_at)
 * New (post-052): audit_logs(id, user_id, auditable_type, auditable_id, event,
 *      old_values JSONB, new_values JSONB, created_at, updated_at, deleted_at)
 *
 * Migration 052: Partitioned table by created_at (monthly).
 * PK changed to composite (id, created_at) — use batchInsertComposite.
 *
 * Transforms:
 * - model → auditable_type (polymorphic: App\Models\User → user)
 * - model_id → auditable_id
 * - payload → split into old_values / new_values
 */
export async function migrateAuditLogs(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting audit_logs migration...");

  const batchSize = 500;
  let offset = 0;
  let totalInserted = 0;

  const countResult = await oldDb.query(`SELECT COUNT(*) as count FROM audit_logs WHERE model_id IS NOT NULL`);
  const total = parseInt(countResult.rows[0].count, 10);
  log(PHASE, `Found ${total} audit_logs in old DB`);

  if (total === 0) return;

  while (offset < total) {
    const { rows } = await oldDb.query(
      `SELECT id, model, model_id, event, user_id, payload, created_at, updated_at
       FROM audit_logs WHERE model_id IS NOT NULL
       ORDER BY id_serial LIMIT $1 OFFSET $2`,
      [batchSize, offset]
    );

    if (rows.length === 0) break;

    const columns = [
      "id", "user_id", "auditable_type", "auditable_id", "event",
      "old_values", "new_values",
      "created_at", "updated_at", "deleted_at",
    ];

    const values = rows.map((r) => {
      const payload = r.payload;
      const before = payload?.before ? JSON.stringify(payload.before) : null;
      const after = payload?.after ? JSON.stringify(payload.after) : null;

      return [
        r.id,
        r.user_id,
        r.model ? transformModelType(r.model) : "unknown",
        r.model_id,
        r.event,
        before,
        after,
        r.created_at ?? new Date(),
        r.updated_at ?? new Date(),
        null,           // deleted_at
      ];
    });

    // Use composite conflict target (id, created_at) for partitioned table
    const inserted = await batchInsertComposite(
      newDb, "audit_logs", columns, values,
      ["id", "created_at"],
      { phase: PHASE }
    );
    totalInserted += inserted;
    offset += batchSize;
  }

  log(PHASE, `Audit logs migration complete: ${totalInserted} inserted out of ${total}`);
}
