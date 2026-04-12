import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";
import { transformModelType } from "../../parser/polymorphic.js";

const PHASE = "Phase 4.1";

/**
 * Disk name → S3 key prefix mapping.
 * Matches PHP config/filesystems.php disk prefix settings.
 */
const DISK_PREFIX: Record<string, string> = {
  "aws-public": "public/",
  "aws-private": "private/",
  "aws-documents": "documents/",
  "aws-temporary": "temporary/",
};

/**
 * Migrate media table.
 *
 * Old: media(id BIGINT auto-inc, uuid UUID, model_type VARCHAR, model_id UUID, ...)
 * New: media(id UUID, model_type TEXT, model_id UUID, ..., path TEXT, uploaded_by UUID, manipulations JSONB, deleted_at)
 *
 * Key: Old `uuid` column becomes new `id`.
 * Build mapping: old BIGINT id → old uuid (for any future reference).
 * model_type: App\Models\Business → business (polymorphic transform)
 * path: construct from disk prefix + old BIGINT id + file_name
 *       (Spatie DefaultPathGenerator uses BIGINT id, NOT uuid)
 *       e.g. disk=aws-public, id=3791, file=photo.jpg → "public/3791/photo.jpg"
 * Added (046): manipulations (JSONB - Spatie MediaLibrary)
 * Relaxed (046): mime_type, path now nullable
 */
export async function migrateMedia(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting media migration...");

  const { rows } = await oldDb.query(
    `SELECT id, uuid, model_type, model_id, collection_name, name, file_name,
            mime_type, disk, conversions_disk, size,
            manipulations, custom_properties, generated_conversions, responsive_images,
            order_column, uploaded_by, created_at, updated_at
     FROM media ORDER BY id`
  );

  log(PHASE, `Found ${rows.length} media records in old DB`);
  if (rows.length === 0) return;

  // Build BIGINT → UUID mapping
  for (const r of rows) {
    if (r.uuid) {
      idMap.set("media", String(r.id), r.uuid);
    }
  }
  log(PHASE, `Built media ID mapping: ${rows.length} entries`);

  const columns = [
    "id", "model_type", "model_id", "collection_name", "name", "file_name",
    "disk", "conversions_disk", "generated_conversions",
    "mime_type", "size", "path",
    "manipulations",
    "custom_properties", "responsive_images", "order_column",
    "uploaded_by", "created_at", "updated_at", "deleted_at",
  ];

  const values = rows.map((r) => [
    r.uuid,                                    // old uuid → new id
    transformModelType(r.model_type),          // App\Models\Business → business
    r.model_id,
    r.collection_name,
    r.name,
    r.file_name,
    r.disk,
    r.conversions_disk,
    r.generated_conversions ? JSON.stringify(r.generated_conversions) : null,
    r.mime_type,
    r.size,
    `${DISK_PREFIX[r.disk] ?? ""}${r.id}/${r.file_name}`,  // S3 key: disk prefix + old BIGINT id + file_name
    r.manipulations ? JSON.stringify(r.manipulations) : null,
    r.custom_properties ? JSON.stringify(r.custom_properties) : null,
    r.responsive_images ? JSON.stringify(r.responsive_images) : null,
    r.order_column,
    r.uploaded_by || null,                     // varchar → UUID (may be null)
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    null,                                      // deleted_at
  ]);

  const inserted = await batchInsert(newDb, "media", columns, values, { phase: PHASE });
  log(PHASE, `Media migration complete: ${inserted} inserted out of ${rows.length}`);
}
