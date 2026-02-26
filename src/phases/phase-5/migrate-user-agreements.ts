import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 5.1";

/**
 * Migrate user_agreements table.
 *
 * Old: user_agreements(id, user_id, asset_property_id, accepted_at, type, created_at, updated_at)
 * New (post-056): user_agreements(id, user_id, asset_property_id, type, accepted_at, created_at, updated_at, deleted_at)
 *
 * Migration 056: accepted_at relaxed to nullable (was NOT NULL).
 */
export async function migrateUserAgreements(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting user_agreements migration...");

  const { rows } = await oldDb.query(
    `SELECT id, user_id, asset_property_id, type, accepted_at, created_at, updated_at
     FROM user_agreements ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} user_agreements in old DB`);
  if (rows.length === 0) return;

  const columns = ["id", "user_id", "asset_property_id", "type", "accepted_at", "created_at", "updated_at", "deleted_at"];

  const values = rows.map((r) => [
    r.id,
    r.user_id,
    r.asset_property_id,
    r.type,
    r.accepted_at ?? null,               // nullable now (056)
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    null,
  ]);

  const inserted = await batchInsert(newDb, "user_agreements", columns, values, { phase: PHASE });
  log(PHASE, `User agreements migration complete: ${inserted} inserted out of ${rows.length}`);
}
