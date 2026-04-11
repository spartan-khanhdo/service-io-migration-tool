import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { migrateUserAgreements } from "./migrate-user-agreements.js";
import { migrateApiKeys } from "./migrate-api-keys.js";
import { migrateBusinessClaimTokens } from "./migrate-business-claim-tokens.js";
import { migrateBusinessUploadTokens } from "./migrate-business-upload-tokens.js";
import { migrateDocumentUploadTokens } from "./migrate-document-upload-tokens.js";
import { migrateNotificationBatches } from "./migrate-notification-batches.js";

export async function runPhase5(oldDb: pg.Pool, newDb: pg.Pool, idMap: IdMappingStore): Promise<void> {
  log("Phase 5", "=== Starting Phase 5: Tokens & Misc ===");

  // Truncate all phase-5 tables before migration to ensure clean state.
  log("Phase 5", "Truncating phase-5 tables...");
  await newDb.query(`
    TRUNCATE notification_batches, document_upload_tokens,
             business_upload_tokens, business_claim_tokens,
             api_keys, user_agreements
  `);

  await migrateUserAgreements(oldDb, newDb, idMap);
  await migrateApiKeys(oldDb, newDb, idMap);
  await migrateBusinessClaimTokens(oldDb, newDb, idMap);
  await migrateBusinessUploadTokens(oldDb, newDb, idMap);
  await migrateDocumentUploadTokens(oldDb, newDb, idMap);
  await migrateNotificationBatches(oldDb, newDb, idMap);

  log("Phase 5", "=== Phase 5 Complete ===");
}
