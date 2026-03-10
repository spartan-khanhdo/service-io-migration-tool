import pg from "pg";

export interface DbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

function getOldDbConfig(): DbConfig {
  return {
    host: process.env.OLD_DB_HOST || "localhost",
    port: parseInt(process.env.OLD_DB_PORT || "5432", 10),
    database: process.env.OLD_DB_NAME || "marketplace",
    user: process.env.OLD_DB_USER || "loanbud",
    password: process.env.OLD_DB_PASSWORD || "loanbud",
  };
}

function getNewDbConfig(): DbConfig {
  return {
    host: process.env.NEW_DB_HOST || "localhost",
    port: parseInt(process.env.NEW_DB_PORT || "5432", 10),
    database: process.env.NEW_DB_NAME || "local",
    user: process.env.NEW_DB_USER || "local",
    password: process.env.NEW_DB_PASSWORD || "local",
  };
}

export function createOldDbPool(): pg.Pool {
  const config = getOldDbConfig();
  const useSSL = process.env.OLD_DB_SSL !== "false";
  return new pg.Pool({
    ...config,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
    // Enforce read-only at PostgreSQL session level — any INSERT/UPDATE/DELETE will be
    // rejected by the server even if code accidentally attempts a write.
    options: "-c default_transaction_read_only=on",
  });
}

export function createNewDbPool(): pg.Pool {
  const config = getNewDbConfig();
  const useSSL = process.env.NEW_DB_SSL !== "false";
  return new pg.Pool({
    ...config,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
  });
}
