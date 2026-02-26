import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 6.5";

/**
 * Migrate crm_sync_outbox table.
 *
 * Old: (id UUID, ordinal BIGINT, type, entity_id, event, payload JSONB,
 *       status, retry_count, last_retry_at, last_error, created_at, updated_at, processed_at)
 * New: (id UUID, ordinal, type, entity_id, event, payload JSONB,
 *       status, retry_count, last_retry_at, last_error, processed_at,
 *       created_at, updated_at, deleted_at)
 *
 * Direct copy — only added deleted_at.
 */
export async function migrateCrmSyncOutbox(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting crm_sync_outbox migration...");

  const { rows } = await oldDb.query(
    `SELECT id, ordinal, type, entity_id, event, payload, status,
            retry_count, last_retry_at, last_error, processed_at,
            created_at, updated_at
     FROM crm_sync_outbox ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} crm_sync_outbox in old DB`);
  if (rows.length === 0) return;

  const columns = [
    "id", "ordinal", "type", "entity_id", "event", "payload", "status",
    "retry_count", "last_retry_at", "last_error", "processed_at",
    "created_at", "updated_at", "deleted_at",
  ];

  const values = rows.map((r) => [
    r.id,
    r.ordinal,
    r.type,
    r.entity_id,
    r.event,
    r.payload ? JSON.stringify(r.payload) : null,
    r.status || "pending",
    r.retry_count ?? 0,
    r.last_retry_at,
    r.last_error,
    r.processed_at,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    null, // deleted_at
  ]);

  const inserted = await batchInsert(newDb, "crm_sync_outbox", columns, values, { phase: PHASE });
  log(PHASE, `CRM sync outbox migration complete: ${inserted} inserted out of ${rows.length}`);
}
