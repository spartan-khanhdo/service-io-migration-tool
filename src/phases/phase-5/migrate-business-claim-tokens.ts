import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 5.3";

/**
 * Migrate business_claim_tokens table.
 *
 * Old: (id, business_id, organization_id, token, expires_at, used, revoked, webhook_url, used_by, jti, reverted_at, created_at, updated_at)
 * New: (id, business_id, token, expires_at, is_used, used_by, jti, organization_id, revoked, reverted_at, webhook_url, created_at, updated_at, deleted_at)
 *
 * Rename: used → is_used
 */
export async function migrateBusinessClaimTokens(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting business_claim_tokens migration...");

  const { rows } = await oldDb.query(
    `SELECT id, business_id, organization_id, token, expires_at, used, revoked,
            webhook_url, used_by, jti, reverted_at, created_at, updated_at
     FROM business_claim_tokens ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} business_claim_tokens in old DB`);
  if (rows.length === 0) return;

  const columns = [
    "id", "business_id", "token", "expires_at", "is_used", "used_by",
    "jti", "organization_id", "revoked", "reverted_at", "webhook_url",
    "created_at", "updated_at", "deleted_at",
  ];

  const values = rows.map((r) => [
    r.id, r.business_id, r.token, r.expires_at,
    r.used,               // used → is_used
    r.used_by, r.jti, r.organization_id, r.revoked, r.reverted_at, r.webhook_url,
    r.created_at ?? new Date(), r.updated_at ?? new Date(), null,
  ]);

  const inserted = await batchInsert(newDb, "business_claim_tokens", columns, values, { phase: PHASE });
  log(PHASE, `Business claim tokens migration complete: ${inserted} inserted out of ${rows.length}`);
}
