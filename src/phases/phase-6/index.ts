import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { migrateNotifications } from "./migrate-notifications.js";
import { migrateBusinessStatuses } from "./migrate-business-statuses.js";
import { migrateUserBusinessMessages } from "./migrate-user-business-messages.js";
import { migrateUserBusinessNotes } from "./migrate-user-business-notes.js";
import { migrateCrmSyncOutbox } from "./migrate-crm-sync-outbox.js";
import { migrateSettingsAssets } from "./migrate-settings-assets.js";
import { migrateSettingsAssetProperties } from "./migrate-settings-asset-properties.js";
import { migrateSettingsAssetPropertyHistories } from "./migrate-settings-asset-property-histories.js";
import { migrateCrmReferenceMappings } from "./migrate-crm-reference-mappings.js";

export async function runPhase6(oldDb: pg.Pool, newDb: pg.Pool, idMap: IdMappingStore): Promise<void> {
  log("Phase 6", "=== Starting Phase 6: Remaining Tables ===");

  // Truncate all phase-6 tables before migration to ensure clean state.
  // settings_assets/properties/histories are also truncated inside migrateSettingsAssets.
  log("Phase 6", "Truncating phase-6 tables...");
  await newDb.query(`
    TRUNCATE crm_sync_outbox, crm_reference_mappings, user_business_notes,
             user_business_messages, business_statuses, notifications
  `);

  await migrateNotifications(oldDb, newDb, idMap);
  await migrateBusinessStatuses(oldDb, newDb, idMap);
  await migrateUserBusinessMessages(oldDb, newDb, idMap);
  await migrateUserBusinessNotes(oldDb, newDb, idMap);
  await migrateCrmSyncOutbox(oldDb, newDb, idMap);
  await migrateCrmReferenceMappings(oldDb, newDb, idMap);
  await migrateSettingsAssets(oldDb, newDb, idMap);
  await migrateSettingsAssetProperties(oldDb, newDb, idMap);
  await migrateSettingsAssetPropertyHistories(oldDb, newDb, idMap);

  log("Phase 6", "=== Phase 6 Complete ===");
}
