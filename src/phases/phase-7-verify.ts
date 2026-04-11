import pg from "pg";
import fs from "fs";
import path from "path";
import { log, logError } from "../util/logger.js";

const PHASE = "Phase 7";

/**
 * Table verification mapping.
 *
 * Each entry defines:
 * - oldTable / newTable: table names in old and new DB
 * - expectSkips: if true, new count may be less than old (dedup, NULL FK skips, etc.)
 * - skipReason: optional explanation for expected skips
 * - countQuery: optional custom query to get the "comparable" count from old DB
 */
interface TableCheck {
  oldTable: string;
  newTable: string;
  expectSkips?: boolean;
  skipReason?: string;
  oldCountQuery?: string;
}

const TABLE_CHECKS: TableCheck[] = [
  // Phase 1: Reference data
  { oldTable: "states", newTable: "states" },
  { oldTable: "counties", newTable: "counties" },
  { oldTable: "cities", newTable: "cities" },
  { oldTable: "city_counties", newTable: "city_counties" },
  { oldTable: "industries", newTable: "industries" },
  { oldTable: "naics_codes", newTable: "naics_codes" },

  // Phase 2: Core entities
  { oldTable: "organizations", newTable: "organizations" },
  { oldTable: "roles", newTable: "roles" },
  { oldTable: "permissions", newTable: "permissions" },
  { oldTable: "users", newTable: "users" },
  { oldTable: "model_has_roles", newTable: "model_has_roles" },
  { oldTable: "model_has_permissions", newTable: "model_has_permissions" },
  { oldTable: "role_has_permissions", newTable: "role_has_permissions" },

  // Phase 3: Business & related
  { oldTable: "businesses", newTable: "businesses" },
  { oldTable: "business_organizations", newTable: "business_organizations" },
  { oldTable: "business_user", newTable: "business_users" },
  { oldTable: "user_organizations", newTable: "user_organizations" },
  { oldTable: "business_pre_qualifications", newTable: "business_pre_qualifications" },
  { oldTable: "tags", newTable: "tags" },
  {
    oldTable: "business_tags",
    newTable: "business_tags",
    expectSkips: true,
    skipReason: "Deduplicated on (business_id, tag_id)",
    oldCountQuery: "SELECT COUNT(*) as count FROM (SELECT DISTINCT business_id, tag_id FROM business_tags) sub",
  },
  { oldTable: "business_listing_extensions", newTable: "business_listing_extensions" },

  // Phase 4: Supporting data
  { oldTable: "media", newTable: "media" },
  { oldTable: "broker_profiles", newTable: "broker_profiles" },
  { oldTable: "brokerages", newTable: "brokerages" },
  { oldTable: "offices", newTable: "offices" },
  { oldTable: "brokerage_offices", newTable: "brokerage_offices" },
  {
    oldTable: "user_brokerage_offices",
    newTable: "user_brokerage_offices",
    expectSkips: true,
    skipReason: "Skipped NULL brokerage_id/office_id",
    oldCountQuery: "SELECT COUNT(*) as count FROM user_brokerage_offices WHERE brokerage_id IS NOT NULL AND office_id IS NOT NULL",
  },
  { oldTable: "document_requests", newTable: "document_requests" },
  { oldTable: "business_notes", newTable: "business_notes" },
  { oldTable: "business_messages", newTable: "business_messages" },
  { oldTable: "prequalification_letters", newTable: "prequalification_letters" },
  {
    oldTable: "audit_logs",
    newTable: "audit_logs",
    expectSkips: true,
    skipReason: "Skipped NULL model_id",
    oldCountQuery: "SELECT COUNT(*) as count FROM audit_logs WHERE model_id IS NOT NULL",
  },
  { oldTable: "assignment_history", newTable: "assignment_history" },

  // Phase 5: Tokens & misc
  { oldTable: "user_agreements", newTable: "user_agreements" },
  { oldTable: "api_keys", newTable: "api_keys" },
  { oldTable: "business_claim_tokens", newTable: "business_claim_tokens" },
  { oldTable: "business_upload_tokens", newTable: "business_upload_tokens" },
  { oldTable: "document_upload_tokens", newTable: "document_upload_tokens" },
  {
    oldTable: "notification_batches",
    newTable: "notification_batches",
    expectSkips: true,
    skipReason: "Skipped NULL recipient_id",
    oldCountQuery: "SELECT COUNT(*) as count FROM notification_batches WHERE recipient_id IS NOT NULL",
  },

  // Phase 6: Remaining tables
  { oldTable: "notifications", newTable: "notifications" },
  { oldTable: "business_statuses", newTable: "business_statuses" },
  { oldTable: "user_business_messages", newTable: "user_business_messages" },
  { oldTable: "user_business_notes", newTable: "user_business_notes" },
  { oldTable: "crm_sync_outbox", newTable: "crm_sync_outbox" },
  { oldTable: "crm_reference_mappings", newTable: "crm_reference_mappings" },
  { oldTable: "settings_assets", newTable: "settings_assets" },
  {
    oldTable: "settings_asset_properties",
    newTable: "settings_asset_properties",
    expectSkips: true,
    skipReason: "Skipped duplicate (asset_id, key) pairs",
  },
  { oldTable: "settings_asset_property_histories", newTable: "settings_asset_property_histories" },
];

