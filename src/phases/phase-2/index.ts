import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { migrateOrganizations } from "./migrate-organizations.js";
import { migrateRoles } from "./migrate-roles.js";
import { migratePermissions } from "./migrate-permissions.js";
import { migrateUsers } from "./migrate-users.js";
import { migrateModelHasRoles } from "./migrate-model-has-roles.js";
import { migrateModelHasPermissions } from "./migrate-model-has-permissions.js";
import { migrateRoleHasPermissions } from "./migrate-role-has-permissions.js";

/**
 * Phase 2: Migrate core entities.
 *
 * Execution order:
 * 1. organizations (no deps)
 * 2. roles — build BIGINT → UUID mapping (new DB must be seeded)
 * 3. permissions — build BIGINT → UUID mapping (new DB must be seeded)
 * 4. users (depends on organizations existing)
 * 5. model_has_roles (depends on roles mapping + users)
 * 6. model_has_permissions (depends on permissions mapping + users)
 * 7. role_has_permissions (depends on roles + permissions mappings)
 */
export async function runPhase2(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  idMap: IdMappingStore
): Promise<void> {
  log("Phase 2", "=== Starting Phase 2: Core Entities ===");

  await migrateOrganizations(oldDb, newDb, idMap);

  // Build ID mappings (no data inserted, just mapping old BIGINT → new UUID)
  await migrateRoles(oldDb, newDb, idMap);
  await migratePermissions(oldDb, newDb, idMap);

  // Migrate users (complex: composite type parsing)
  await migrateUsers(oldDb, newDb, idMap);

  // Migrate junction tables (depend on roles/permissions mappings)
  await migrateModelHasRoles(oldDb, newDb, idMap);
  await migrateModelHasPermissions(oldDb, newDb, idMap);
  await migrateRoleHasPermissions(oldDb, newDb, idMap);

  log("Phase 2", "=== Phase 2 Complete ===");
}
