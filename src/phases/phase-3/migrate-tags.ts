import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 3.6";

/**
 * Migrate tags table.
 *
 * Old: tags(id, name, slug, created_at, updated_at)
 * New: tags(id, name, slug, created_at, updated_at, deleted_at)
 */
export async function migrateTags(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting tags migration...");

  const { rows } = await oldDb.query(
    `SELECT id, name, slug, created_at, updated_at FROM tags ORDER BY name`
  );

  log(PHASE, `Found ${rows.length} tags in old DB`);
  if (rows.length === 0) return;

  const columns = [
    "id", "name", "slug",
    "created_at", "updated_at", "deleted_at",
  ];

  const values = rows.map((r) => [
    r.id,
    r.name,
    r.slug,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    null,   // deleted_at
  ]);

  const inserted = await batchInsert(newDb, "tags", columns, values, { phase: PHASE });
  log(PHASE, `Tags migration complete: ${inserted} inserted out of ${rows.length}`);
}
