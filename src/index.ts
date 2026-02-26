import "dotenv/config";
import { createOldDbPool, createNewDbPool } from "./config/database.js";
import { ensureSshTunnel, closeSshTunnel } from "./config/ssh-tunnel.js";
import { IdMappingStore } from "./mapping/id-mapping-store.js";
import { log, logError } from "./util/logger.js";
import { runPhase0 } from "./phases/phase-0-validate.js";
import { runPhase1 } from "./phases/phase-1/index.js";
import { runPhase2 } from "./phases/phase-2/index.js";
import { runPhase3 } from "./phases/phase-3/index.js";
import { runPhase4 } from "./phases/phase-4/index.js";
import { runPhase5 } from "./phases/phase-5/index.js";
import { runPhase6 } from "./phases/phase-6/index.js";
import { runPhase7 } from "./phases/phase-7-verify.js";

function parseArgs(): { phase?: number; table?: string; dryRun: boolean } {
  const args = process.argv.slice(2);
  let phase: number | undefined;
  let table: string | undefined;
  let dryRun = process.env.DRY_RUN === "true";

  for (const arg of args) {
    if (arg.startsWith("--phase=")) {
      phase = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--table=")) {
      table = arg.split("=")[1];
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }

  return { phase, table, dryRun };
}

async function main(): Promise<void> {
  const { phase, table, dryRun } = parseArgs();

  log("Main", "=== Service IO Migration Tool ===");
  log("Main", `Phase: ${phase ?? "all"}, Table: ${table ?? "all"}, DryRun: ${dryRun}`);

  // Auto-start SSH tunnel if configured
  if (process.env.SSH_AUTO_TUNNEL !== "false") {
    const tunnelOk = await ensureSshTunnel();
    if (!tunnelOk) {
      logError("Main", "SSH tunnel failed. Aborting.");
      process.exit(1);
    }
  }

  const oldDb = createOldDbPool();
  const newDb = createNewDbPool();
  const idMap = new IdMappingStore();

  try {
    // Phase 0: Validation (always runs)
    if (phase === undefined || phase === 0) {
      const valid = await runPhase0(oldDb, newDb);
      if (!valid) {
        logError("Main", "Pre-flight validation failed. Aborting.");
        process.exit(1);
      }
      if (phase === 0) return;
    }

    // Phase 1: Reference data
    if (phase === undefined || phase === 1) {
      await runPhase1(oldDb, newDb, idMap);
      if (phase === 1) return;
    }

    // Phase 2: Core entities
    if (phase === undefined || phase === 2) {
      await runPhase2(oldDb, newDb, idMap);
      if (phase === 2) return;
    }

    // Phase 3: Business & related
    if (phase === undefined || phase === 3) {
      await runPhase3(oldDb, newDb, idMap);
      if (phase === 3) return;
    }

    // Phase 4: Supporting data
    if (phase === undefined || phase === 4) {
      await runPhase4(oldDb, newDb, idMap);
      if (phase === 4) return;
    }

    // Phase 5: Tokens & misc
    if (phase === undefined || phase === 5) {
      await runPhase5(oldDb, newDb, idMap);
      if (phase === 5) return;
    }

    // Phase 6: Remaining tables
    if (phase === undefined || phase === 6) {
      await runPhase6(oldDb, newDb, idMap);
      if (phase === 6) return;
    }

    // Phase 7: Verification
    if (phase === undefined || phase === 7) {
      const verified = await runPhase7(oldDb, newDb);
      if (!verified) {
        logError("Main", "Verification found mismatches. Check logs above.");
      }
    }

    log("Main", "=== Migration Complete ===");
    log("Main", `ID Mapping Summary: ${JSON.stringify(idMap.summary())}`);
  } catch (error) {
    logError("Main", "Migration failed", error);
    process.exit(1);
  } finally {
    await oldDb.end();
    await newDb.end();
    closeSshTunnel();
  }
}

main();