async function getCount(pool: pg.Pool, query: string): Promise<number> {
  const result = await pool.query(query);
  return parseInt(result.rows[0].count, 10);
}

interface VerifyResult {
  oldTable: string;
  newTable: string;
  oldCount: number;
  newCount: number;
  status: "PASS" | "FAIL" | "WARN";
  note?: string;
}

export async function runPhase7(
  oldDb: pg.Pool,
  newDb: pg.Pool,
): Promise<boolean> {
  log(PHASE, "=== Starting Phase 7: Post-Migration Verification ===");

  const results: VerifyResult[] = [];
  let failures = 0;

  for (const check of TABLE_CHECKS) {
    try {
      const oldCountQuery = check.oldCountQuery ?? `SELECT COUNT(*) as count FROM "${check.oldTable}"`;
      const oldCount = await getCount(oldDb, oldCountQuery);
      const newCount = await getCount(newDb, `SELECT COUNT(*) as count FROM "${check.newTable}"`);

      let status: "PASS" | "FAIL" | "WARN" = "PASS";
      let note: string | undefined;

      if (oldCount === newCount) {
        status = "PASS";
      } else if (check.expectSkips && newCount < oldCount) {
        status = "WARN";
        note = `${check.skipReason} (${oldCount - newCount} skipped)`;
      } else if (newCount !== oldCount) {
        status = "FAIL";
        note = `Expected ${oldCount}, got ${newCount} (diff: ${newCount - oldCount})`;
        failures++;
      }

      const icon = status === "PASS" ? "OK" : status === "WARN" ? "WARN" : "FAIL";
      const tablePair = check.oldTable === check.newTable
        ? check.oldTable
        : `${check.oldTable} → ${check.newTable}`;
      log(PHASE, `  [${icon}] ${tablePair}: old=${oldCount} new=${newCount}${note ? ` (${note})` : ""}`);

      results.push({ oldTable: check.oldTable, newTable: check.newTable, oldCount, newCount, status, note });
    } catch (error) {
      logError(PHASE, `  [ERR] ${check.oldTable}: query failed`, error);
      results.push({
        oldTable: check.oldTable,
        newTable: check.newTable,
        oldCount: -1,
        newCount: -1,
        status: "FAIL",
        note: "Query error",
      });
      failures++;
    }
  }

  // Summary
  const passed = results.filter((r) => r.status === "PASS").length;
  const warned = results.filter((r) => r.status === "WARN").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const totalOld = results.reduce((sum, r) => sum + (r.oldCount > 0 ? r.oldCount : 0), 0);
  const totalNew = results.reduce((sum, r) => sum + (r.newCount > 0 ? r.newCount : 0), 0);

  log(PHASE, "--- Verification Summary ---");
  log(PHASE, `  Tables checked: ${results.length}`);
  log(PHASE, `  PASS: ${passed}, WARN: ${warned}, FAIL: ${failed}`);
  log(PHASE, `  Total records: old=${totalOld}, new=${totalNew}`);

  // Write results to migration-results.json
  writeResults(results, { passed, warned, failed, totalOld, totalNew });

  const overallPass = failures === 0;
  log(PHASE, `=== Phase 7 ${overallPass ? "PASSED" : "FAILED"} ===`);
  return overallPass;
}

function writeResults(
  results: VerifyResult[],
  summary: { passed: number; warned: number; failed: number; totalOld: number; totalNew: number }
): void {
  const resultsPath = path.resolve(process.cwd(), "migration-results.json");

  try {
    let data: Record<string, unknown> = {};
    if (fs.existsSync(resultsPath)) {
      data = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));
    }

    // Update top-level metadata
    data.last_run = new Date().toISOString().replace(/\.\d{3}Z$/, "");
    data.status = summary.failed === 0 ? "SUCCESS" : "FAILED";

    // Update phase counts from verification results
    const phases = (data.phases ?? {}) as Record<string, Record<string, unknown>>;
    for (const r of results) {
      // Find the phase that contains this table and update counts
      for (const phaseKey of Object.keys(phases)) {
        const tables = phases[phaseKey]?.tables as Record<string, Record<string, unknown>> | undefined;
        if (!tables) continue;

        // Match by new table name (that's what phases use as keys)
        const tableEntry = tables[r.newTable];
        if (tableEntry) {
          tableEntry.old = r.oldCount;
          tableEntry.inserted = r.newCount;
          tableEntry.skipped = r.oldCount - r.newCount;
        }
      }
    }

    // Add/update phase_7
    phases.phase_7 = {
      name: "Post-Migration Verification",
      status: summary.failed === 0 ? "PASS" : "FAIL",
      summary: {
        tables_checked: results.length,
        passed: summary.passed,
        warned: summary.warned,
        failed: summary.failed,
        total_records_old: summary.totalOld,
        total_records_new: summary.totalNew,
      },
      tables: Object.fromEntries(
        results.map((r) => [
          r.newTable,
          {
            old_table: r.oldTable,
            old_count: r.oldCount,
            new_count: r.newCount,
            status: r.status,
            ...(r.note ? { note: r.note } : {}),
          },
        ])
      ),
    };

    data.phases = phases;
    fs.writeFileSync(resultsPath, JSON.stringify(data, null, 2) + "\n");
    log(PHASE, `Results written to ${resultsPath}`);
  } catch (error) {
    logError(PHASE, "Failed to write migration-results.json", error);
  }
}
