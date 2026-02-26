import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { migrateMedia } from "./migrate-media.js";
import { migrateBrokerProfiles } from "./migrate-broker-profiles.js";
import { migrateBrokerages } from "./migrate-brokerages.js";
import { migrateOffices } from "./migrate-offices.js";
import { migrateUserBrokerageOffices } from "./migrate-user-brokerage-offices.js";
import { migrateDocumentRequests } from "./migrate-document-requests.js";
import { migrateBusinessNotes } from "./migrate-business-notes.js";
import { migrateBusinessMessages } from "./migrate-business-messages.js";
import { migratePrequalificationLetters } from "./migrate-prequalification-letters.js";
import { migrateAuditLogs } from "./migrate-audit-logs.js";
import { migrateAssignmentHistory } from "./migrate-assignment-history.js";

export async function runPhase4(oldDb: pg.Pool, newDb: pg.Pool, idMap: IdMappingStore): Promise<void> {
  log("Phase 4", "=== Starting Phase 4: Supporting Data ===");

  // 4.1 Media first (builds ID mapping for downstream tables)
  await migrateMedia(oldDb, newDb, idMap);

  // 4.2-4.5 Broker-related
  await migrateBrokerProfiles(oldDb, newDb, idMap);
  await migrateBrokerages(oldDb, newDb, idMap);
  await migrateOffices(oldDb, newDb, idMap);
  await migrateUserBrokerageOffices(oldDb, newDb, idMap);

  // 4.6-4.8 Documents & communications
  await migrateDocumentRequests(oldDb, newDb, idMap);
  await migrateBusinessNotes(oldDb, newDb, idMap);
  await migrateBusinessMessages(oldDb, newDb, idMap);

  // 4.9 Prequalification letters
  await migratePrequalificationLetters(oldDb, newDb, idMap);

  // 4.10-4.11 Audit & history
  await migrateAuditLogs(oldDb, newDb, idMap);
  await migrateAssignmentHistory(oldDb, newDb, idMap);

  // Skipped tables:
  // - business_listing_extensions: Schema completely redesigned (old=listing details, new=extension tracking). No meaningful migration.
  // - dsca_media: Does not exist in old DB. New table only.

  log("Phase 4", "=== Phase 4 Complete ===");
}
