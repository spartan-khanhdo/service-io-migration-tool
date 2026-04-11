import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";

const PHASE = "Phase 3.8";

/**
 * Migrate business_listing_extensions table.
 *
 * Old: 35 columns (listing details — home-based, property type, financial data, etc.)
 * New: Redesigned via Flyway 037 to match old schema + deleted_at
 *
 * Direct copy — schema now matches. All columns nullable except business_id.
 */
export async function migrateBusinessListingExtensions(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting business_listing_extensions migration...");

  const { rows } = await oldDb.query(`
    SELECT
      id, business_id, organization_listing_id, site_id,
      is_home_based, is_absentee_owner, listing_type,
      number_of_part_time_employees, number_of_contractors, employee_notes,
      web_address, street_address, zip,
      ebitda, inventory_value, ffe, is_inventory_included_in_asking_price,
      seller_financing_notes, facilities, competition,
      real_estate_property_type, building_square_feet, real_estate_value,
      net_operating_income, current_property_expenses, real_estate_type,
      location_description, current_and_prior_use, year_of_construction,
      rent, rental_term,
      organization_status, listing_status,
      applicant_first_name, applicant_last_name, applicant_email, applicant_phone,
      created_at, updated_at
    FROM business_listing_extensions
  `);

  log(PHASE, `Found ${rows.length} business_listing_extensions in old DB`);
  if (rows.length === 0) return;

  const columns = [
    "id", "business_id", "organization_listing_id", "site_id",
    "is_home_based", "is_absentee_owner", "listing_type",
    "number_of_part_time_employees", "number_of_contractors", "employee_notes",
    "web_address", "street_address", "zip",
    "ebitda", "inventory_value", "ffe", "is_inventory_included_in_asking_price",
    "seller_financing_notes", "facilities", "competition",
    "real_estate_property_type", "building_square_feet", "real_estate_value",
    "net_operating_income", "current_property_expenses", "real_estate_type",
    "location_description", "current_and_prior_use", "year_of_construction",
    "rent", "rental_term",
    "organization_status", "listing_status",
    "applicant_first_name", "applicant_last_name", "applicant_email", "applicant_phone",
    "created_at", "updated_at", "deleted_at",
  ];

  const values = rows.map((r) => [
    r.id,
    r.business_id,
    r.organization_listing_id,
    r.site_id,
    r.is_home_based,
    r.is_absentee_owner,
    r.listing_type ?? null,
    r.number_of_part_time_employees,
    r.number_of_contractors,
    r.employee_notes,
    r.web_address,
    r.street_address,
    r.zip,
    r.ebitda,
    r.inventory_value,
    r.ffe,
    r.is_inventory_included_in_asking_price,
    r.seller_financing_notes,
    r.facilities,
    r.competition,
    r.real_estate_property_type,
    r.building_square_feet,
    r.real_estate_value,
    r.net_operating_income,
    r.current_property_expenses,
    r.real_estate_type,
    r.location_description,
    r.current_and_prior_use,
    r.year_of_construction,
    r.rent,
    r.rental_term,
    r.organization_status,
    r.listing_status,
    r.applicant_first_name ?? null,
    r.applicant_last_name ?? null,
    r.applicant_email ?? null,
    r.applicant_phone ?? null,
    r.created_at ?? new Date(),
    r.updated_at ?? new Date(),
    null, // deleted_at
  ]);

  const inserted = await batchInsert(newDb, "business_listing_extensions", columns, values, { phase: PHASE });
  log(PHASE, `Business listing extensions migration complete: ${inserted} inserted out of ${rows.length}`);
}
