import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";
import { transformModelType } from "../../parser/polymorphic.js";

const PHASE = "Phase 6.1";

/**
 * Migrate notifications table.
 *
 * Old: (id UUID, type, notifiable_type, notifiable_id, data TEXT, read_at, created_at, updated_at)
 * New: (id UUID, type, notifiable_type, notifiable_id, data JSONB, read_at, created_at, updated_at, deleted_at)
 *
 * Schema nearly identical. Changes:
 * - notifiable_type: polymorphic transform (App\Models\User → user)
 * - data: TEXT → JSONB (validate JSON before insert)
 */
export async function migrateNotifications(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting notifications migration...");

  const { rows } = await oldDb.query(
    `SELECT id, type, notifiable_type, notifiable_id, data, read_at, created_at, updated_at
     FROM notifications ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} notifications in old DB`);
  if (rows.length === 0) return;

  const columns = [
    "id", "type", "notifiable_type", "notifiable_id", "data",
    "read_at", "created_at", "updated_at", "deleted_at",
  ];

  let skippedInvalidJson = 0;
  const values: unknown[][] = [];

  for (const r of rows) {
    // Validate data is valid JSON before inserting as JSONB
    let jsonData: string;
    try {
      if (r.data && typeof r.data === "string") {
        JSON.parse(r.data); // validate
        jsonData = r.data;
      } else if (r.data && typeof r.data === "object") {
        jsonData = JSON.stringify(r.data);
      } else {
        jsonData = "{}";
      }
    } catch {
      skippedInvalidJson++;
      continue;
    }

    values.push([
      r.id,
      r.type,
      r.notifiable_type ? transformModelType(r.notifiable_type) : "user",
      r.notifiable_id,
      jsonData,
      r.read_at,
      r.created_at ?? new Date(),
      r.updated_at ?? new Date(),
      null, // deleted_at
    ]);
  }

  if (skippedInvalidJson > 0) {
    log(PHASE, `Skipped ${skippedInvalidJson} rows with invalid JSON data`);
  }

  const inserted = await batchInsert(newDb, "notifications", columns, values, { phase: PHASE });
  log(PHASE, `Notifications migration complete: ${inserted} inserted out of ${rows.length}`);
}
