import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 3.5";

/**
 * Migrate business_pre_qualifications (same table name in both DBs).
 *
 * Old: business_pre_qualifications(id, business_id, pre_qualification_status, pre_qualification_reason,
 *      pre_qualification_started_at, pre_qualification_ended_at, is_latest, pre_qualification_sub_status,
 *      pre_qualification_tertiary_status, lender_note, created_at, updated_at, deleted_at, created_by, modified_by, deleted_by)
 *
 * New (post-044): business_pre_qualifications(id, business_id, status, sub_status, tertiary_status,
 *      expires_at, submitted_at, reason, lender_note, is_latest,
 *      created_at, updated_at, deleted_at, created_by, modified_by, deleted_by)
 *
 * Transforms:
 * - pre_qualification_status → status
 * - pre_qualification_sub_status → sub_status
 * - pre_qualification_tertiary_status → tertiary_status
 * - pre_qualification_reason → reason (was external_notes, now reason per 044)
 * - lender_note → lender_note (same name, was internal_notes, reverted per 044)
 * - pre_qualification_started_at → submitted_at
 * - pre_qualification_ended_at → expires_at
 */
export async function migrateBusinessPrequalifications(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting business_pre_qualifications migration...");

  const { rows } = await oldDb.query(
    `SELECT id, business_id, pre_qualification_status, pre_qualification_sub_status,
            pre_qualification_tertiary_status, pre_qualification_reason,
            pre_qualification_started_at, pre_qualification_ended_at,
            is_latest, lender_note,
            created_at, updated_at, deleted_at, created_by, modified_by, deleted_by
     FROM business_pre_qualifications ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} business_pre_qualifications in old DB`);
  if (rows.length === 0) return;

  const columns = [
    "id", "business_id",
    "status", "sub_status", "tertiary_status",
    "submitted_at", "expires_at",
    "reason", "lender_note",
    "is_latest",
    "created_at", "updated_at", "deleted_at",
    "created_by", "modified_by", "deleted_by",
  ];

  const values = rows.map((r) => [
    r.id,
    r.business_id,
    r.pre_qualification_status,
    r.pre_qualification_sub_status,
    r.pre_qualification_tertiary_status,
    r.pre_qualification_started_at,       // → submitted_at
    r.pre_qualification_ended_at,         // → expires_at
    r.pre_qualification_reason,           // → reason
    r.lender_note,                        // → lender_note (same name)
    r.is_latest,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    r.deleted_at,
    r.created_by,
    r.modified_by,
    r.deleted_by,
  ]);

  const inserted = await batchInsert(newDb, "business_pre_qualifications", columns, values, { phase: PHASE });
  log(PHASE, `Business prequalifications migration complete: ${inserted} inserted out of ${rows.length}`);
}
