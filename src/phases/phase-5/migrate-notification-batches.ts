import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log, logError } from "../../util/logger.js";

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

  let inserted = 0;
  for (const r of rows) {
    try {
      const result = await newDb.query(
        `INSERT INTO notification_batches
         (id, user_id, batch_type, recipient_email, event, data,
          batch_identifier, sent_at, is_admin, business_id,
          created_at, updated_at, deleted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO NOTHING`,
        [
          r.id,
          r.recipient_id,                                      // → user_id
          r.notification_batch_type || "unknown",              // → batch_type
          r.recipient_email ?? null,
          r.event ?? null,
          r.data ? JSON.stringify(r.data) : null,              // → data JSONB
          r.batch_identifier ?? null,
          r.sent_at ?? null,                                   // sent_at
          r.is_admin ?? false,
          r.business_id ?? null,
          r.created_at ?? new Date(),
          r.updated_at ?? new Date(),
          null,
        ]
      );
      inserted += result.rowCount ?? 0;
    } catch (error) {
      logError(PHASE, `Skipped notification_batch id=${r.id}`, error);
    }
  }

  log(PHASE, `Notification batches migration complete: ${inserted} inserted out of ${rows.length}`);
}
