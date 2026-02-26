import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log, logError } from "../../util/logger.js";
import crypto from "crypto";

const PHASE = "Phase 6.8";

/**
 * Migrate settings_asset_property_histories table.
 *
 * Old: (id BIGINT, modification_date TIMESTAMPTZ, old_value VARCHAR, property_id UUID)
 * New: (id UUID, settings_asset_property_id UUID, value TEXT, modification_date TIMESTAMPTZ,
 *       organization_id, user_id, created_at, updated_at, deleted_at)
 *
 * Schema aligned via Flyway 033 + 035.
 * id BIGINT → UUID (new UUID generated).
 * property_id → settings_asset_property_id.
 * old_value → value.
 */
export async function migrateSettingsAssetPropertyHistories(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting settings_asset_property_histories migration...");

  const { rows } = await oldDb.query(
    `SELECT id, modification_date, old_value, property_id
     FROM settings_asset_property_histories ORDER BY modification_date NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} settings_asset_property_histories in old DB`);
  if (rows.length === 0) return;

  let inserted = 0;
  for (const r of rows) {
    try {
      const result = await newDb.query(
        `INSERT INTO settings_asset_property_histories
         (id, settings_asset_property_id, value, modification_date,
          created_at, updated_at, deleted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [
          crypto.randomUUID(),              // id: BIGINT → new UUID
          r.property_id,                    // → settings_asset_property_id
          r.old_value,                      // → value
          r.modification_date,
          r.modification_date ?? new Date(), // created_at (use modification_date)
          r.modification_date ?? new Date(), // updated_at
          null,                             // deleted_at
        ]
      );
      inserted += result.rowCount ?? 0;
    } catch (error) {
      logError(PHASE, `Skipped settings_asset_property_history old_id=${r.id}`, error);
    }
  }

  log(PHASE, `Settings asset property histories migration complete: ${inserted} inserted out of ${rows.length}`);
}
