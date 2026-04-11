import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { migrateBusinesses } from "./migrate-businesses.js";
import { migrateBusinessOrganizations } from "./migrate-business-organizations.js";
import { migrateBusinessUsers } from "./migrate-business-users.js";
import { migrateUserOrganizations } from "./migrate-user-organizations.js";
import { migrateBusinessPrequalifications } from "./migrate-business-prequalifications.js";
import { migrateTags } from "./migrate-tags.js";
import { migrateBusinessTags } from "./migrate-business-tags.js";
import { migrateBusinessListingExtensions } from "./migrate-business-listing-extensions.js";

export async function runPhase3(oldDb: pg.Pool, newDb: pg.Pool, idMap: IdMappingStore): Promise<void> {
  log("Phase 3", "=== Starting Phase 3: Business & Related ===");

  // Truncate all phase-3 tables before migration to ensure clean state.
  // New DB may have records from Kotlin app activity; ON CONFLICT DO NOTHING would leave them in place.
  // No FK constraints in new DB, so order doesn't matter.
  log("Phase 3", "Truncating phase-3 tables...");
  await newDb.query(`
    TRUNCATE business_listing_extensions, business_tags, tags,
             business_pre_qualifications, user_organizations,
             business_users, business_organizations, businesses
  `);

  await migrateBusinesses(oldDb, newDb, idMap);
  await migrateBusinessOrganizations(oldDb, newDb, idMap);
  await migrateBusinessUsers(oldDb, newDb, idMap);
  await migrateUserOrganizations(oldDb, newDb, idMap);
  await migrateBusinessPrequalifications(oldDb, newDb, idMap);
  await migrateTags(oldDb, newDb, idMap);
  await migrateBusinessTags(oldDb, newDb, idMap);
  await migrateBusinessListingExtensions(oldDb, newDb, idMap);

  log("Phase 3", "=== Phase 3 Complete ===");
}
