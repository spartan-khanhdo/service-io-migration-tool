import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 5.5";

/**
 * Migrate document_upload_tokens table.
 *
 * Old: (id, jti, business_id, document_request_id, token, uploaded_count, expires_at,
 *       used, revoked, reverted_at, webhook_url, used_by, created_at, updated_at)
 * New (post-061): (id, token, expires_at, is_used, revoked, webhook_url,
 *       business_id, document_request_id, jti, uploaded_count, used_by,
 *       created_at, updated_at, deleted_at)
 *
 * Migration 061: added revoked, webhook_url. Dropped model_type, model_id,
 * collection_name, requested_by, max_files, uploaded_files, used_at.
 * Rename: used → is_used
 */
export async function migrateDocumentUploadTokens(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting document_upload_tokens migration...");

  const { rows } = await oldDb.query(
    `SELECT id, jti, business_id, document_request_id, token, uploaded_count,
            expires_at, used, revoked, reverted_at, webhook_url, used_by,
            created_at, updated_at
     FROM document_upload_tokens ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} document_upload_tokens in old DB`);
  if (rows.length === 0) return;

  const columns = [
    "id", "token", "expires_at", "is_used",
    "revoked", "webhook_url",
    "business_id", "document_request_id", "jti",
    "uploaded_count", "used_by",
    "created_at", "updated_at", "deleted_at",
  ];

  const values = rows.map((r) => [
    r.id,
    r.token,
    r.expires_at,
    r.used,                      // used → is_used
    r.revoked ?? false,
    r.webhook_url ?? null,
    r.business_id,
    r.document_request_id,
    r.jti,
    r.uploaded_count,
    r.used_by,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    null,
  ]);

  const inserted = await batchInsert(newDb, "document_upload_tokens", columns, values, { phase: PHASE });
  log(PHASE, `Document upload tokens migration complete: ${inserted} inserted out of ${rows.length}`);
}
