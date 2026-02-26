import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log } from "../../util/logger.js";
import { batchInsert } from "../../util/batch.js";
import { parseTableItemType, parseStateType } from "../../parser/composite-type.js";

const PHASE = "Phase 4.2";

/**
 * Migrate broker_profiles table.
 *
 * Old: broker_profiles(id, user_id, city_id, location_city, location_county, location_state,
 *      has_signed_contract, role, calendar_url, description, bio_url, created_at, updated_at)
 * New (post-048): broker_profiles(id, user_id, city_id, location_city JSONB, location_county JSONB,
 *      location_state JSONB, has_signed_contract, role, bio_url,
 *      created_at, updated_at, deleted_at)
 *
 * Migration 048 dropped: brokerage_name, brokerage_office, brokerage_address
 * Migration 048 added: city_id, location_city (JSONB), location_county (JSONB),
 *   location_state (JSONB), has_signed_contract
 *
 * Composite types in old DB → JSONB in new DB.
 */
export async function migrateBrokerProfiles(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting broker_profiles migration...");

  const { rows } = await oldDb.query(
    `SELECT id, user_id, city_id,
            location_city::text as location_city,
            location_county::text as location_county,
            location_state::text as location_state,
            has_signed_contract, role, bio_url,
            created_at, updated_at
     FROM broker_profiles ORDER BY created_at NULLS LAST`
  );

  log(PHASE, `Found ${rows.length} broker_profiles in old DB`);
  if (rows.length === 0) return;

  const columns = [
    "id", "user_id", "city_id",
    "location_city", "location_county", "location_state",
    "has_signed_contract",
    "role", "bio_url",
    "created_at", "updated_at", "deleted_at",
  ];

  const values = rows.map((r) => {
    // Parse composite types → JSONB
    const cityItem = parseTableItemType(r.location_city);
    const countyItem = parseTableItemType(r.location_county);
    const stateItem = parseStateType(r.location_state);

    return [
      r.id,
      r.user_id,
      r.city_id ?? null,
      cityItem ? JSON.stringify(cityItem) : null,
      countyItem ? JSON.stringify(countyItem) : null,
      stateItem ? JSON.stringify(stateItem) : null,
      r.has_signed_contract ?? true,    // NOT NULL DEFAULT true
      r.role,
      r.bio_url,
      r.created_at ?? new Date(),
      r.updated_at ?? new Date(),
      null,         // deleted_at
    ];
  });

  const inserted = await batchInsert(newDb, "broker_profiles", columns, values, { phase: PHASE });
  log(PHASE, `Broker profiles migration complete: ${inserted} inserted out of ${rows.length}`);
}
