import pg from "pg";
import { IdMappingStore } from "../../mapping/id-mapping-store.js";
import { log, logProgress } from "../../util/logger.js";
import { rewriteS3Url, isS3RewriteEnabled } from "../../util/s3-url-rewriter.js";

const PHASE = "Phase 2.4";
const BATCH_SIZE = 500;

/**
 * Migrate users table.
 *
 * Key transformations:
 * - bio_url, communication_consent_at → direct from old DB
 * - two_factor_method='none' → NULL
 * - status normalized to lowercase
 * - source default "manual"
 * - NULL timestamps → fallback
 * - password: NOT NULL → NULLABLE (compatible)
 * - two_factor_code, two_factor_expires_at → DROP (removed in new DB)
 * - Removed (042): address_2, city, state_code, zipcode, country, state_id, city_id, county_id
 * - Added (042): bio_url, communication_consent_at, email_name_search_vector (GENERATED)
 *
 * UUID preserved.
 */
export async function migrateUsers(
  oldDb: pg.Pool,
  newDb: pg.Pool,
  _idMap: IdMappingStore
): Promise<void> {
  log(PHASE, "Starting users migration...");
  if (isS3RewriteEnabled()) {
    log(PHASE, "S3 URL rewriting enabled for profile_photo_path");
  }

  // Count total first
  const countResult = await oldDb.query(`SELECT COUNT(*) as count FROM users`);
  const total = parseInt(countResult.rows[0].count, 10);
  log(PHASE, `Found ${total} users in old DB`);

  if (total === 0) return;

  // Process in batches using cursor-style pagination
  let offset = 0;
  let totalInserted = 0;

  while (offset < total) {
    const { rows } = await oldDb.query(
      `SELECT
        id, email, password, first_name, last_name, phone,
        phone_extension, linkedin, profile_photo_path, address,
        bio_url, communication_consent_at,
        is_walkthrough_finished, lang, password_change_at,
        email_verified_at, status, pending_invite,
        two_factor_method, two_factor_secret,
        two_factor_recovery_codes, two_factor_set_at,
        last_activity, remember_token,
        organization_id, source,
        created_by, modified_by, deleted_by,
        created_at, updated_at, deleted_at
      FROM users
      ORDER BY created_at
      LIMIT $1 OFFSET $2`,
      [BATCH_SIZE, offset]
    );

    if (rows.length === 0) break;

    const columns = [
      "id", "email", "password", "first_name", "last_name", "phone",
      "phone_extension", "linkedin", "profile_photo_path",
      "address", "bio_url", "communication_consent_at",
      "is_walkthrough_finished", "lang", "password_change_at",
      "email_verified_at", "status", "pending_invite",
      "two_factor_method", "two_factor_secret",
      "two_factor_recovery_codes", "two_factor_set_at",
      "last_activity", "remember_token",
      "organization_id", "source",
      "created_by", "modified_by", "deleted_by",
      "created_at", "updated_at", "deleted_at",
    ];

    const values = rows.map((r) => {
      // Normalize two_factor_method: 'none' → NULL
      const twoFactorMethod = r.two_factor_method === "none" ? null : r.two_factor_method;

      // Normalize status to lowercase
      const status = r.status ? r.status.toLowerCase() : "pending";

      return [
        r.id,
        r.email,
        r.password,
        r.first_name,
        r.last_name,
        r.phone,
        r.phone_extension ?? null,
        r.linkedin,
        rewriteS3Url(r.profile_photo_path),
        r.address,
        r.bio_url ?? null,
        r.communication_consent_at ?? null,
        r.is_walkthrough_finished ?? false,
        r.lang ?? "en",
        r.password_change_at,
        r.email_verified_at,
        status,
        r.pending_invite ?? false,
        twoFactorMethod,
        r.two_factor_secret,
        // pg auto-parses json columns → PHP stores codes as integers [163184,590775], Kotlin expects strings ["163184","590775"]
        // Must map each code to String before JSON.stringify to match Kotlin's Array<String> deserialization
        r.two_factor_recovery_codes != null ? JSON.stringify(r.two_factor_recovery_codes.map(String)) : null,
        r.two_factor_set_at,
        r.last_activity,
        r.remember_token,
        r.organization_id ?? null,
        r.source ?? "manual",
        r.created_by,
        r.modified_by,
        r.deleted_by,
        r.created_at ?? new Date(),
        r.updated_at ?? new Date(),
        r.deleted_at,
      ];
    });

    // Build parameterized INSERT
    const placeholders: string[] = [];
    const flatValues: unknown[] = [];
    let paramIndex = 1;

    for (const row of values) {
      const rowPlaceholders: string[] = [];
      for (const val of row) {
        rowPlaceholders.push(`$${paramIndex++}`);
        flatValues.push(val);
      }
      placeholders.push(`(${rowPlaceholders.join(", ")})`);
    }

    const columnList = columns.map((c) => `"${c}"`).join(", ");
    // ON CONFLICT DO NOTHING (no column specified) handles ALL unique constraints:
    // - id (primary key) — re-running migration
    // - idx_users_email (email WHERE deleted_at IS NULL) — pre-existing data
    const sql = `INSERT INTO "users" (${columnList}) VALUES ${placeholders.join(", ")} ON CONFLICT DO NOTHING`;

    const result = await newDb.query(sql, flatValues);
    totalInserted += result.rowCount ?? 0;

    offset += rows.length;
    logProgress(PHASE, "users", offset, total);
  }

  log(PHASE, `Users migration complete: ${totalInserted} inserted out of ${total}`);
}
