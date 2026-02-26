import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 6.4";

/**
 * Migrate user_business_notes table.
 *
 * Old: (id UUID, receiver_id, business_note_id, read_at, created_at, updated_at)
 * New: (id UUID, receiver_id, business_note_id, read_at, created_at, updated_at, deleted_at)
 *
 * Direct copy — only added deleted_at.
 */
export async function migrateUserBusinessNotes(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting user_business_notes migration...");

  const { rows } = await oldDb.query(
    `SELECT id, receiver_id, business_note_id, read_at, created_at, updated_at
     FROM user_business_notes ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} user_business_notes in old DB`);
  if (rows.length === 0) return;

  const columns = [
    "id", "receiver_id", "business_note_id", "read_at",
    "created_at", "updated_at", "deleted_at",
  ];

  const values = rows.map((r) => [
    r.id,
    r.receiver_id,
    r.business_note_id,
    r.read_at,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    null, // deleted_at
  ]);

  const inserted = await batchInsert(newDb, "user_business_notes", columns, values, { phase: PHASE });
  log(PHASE, `User business notes migration complete: ${inserted} inserted out of ${rows.length}`);
}
