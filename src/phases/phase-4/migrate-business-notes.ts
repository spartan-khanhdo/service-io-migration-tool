import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 4.7";

/**
 * Migrate business_notes table.
 *
 * Old: business_notes(id, sender_id, business_id, message, is_updated, attachments, message_type, sent_at, created_at, updated_at)
 * New (post-053): business_notes(id, business_id, author_id, content, note_type, is_updated,
 *      attachments JSONB, created_at, updated_at, deleted_at)
 *
 * Renames: sender_id → author_id, message → content, message_type → note_type
 * Added (053): is_updated (BOOLEAN, NOT NULL, DEFAULT false)
 */
export async function migrateBusinessNotes(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting business_notes migration...");

  const { rows } = await oldDb.query(
    `SELECT id, sender_id, business_id, message, is_updated, attachments, message_type, created_at, updated_at
     FROM business_notes ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} business_notes in old DB`);
  if (rows.length === 0) return;

  const skipped = rows.filter((r) => r.message == null);
  if (skipped.length > 0) {
    log(PHASE, `WARNING: Skipping ${skipped.length} business_notes with NULL message`);
  }

  const validRows = rows.filter((r) => r.message != null);
  if (validRows.length === 0) return;

  const columns = [
    "id", "business_id", "author_id", "content", "note_type",
    "is_updated", "attachments", "created_at", "updated_at", "deleted_at",
  ];

  const values = validRows.map((r) => [
    r.id,
    r.business_id,
    r.sender_id,                // sender_id → author_id
    r.message,                  // message → content (NOT NULL, nulls skipped above)
    r.message_type,             // message_type → note_type
    r.is_updated ?? false,      // is_updated (added in 053)
    r.attachments ? JSON.stringify(r.attachments) : null,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    null,                       // deleted_at
  ]);

  const inserted = await batchInsert(newDb, "business_notes", columns, values, { phase: PHASE });
  log(PHASE, `Business notes migration complete: ${inserted} inserted out of ${rows.length} (skipped: ${skipped.length})`);
}
