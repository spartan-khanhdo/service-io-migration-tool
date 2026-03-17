import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 5.6";

/**
 * Migrate notification_batches table.
 *
 * Old: (id, recipient_email, recipient_id, notification_batch_type, event, data JSON,
 *       batch_identifier, sent_at, is_admin, business_id, created_at, updated_at)
 * New (post-062): (id, user_id, batch_type, recipient_email, event, data JSONB,
 *       batch_identifier, sent_at, is_admin, business_id,
 *       created_at, updated_at, deleted_at)
 *
 * Migration 062: renamed recipient_id → user_id.
 * Added recipient_email, event, data, batch_identifier, is_admin, business_id.
 * Dropped notification_ids, scheduled_for, status, error_message.
 * sent_at re-added to new schema.
 *
 * Now aligns with PHP — much simpler mapping.
 */
export async function migrateNotificationBatches(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting notification_batches migration...");

  const { rows } = await oldDb.query(
    `SELECT id, recipient_email, recipient_id, notification_batch_type, event, data,
            batch_identifier, sent_at, is_admin, business_id, created_at, updated_at
     FROM notification_batches
     WHERE recipient_id IS NOT NULL
     ORDER BY created_at NULLS LAST`
  );

  const { rows: totalRows } = await oldDb.query(`SELECT COUNT(*) as count FROM notification_batches`);
  const total = parseInt(totalRows[0].count, 10);
  const skipped = total - rows.length;

  log(PHASE, `Found ${rows.length} notification_batches (skipped ${skipped} with NULL recipient_id)`);
  if (rows.length === 0) return;

  const columns = [
    "id", "user_id", "batch_type", "recipient_email", "event", "data",
    "batch_identifier", "sent_at", "is_admin", "business_id",
    "created_at", "updated_at", "deleted_at",
  ];

  const values = rows.map((r) => [
    r.id,
    r.recipient_id,                                      // → user_id
    r.notification_batch_type || "unknown",              // → batch_type
    r.recipient_email ?? null,
    r.event ?? null,
    r.data ? JSON.stringify(r.data) : null,              // → data JSONB
    r.batch_identifier ?? null,
    r.sent_at ?? null,
    r.is_admin ?? false,
    r.business_id ?? null,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    null,
  ]);

  const inserted = await batchInsert(newDb, "notification_batches", columns, values, { phase: PHASE });

  log(PHASE, `Notification batches migration complete: ${inserted} inserted out of ${rows.length}`);
}
