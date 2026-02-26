import pg from "pg";
import { logProgress } from "./logger.js";

/**
 * Batch insert rows into a table with ON CONFLICT DO NOTHING for idempotency.
 *
 * @param pool - PostgreSQL connection pool
 * @param table - Target table name
 * @param columns - Column names
 * @param rows - Array of row values (each row is an array matching columns order)
 * @param options - Batch size and conflict handling
 */
export async function batchInsert(
  pool: pg.Pool,
  table: string,
  columns: string[],
  rows: unknown[][],
  options: {
    batchSize?: number;
    conflictTarget?: string;
    phase?: string;
  } = {}
): Promise<number> {
  const { batchSize = 500, conflictTarget = "id", phase = "?" } = options;

  if (rows.length === 0) return 0;

  let inserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    // Build parameterized query: INSERT INTO table (col1, col2) VALUES ($1, $2), ($3, $4) ...
    const placeholders: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const row of batch) {
      const rowPlaceholders: string[] = [];
      for (const val of row) {
        rowPlaceholders.push(`$${paramIndex++}`);
        values.push(val);
      }
      placeholders.push(`(${rowPlaceholders.join(", ")})`);
    }

    const columnList = columns.map((c) => `"${c}"`).join(", ");
    const sql = `INSERT INTO "${table}" (${columnList}) VALUES ${placeholders.join(", ")} ON CONFLICT ("${conflictTarget}") DO NOTHING`;

    const result = await pool.query(sql, values);
    inserted += result.rowCount ?? 0;

    logProgress(phase, table, Math.min(i + batchSize, rows.length), rows.length);
  }

  return inserted;
}

/**
 * Batch insert for composite primary keys (e.g., model_has_roles).
 */
export async function batchInsertComposite(
  pool: pg.Pool,
  table: string,
  columns: string[],
  rows: unknown[][],
  conflictColumns: string[],
  options: {
    batchSize?: number;
    phase?: string;
  } = {}
): Promise<number> {
  const { batchSize = 500, phase = "?" } = options;

  if (rows.length === 0) return 0;

  let inserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    const placeholders: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const row of batch) {
      const rowPlaceholders: string[] = [];
      for (const val of row) {
        rowPlaceholders.push(`$${paramIndex++}`);
        values.push(val);
      }
      placeholders.push(`(${rowPlaceholders.join(", ")})`);
    }

    const columnList = columns.map((c) => `"${c}"`).join(", ");
    const conflictList = conflictColumns.map((c) => `"${c}"`).join(", ");
    const sql = `INSERT INTO "${table}" (${columnList}) VALUES ${placeholders.join(", ")} ON CONFLICT (${conflictList}) DO NOTHING`;

    const result = await pool.query(sql, values);
    inserted += result.rowCount ?? 0;

    logProgress(phase, table, Math.min(i + batchSize, rows.length), rows.length);
  }

  return inserted;
}
