import pg from "pg";
import { log, logError } from "../util/logger.js";

const PHASE = "Phase 0";

const OLD_TABLES = [
  "users",
  "organizations",
  "businesses",
  "roles",
  "permissions",
  "model_has_roles",
  "model_has_permissions",
  "role_has_permissions",
  "states",
  "counties",
  "cities",
  "city_counties",
  "industries",
  "naics_codes",
  "user_organizations",
  "business_organizations",
  "business_user",
  "business_pre_qualifications",
  "tags",
  "business_tags",
  "media",
  "broker_profiles",
  "brokerages",
  "offices",
  "user_brokerage_offices",
  "document_requests",
  "business_notes",
  "business_messages",
  "prequalification_letters",
  "audit_logs",
  "assignment_history",
  "business_listing_extensions",
  "user_agreements",
  "api_keys",
  "business_claim_tokens",
  "business_upload_tokens",
  "document_upload_tokens",
  "backyard_partner_mappings",
  "notification_batches",
  "crm_reference_mappings",
];

const NEW_TABLES = [
  "users",
  "organizations",
  "businesses",
  "roles",
  "permissions",
  "model_has_roles",
  "model_has_permissions",
  "role_has_permissions",
  "states",
  "counties",
  "cities",
  "city_counties",
  "industries",
  "naics_codes",
  "user_organizations",
  "business_organizations",
  "business_users",
  "business_pre_qualifications",
  "tags",
  "business_tags",
  "media",
  "broker_profiles",
  "brokerages",
  "offices",
  "brokerage_offices",
  "user_brokerage_offices",
  "document_requests",
  "business_notes",
  "business_messages",
  "prequalification_letters",
  "audit_logs",
  "assignment_history",
  "business_listing_extensions",
  "user_agreements",
  "api_keys",
  "business_claim_tokens",
  "business_upload_tokens",
  "document_upload_tokens",
  "organization_admins",
  // "backyard_partner_mappings", // TODO: Not yet in Flyway migrations
  "notification_batches",
  "crm_reference_mappings",
];

async function testConnection(pool: pg.Pool, label: string): Promise<boolean> {
  try {
    const result = await pool.query("SELECT 1 as ok");
    if (result.rows[0]?.ok === 1) {
      log(PHASE, `${label} connection: OK`);
      return true;
    }
    logError(PHASE, `${label} connection: unexpected result`);
    return false;
  } catch (error) {
    logError(PHASE, `${label} connection: FAILED`, error);
    return false;
  }
}

async function countTable(pool: pg.Pool, table: string): Promise<{ total: number; active: number } | null> {
  try {
    const totalResult = await pool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const total = parseInt(totalResult.rows[0].count, 10);

    // Check if table has deleted_at column
    const colCheck = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = 'deleted_at'`,
      [table]
    );

    let active = total;
    if (colCheck.rows.length > 0) {
      const activeResult = await pool.query(`SELECT COUNT(*) as count FROM "${table}" WHERE deleted_at IS NULL`);
      active = parseInt(activeResult.rows[0].count, 10);
    }

    return { total, active };
  } catch {
    return null;
  }
}

async function checkTablesExist(pool: pg.Pool, tables: string[], label: string): Promise<string[]> {
  const missing: string[] = [];
  for (const table of tables) {
    const result = await pool.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1) as exists`,
      [table]
    );
    if (!result.rows[0].exists) {
      missing.push(table);
    }
  }
  if (missing.length > 0) {
    logError(PHASE, `${label} missing tables: ${missing.join(", ")}`);
  } else {
    log(PHASE, `${label} all ${tables.length} tables exist`);
  }
  return missing;
}

export async function runPhase0(oldDb: pg.Pool, newDb: pg.Pool): Promise<boolean> {
  log(PHASE, "=== Pre-flight Validation ===");

  // 1. Test connections
  const oldOk = await testConnection(oldDb, "Old DB");
  const newOk = await testConnection(newDb, "New DB");
  if (!oldOk || !newOk) {
    logError(PHASE, "Database connection failed. Aborting.");
    return false;
  }

  // 2. Check tables exist
  const oldMissing = await checkTablesExist(oldDb, OLD_TABLES, "Old DB");
  const newMissing = await checkTablesExist(newDb, NEW_TABLES, "New DB");

  if (newMissing.length > 0) {
    logError(PHASE, "New DB missing tables — ensure Flyway migrations are applied.");
    return false;
  }

  // 3. Count records in old DB
  log(PHASE, "--- Old DB Record Counts ---");
  for (const table of OLD_TABLES) {
    if (oldMissing.includes(table)) continue;
    const counts = await countTable(oldDb, table);
    if (counts) {
      log(PHASE, `  ${table}: ${counts.active} active / ${counts.total} total`);
    }
  }

  // 4. Check new DB is empty (warn if not)
  log(PHASE, "--- New DB Record Counts ---");
  let newDbHasData = false;
  for (const table of NEW_TABLES) {
    const counts = await countTable(newDb, table);
    if (counts && counts.total > 0) {
      log(PHASE, `  ${table}: ${counts.total} records (WARNING: not empty)`);
      newDbHasData = true;
    }
  }

  if (newDbHasData) {
    log(PHASE, "WARNING: New DB has existing data. Migration uses ON CONFLICT DO NOTHING.");
  } else {
    log(PHASE, "New DB is empty — ready for migration.");
  }

  log(PHASE, "=== Validation Complete ===");
  return true;
}
