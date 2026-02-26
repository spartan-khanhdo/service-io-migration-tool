import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { migrateStates } from "./migrate-states.js";
import { migrateCounties } from "./migrate-counties.js";
import { migrateCities } from "./migrate-cities.js";
import { migrateCityCounties } from "./migrate-city-counties.js";
import { migrateIndustries } from "./migrate-industries.js";
import { migrateNaicsCodes } from "./migrate-naics-codes.js";

/**
 * Phase 1: Migrate all reference data tables.
 *
 * Execution order matters:
 * 1. states (no deps)
 * 2. counties (depends on states via state_id FK)
 * 3. cities (depends on states via state_id FK)
 * 4. city_counties (depends on cities + counties)
 * 5. industries (no deps)
 * 6. naics_codes (no deps)
 */
export async function runPhase1(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  idMap: IdMappingStore
): Promise<void> {
  log("Phase 1", "=== Starting Phase 1: Reference Data ===");

  // Truncate seeded reference data to avoid unique constraint conflicts (code, name, etc.)
  log("Phase 1", "Truncating seeded reference data in new DB...");
  await newDb.query("TRUNCATE city_counties, cities, counties, states, industries, naics_codes CASCADE");

  // Sequential: states → counties → cities → city_counties (dependency chain)
  await migrateStates(oldDb, newDb, idMap);
  await migrateCounties(oldDb, newDb, idMap);
  await migrateCities(oldDb, newDb, idMap);
  await migrateCityCounties(oldDb, newDb, idMap);

  // Independent: can run after states/counties/cities
  await migrateIndustries(oldDb, newDb, idMap);
  await migrateNaicsCodes(oldDb, newDb, idMap);

  log("Phase 1", "=== Phase 1 Complete ===");
}
