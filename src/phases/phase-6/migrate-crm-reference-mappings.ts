import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 6.6";

/**
 * Migrate crm_reference_mappings table.
 *
 * Old: (id UUID, internal_entity_id UUID, internal_type VARCHAR(20),
 *       crm_reference_id VARCHAR(255), created_at, updated_at)
 * New: (id UUID, internal_entity_id UUID, internal_type TEXT,
 *       crm_reference_id TEXT, created_at, updated_at, deleted_at)
 *
 * Direct copy -- only added deleted_at (set to NULL).
 */
export async function migrateCrmReferenceMappings(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting crm_reference_mappings migration...");

  const { rows } = await oldDb.query(
    `SELECT id, internal_entity_id, internal_type, crm_reference_id,
            created_at, updated_at
     FROM crm_reference_mappings ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} crm_reference_mappings in old DB`);
  if (rows.length === 0) return;

  const columns = [
    "id", "internal_entity_id", "internal_type", "crm_reference_id",
    "created_at", "updated_at", "deleted_at",
  ];

  const values = rows.map((r) => [
    r.id,
    r.internal_entity_id,
    r.internal_type,
    r.crm_reference_id,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    null, // deleted_at
  ]);

  const inserted = await batchInsert(newDb, "crm_reference_mappings", columns, values, { phase: PHASE });
  log(PHASE, `CRM reference mappings migration complete: ${inserted} inserted out of ${rows.length}`);
}
