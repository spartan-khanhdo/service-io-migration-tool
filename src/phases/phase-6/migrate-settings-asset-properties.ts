import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log, logError } from "../../util/logger.js";

const PHASE = "Phase 6.7";

/**
 * Migrate settings_asset_properties table.
 *
 * Old: (id UUID, key, value JSON, description, field_type, is_inherited_from_parent_asset,
 *       is_overridable, settings_asset_id, source_property_id, user_id,
 *       created_by, updated_by, deleted_by, created_at, updated_at, deleted_at)
 * New (post-064): (id UUID, asset_id, key, value JSONB, description,
 *       is_user_overridable, field_type, is_overridable,
 *       is_inherited_from_parent_asset, source_property_id, user_id,
 *       created_by, updated_by, deleted_by,
 *       created_at, updated_at, deleted_at)
 *
 * Migration 064: dropped value_type.
 * Uses individual inserts due to partial unique index on (asset_id, key).
 */
export async function migrateSettingsAssetProperties(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting settings_asset_properties migration...");

  // Use ROW_NUMBER to deduplicate rows with same (settings_asset_id, key)
  // where deleted_at IS NULL, keeping the most recently updated row.
  // This avoids violating the partial unique index idx_settings_properties_key
  // on (asset_id, key) WHERE deleted_at IS NULL in the new DB.
  const { rows } = await oldDb.query(
    `SELECT id, key, value, description, field_type, is_inherited_from_parent_asset,
            is_overridable, settings_asset_id, source_property_id, user_id,
            created_by, updated_by, deleted_by, created_at, updated_at, deleted_at
     FROM (
       SELECT *,
              ROW_NUMBER() OVER (
                PARTITION BY settings_asset_id, key
                ORDER BY
                  CASE WHEN deleted_at IS NULL THEN 0 ELSE 1 END,
                  updated_at DESC NULLS LAST,
                  created_at DESC NULLS LAST
              ) AS rn
       FROM settings_asset_properties
     ) sub
     WHERE rn = 1
     ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} settings_asset_properties in old DB`);
  if (rows.length === 0) return;

  let inserted = 0;
  for (const r of rows) {
    // Always JSON.stringify to ensure valid JSONB
    const jsonValue = r.value !== null && r.value !== undefined
      ? JSON.stringify(r.value)
      : "null";

    try {
      const result = await newDb.query(
        `INSERT INTO settings_asset_properties
         (id, asset_id, key, value, description,
          is_user_overridable, field_type, is_overridable,
          is_inherited_from_parent_asset, source_property_id, user_id,
          created_by, updated_by, deleted_by,
          created_at, updated_at, deleted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         ON CONFLICT (id) DO NOTHING`,
        [
          r.id,
          r.settings_asset_id,                    // → asset_id
          r.key,
          jsonValue,                               // value JSON → JSONB
          r.description,
          r.is_overridable ?? false,               // → is_user_overridable
          r.field_type,                            // field_type
          r.is_overridable ?? false,               // is_overridable
          r.is_inherited_from_parent_asset ?? false,
          r.source_property_id,
          r.user_id,
          r.created_by,
          r.updated_by,
          r.deleted_by,
          r.created_at ?? new Date(),
          r.updated_at ?? new Date(),
          r.deleted_at,
        ]
      );
      inserted += result.rowCount ?? 0;
    } catch (error) {
      logError(PHASE, `Skipped settings_asset_property id=${r.id} key=${r.key}`, error);
    }
  }

  log(PHASE, `Settings asset properties migration complete: ${inserted} inserted out of ${rows.length}`);
}
