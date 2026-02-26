import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 4.8";

/**
 * Migrate business_messages table.
 *
 * Old: business_messages(id, sender_id, business_id, message, message_type, sent_at, attachments, is_updated, created_at, updated_at)
 * New (post-055): business_messages(id, business_id, sender_id, content, message_type, is_updated,
 *      attachments JSONB, created_at, updated_at, deleted_at)
 *
 * Renames: message → content
 * Added (055): message_type, is_updated (were in old DB, now restored in new DB)
 */
export async function migrateBusinessMessages(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting business_messages migration...");

  const { rows } = await oldDb.query(
    `SELECT id, sender_id, business_id, message, message_type, is_updated, attachments, created_at, updated_at
     FROM business_messages ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} business_messages in old DB`);
  if (rows.length === 0) return;

  const columns = [
    "id", "business_id", "sender_id", "content",
    "message_type", "is_updated",
    "attachments", "created_at", "updated_at", "deleted_at",
  ];

  const values = rows.map((r) => [
    r.id,
    r.business_id,
    r.sender_id,
    r.message || "",            // message → content (NOT NULL)
    r.message_type ?? null,
    r.is_updated ?? false,
    r.attachments ? JSON.stringify(r.attachments) : null,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    null,                       // deleted_at
  ]);

  const inserted = await batchInsert(newDb, "business_messages", columns, values, { phase: PHASE });
  log(PHASE, `Business messages migration complete: ${inserted} inserted out of ${rows.length}`);
}
