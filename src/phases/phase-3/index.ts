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
