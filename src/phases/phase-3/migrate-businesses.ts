import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";
import { parseNaicsType } from "../../parser/composite-type.js";

const PHASE = "Phase 3.1";

/**
 * Migrate businesses table.
 *
 * Key transforms:
 * - Parse composite type: naics_code
 * - Removed (043): industry_id, state_code, state_id, county_id, city_id, city, country,
 *   hide_address, is_featured, view_count, inquiry_count
 * - Added (043): slug, ytd_pnl_expiry_date, changed_values
 * - pre_qualification_status defaults to 'draft' if NULL
 */
export async function migrateBusinesses(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting businesses migration...");

  const batchSize = 500;
  let offset = 0;
  let totalInserted = 0;
  let totalRows = 0;

  // Get total count first
  const countResult = await oldDb.query(`SELECT COUNT(*) as count FROM businesses`);
  const total = parseInt(countResult.rows[0].count, 10);
  log(PHASE, `Found ${total} businesses in old DB`);

  if (total === 0) return;

  while (offset < total) {
    const { rows } = await oldDb.query(
      `SELECT * FROM businesses ORDER BY created_at NULLS LAST LIMIT $1 OFFSET $2`,
      [batchSize, offset]
    );

    if (rows.length === 0) break;

    const columns = [
      "id", "name", "headline",
      "business_name", "short_summary",
      "naics_code",
      "last_full_year_revenue", "last_full_year_seller_discretionary",
      "asking_price", "down_payment", "loan_amount", "listing_price",
      "is_real_estate_included", "real_estate_value", "real_estate_asking_price",
      "willing_to_hold_note", "note_amount",
      "is_franchise", "franchise_name",
      "has_dba", "dba_name",
      "address",
      "year_established", "number_of_employees",
      "year_of_business_formation",
      "annual_revenue", "year_of_annual_revenue",
      "seller_discretionary_earning", "year_of_seller_discretionary_earning",
      "reason_for_selling_text",
      "status", "status_changed_at",
      "pre_qualification_status", "pre_qualification_sub_status", "pre_qualification_tertiary_status",
      "is_sba_pre_qualified",
      "seller_id", "seller_email", "broker_id", "lender_id",
      "listing_link", "listing_password", "reporting_year",
      "document_expiry_date", "document_last_provided_date",
      "ein",
      "applications_count", "last_application_submitted_at", "number_of_documents",
      "cover_image", "stamped_cover_image",
      "source",
      "slug", "ytd_pnl_expiry_date", "changed_values",
      "created_at", "updated_at", "deleted_at",
      "created_by", "modified_by", "deleted_by",
    ];

    const values = rows.map((r) => {
      // Parse composite types
      const naics = parseNaicsType(r.naics_code);

      return [
        r.id,
        r.name,
        r.headline,
        r.business_name,
        r.short_summary,
        naics?.code || null,        // naics_code (string from composite)
        r.last_full_year_revenue,
        r.last_full_year_seller_discretionary,
        r.asking_price,
        r.down_payment,
        r.loan_amount,
        r.listing_price,
        r.is_real_estate_included,
        r.real_estate_value,
        r.real_estate_asking_price,
        r.willing_to_hold_note,
        r.note_amount,
        r.is_franchise,
        r.franchise_name,
        r.has_dba,
        r.dba_name,
        r.address || null,
        r.year_established,
        r.number_of_employees,
        r.year_of_business_formation,
        r.annual_revenue,
        r.year_of_annual_revenue,
        r.seller_discretionary_earning,
        r.year_of_seller_discretionary_earning,
        r.reason_for_selling_text,
        r.status,
        r.status_changed_at,
        r.pre_qualification_status ?? "draft",  // NOT NULL DEFAULT 'draft'
        r.pre_qualification_sub_status,
        r.pre_qualification_tertiary_status,
        r.is_sba_pre_qualified,
        r.seller_id,
        r.seller_email,
        r.broker_id,
        r.lender_id,
        r.listing_link,
        r.listing_password,
        r.reporting_year ? parseInt(r.reporting_year, 10) || null : null,  // varchar → int
        r.document_expiry_date,
        r.document_last_provided_date,
        r.ein,
        r.applications_count ?? 0,
        r.last_application_submitted_at,
        r.number_of_documents ?? 0,
        r.cover_image ? JSON.stringify(r.cover_image) : null,
        r.stamped_cover_image ? JSON.stringify(r.stamped_cover_image) : null,
        r.source ?? "manual",
        r.slug ?? null,
        r.ytd_pnl_expiry_date ?? null,
        r.changed_values ? JSON.stringify(r.changed_values) : null,
        r.created_at ?? new Date(),
        r.updated_at ?? new Date(),
        r.deleted_at,
        r.created_by,
        r.modified_by,
        r.deleted_by,
      ];
    });

    const inserted = await batchInsert(newDb, "businesses", columns, values, { phase: PHASE });
    totalInserted += inserted;
    totalRows += rows.length;
    offset += batchSize;
  }

  log(PHASE, `Businesses migration complete: ${totalInserted} inserted out of ${totalRows}`);
}
