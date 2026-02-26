import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 6.6";

/**
 * Migrate settings_assets table.
 *
 * Old: (id UUID, name, description, parent_id, created_at, updated_at)
 * New (post-064): (id UUID, name, description, parent_id, key, created_at, updated_at, deleted_at)
 *
 * Migration 064: dropped is_active.
 * Old has NO key column.
 */
export async function migrateSettingsAssets(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting settings_assets migration...");

  const { rows } = await oldDb.query(
    `SELECT id, name, description, parent_id, created_at, updated_at
     FROM settings_assets ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} settings_assets in old DB`);
  if (rows.length === 0) return;

  // Truncate seed data — cascade to settings_asset_properties referencing these
  log(PHASE, "Truncating seeded settings data in new DB...");
  await newDb.query("TRUNCATE settings_asset_property_histories");
  await newDb.query("TRUNCATE settings_asset_properties");
  await newDb.query("TRUNCATE settings_assets");

  const columns = [
    "id", "name", "description", "parent_id",
    "created_at", "updated_at", "deleted_at",
  ];

  const values = rows.map((r) => [
    r.id,
    r.name,
    r.description,
    r.parent_id,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    null, // deleted_at
  ]);

  const inserted = await batchInsert(newDb, "settings_assets", columns, values, { phase: PHASE });
  log(PHASE, `Settings assets migration complete: ${inserted} inserted out of ${rows.length}`);
}
