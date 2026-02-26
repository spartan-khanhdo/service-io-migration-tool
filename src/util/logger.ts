const startTime = Date.now();

function elapsed(): string {
  const ms = Date.now() - startTime;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function log(phase: string, message: string): void {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.log(`[${timestamp}] [${elapsed()}] [${phase}] ${message}`);
}

export function logError(phase: string, message: string, error?: unknown): void {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.error(`[${timestamp}] [${elapsed()}] [${phase}] ERROR: ${message}`);
  if (error instanceof Error) {
    console.error(`  ${error.message}`);
    if (error.stack) {
      console.error(`  ${error.stack.split("\n").slice(1, 3).join("\n  ")}`);
    }
  }
}

export function logProgress(phase: string, table: string, current: number, total: number): void {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  log(phase, `Migrating ${table}: ${current}/${total} (${pct}%)`);
}
