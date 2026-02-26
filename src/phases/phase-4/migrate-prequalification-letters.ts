import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 4.9";

/**
 * Migrate prequalification_letters table.
 *
 * Schema is nearly identical between old and new.
 * media_id already stored as UUID (matches media.uuid → new media.id).
 * Migration 060: renamed updated_by → modified_by (now same as old DB column name).
 */
export async function migratePrequalificationLetters(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting prequalification_letters migration...");

  const { rows } = await oldDb.query(
    `SELECT id, business_id, business_name, lender_id, media_id,
            purchase_price, sba_loan_amount, equity_injection, monthly_payment,
            total_project_cost, loan_term_months,
            interest_rate_effective, interest_rate_margin, interest_rate_base,
            terms_text, interest_rate_text, additional_info,
            is_loanbud_user, lender_name, lender_phone, lender_email,
            file_name, letter_head, generated_at, is_latest,
            created_at, updated_at, deleted_at,
            created_by, modified_by, deleted_by
     FROM prequalification_letters ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} prequalification_letters in old DB`);
  if (rows.length === 0) return;

  const columns = [
    "id", "business_id", "business_name", "lender_id", "media_id",
    "purchase_price", "sba_loan_amount", "equity_injection", "monthly_payment",
    "total_project_cost", "loan_term_months",
    "interest_rate_effective", "interest_rate_margin", "interest_rate_base",
    "terms_text", "interest_rate_text", "additional_info",
    "is_loanbud_user", "lender_name", "lender_phone", "lender_email",
    "file_name", "letter_head", "generated_at", "is_latest",
    "created_at", "updated_at", "deleted_at",
    "created_by", "modified_by", "deleted_by",
  ];

  const values = rows.map((r) => [
    r.id, r.business_id, r.business_name, r.lender_id, r.media_id,
    r.purchase_price, r.sba_loan_amount, r.equity_injection, r.monthly_payment,
    r.total_project_cost, r.loan_term_months,
    r.interest_rate_effective, r.interest_rate_margin, r.interest_rate_base,
    r.terms_text, r.interest_rate_text, r.additional_info,
    r.is_loanbud_user, r.lender_name, r.lender_phone, r.lender_email,
    r.file_name, r.letter_head, r.generated_at, r.is_latest,
    r.created_at ?? new Date(), r.updated_at ?? new Date(), r.deleted_at,
    r.created_by, r.modified_by,     // modified_by → modified_by (same name now per 060)
    r.deleted_by,
  ]);

  const inserted = await batchInsert(newDb, "prequalification_letters", columns, values, { phase: PHASE });
  log(PHASE, `Prequalification letters migration complete: ${inserted} inserted out of ${rows.length}`);
}
