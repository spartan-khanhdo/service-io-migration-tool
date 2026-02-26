import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 4.6";

/**
 * Migrate document_requests table.
 *
 * Old: document_requests(id, requester_id, business_id, media_id UUID, status, document_name,
 *      category, comment, validation_token, requested_at, last_reminder_sent_at,
 *      created_at, updated_at, created_by, modified_by, deleted_at, deleted_by)
 * New (post-051): document_requests(id, business_id, requester_id, comment, status, category,
 *      media_id UUID, validation_token, requested_at, last_reminder_sent_at,
 *      created_by, modified_by, deleted_by,
 *      created_at, updated_at, deleted_at)
 *
 * Migration 051: dropped document_name, added requested_at, created_by, modified_by, deleted_by.
 * media_id already stored as UUID in old DB (matches media.uuid), so no ID mapping needed.
 */
export async function migrateDocumentRequests(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting document_requests migration...");

  const { rows } = await oldDb.query(
    `SELECT id, requester_id, business_id, media_id, status,
            category, comment, validation_token, requested_at, last_reminder_sent_at,
            created_at, updated_at, deleted_at, created_by, modified_by, deleted_by
     FROM document_requests ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} document_requests in old DB`);
  if (rows.length === 0) return;

  const columns = [
    "id", "business_id", "requester_id", "comment",
    "status", "category", "media_id", "validation_token",
    "requested_at", "last_reminder_sent_at",
    "created_by", "modified_by", "deleted_by",
    "created_at", "updated_at", "deleted_at",
  ];

  const values = rows.map((r) => [
    r.id,
    r.business_id,
    r.requester_id,
    r.comment,
    r.status,
    r.category,
    r.media_id,              // already UUID, maps to new media.id
    r.validation_token,
    r.requested_at ?? null,
    r.last_reminder_sent_at,
    r.created_by ?? null,
    r.modified_by ?? null,
    r.deleted_by ?? null,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    r.deleted_at,
  ]);

  const inserted = await batchInsert(newDb, "document_requests", columns, values, { phase: PHASE });
  log(PHASE, `Document requests migration complete: ${inserted} inserted out of ${rows.length}`);
}
