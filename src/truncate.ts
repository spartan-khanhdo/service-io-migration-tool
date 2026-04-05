import "dotenv/config";
import { createNewDbPool } from "./config/database.js";
import { log, logError } from "./util/logger.js";

// Truncate in reverse dependency order (phase 6 → 1) for semantic clarity.
// New DB has no FK constraints, so any order works, but this matches migration order reversed.
const TABLES = [
  // Phase 6
  "settings_asset_property_histories",
  "settings_asset_properties",
  "settings_assets",
  "crm_sync_outbox",
  "user_business_notes",
  "user_business_messages",
  "business_statuses",
  "notifications",

  // Phase 5
  "notification_batches",
  "document_upload_tokens",
  "business_upload_tokens",
  "business_claim_tokens",
  "api_keys",
  "user_agreements",

  // Phase 4
  "assignment_history",
  "audit_logs",
  "prequalification_letters",
  "business_messages",
  "business_notes",
  "document_requests",
  "user_brokerage_offices",
  "offices",
  "brokerages",
  "broker_profiles",
  "media",

  // Phase 3
  "business_listing_extensions",
  "business_tags",
  "tags",
  "business_pre_qualifications",
  "user_organizations",
  "business_users",
  "business_organizations",
  "businesses",

  // Phase 2
  "role_has_permissions",
  "model_has_permissions",
  "model_has_roles",
  "users",
  "permissions",
  "roles",
  "organizations",

  // Phase 1
  "naics_codes",
  "industries",
  "city_counties",
  "cities",
  "counties",
  "states",
];

async function main(): Promise<void> {
  log("Truncate", "=== Truncate All Migration Tables ===");
  log("Truncate", `Tables to truncate: ${TABLES.length}`);

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run") || process.env.DRY_RUN === "true";

  if (dryRun) {
    log("Truncate", "[DRY RUN] No data will be deleted.");
    for (const table of TABLES) {
      log("Truncate", `  Would truncate: ${table}`);
    }
    return;
  }

  // Prompt confirmation unless --force is passed
  if (!args.includes("--force")) {
    log("Truncate", "WARNING: This will DELETE ALL DATA from the new database.");
    log("Truncate", "Pass --force to skip this prompt, or --dry-run to preview.");
    log("Truncate", "Waiting 5 seconds before proceeding... (Ctrl+C to cancel)");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  const newDb = createNewDbPool();

  try {
    for (const table of TABLES) {
      try {
        await newDb.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
        log("Truncate", `  Truncated: ${table}`);
      } catch (error) {
        logError("Truncate", `  Failed to truncate: ${table}`, error);
      }
    }

    log("Truncate", "=== Truncate Complete ===");
  } finally {
    await newDb.end();
  }
}

main();
