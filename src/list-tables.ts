import "dotenv/config";
import { createOldDbPool, createNewDbPool } from "./config/database.js";

async function main() {
  const oldDb = createOldDbPool();
  const newDb = createNewDbPool();

  const oldTables = await oldDb.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
  );
  console.log("=== OLD DB TABLES ===");
  oldTables.rows.forEach((r) => console.log(r.table_name));

  const newTables = await newDb.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
  );
  console.log("\n=== NEW DB TABLES ===");
  newTables.rows.forEach((r) => console.log(r.table_name));

  await oldDb.end();
  await newDb.end();
}

main();
