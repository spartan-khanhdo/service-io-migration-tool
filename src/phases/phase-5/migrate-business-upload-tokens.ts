import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 5.4";

/**
 * Migrate business_upload_tokens table.
 *
 * Old: (id, jti, business_id, token, expires_at, used, revoked, created_at, updated_at)
 * New (post-059): (id, business_id, token, expires_at, is_used, jti, revoked,
 *      created_at, updated_at, deleted_at)
 *
 * Migration 059: dropped collection_name, requested_by, max_files, uploaded_files, used_at.
 * Rename: used → is_used
 */
export async function migrateBusinessUploadTokens(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting business_upload_tokens migration...");

  const { rows } = await oldDb.query(
    `SELECT id, jti, business_id, token, expires_at, used, revoked, created_at, updated_at
     FROM business_upload_tokens ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} business_upload_tokens in old DB`);
  if (rows.length === 0) return;

  const columns = [
    "id", "business_id", "token", "expires_at", "is_used",
    "jti", "revoked",
    "created_at", "updated_at", "deleted_at",
  ];

  const values = rows.map((r) => [
    r.id,
    r.business_id,
    r.token,
    r.expires_at,
    r.used,              // used → is_used
    r.jti,
    r.revoked,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    null,
  ]);

  const inserted = await batchInsert(newDb, "business_upload_tokens", columns, values, { phase: PHASE });
  log(PHASE, `Business upload tokens migration complete: ${inserted} inserted out of ${rows.length}`);
}
