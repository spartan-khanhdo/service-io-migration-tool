import { spawn, ChildProcess } from "child_process";
import net from "net";
import { log, logError } from "../util/logger.js";

const PHASE = "SSH";

export interface SshTunnelConfig {
  sshKeyPath: string;
  bastionHost: string;
  bastionUser: string;
  remoteDbHost: string;
  remoteDbPort: number;
  localPort: number;
}

function getSshTunnelConfig(): SshTunnelConfig {
  return {
    sshKeyPath: process.env.SSH_KEY_PATH || "../dev-mgmt-ec2",
    bastionHost: process.env.SSH_BASTION_HOST || "98.82.196.48",
    bastionUser: process.env.SSH_BASTION_USER || "ec2-user",
    remoteDbHost:
      process.env.SSH_REMOTE_DB_HOST ||
      "brokertool-dev-rds.cr8yquyy22mv.us-east-1.rds.amazonaws.com",
    remoteDbPort: parseInt(process.env.SSH_REMOTE_DB_PORT || "5432", 10),
    localPort: parseInt(process.env.OLD_DB_PORT || "5433", 10),
  };
}

async function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, "127.0.0.1");
  });
}

async function waitForPort(port: number, timeoutMs: number = 15000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

let tunnelProcess: ChildProcess | null = null;

/**
 * Ensures SSH tunnel is running. If port is already open (tunnel already running),
 * does nothing. Otherwise, spawns a new SSH tunnel process.
 *
 * Returns true if tunnel is ready, false if failed.
 */
export async function ensureSshTunnel(): Promise<boolean> {
  const config = getSshTunnelConfig();

  // Check if tunnel is already running
  if (await isPortOpen(config.localPort)) {
    log(PHASE, `Tunnel already active on port ${config.localPort}`);
    return true;
  }

  log(PHASE, `Starting SSH tunnel: localhost:${config.localPort} → ${config.remoteDbHost}:${config.remoteDbPort} via ${config.bastionUser}@${config.bastionHost}`);

  const args = [
    "-i", config.sshKeyPath,
    "-L", `${config.localPort}:${config.remoteDbHost}:${config.remoteDbPort}`,
    `${config.bastionUser}@${config.bastionHost}`,
    "-N",                         // No remote command
    "-o", "StrictHostKeyChecking=no",
    "-o", "ConnectTimeout=10",
    "-o", "ServerAliveInterval=30",
    "-o", "ServerAliveCountMax=3",
    "-o", "ExitOnForwardFailure=yes",
  ];

  tunnelProcess = spawn("ssh", args, {
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });

  tunnelProcess.stderr?.on("data", (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg) logError(PHASE, msg);
  });

  tunnelProcess.on("exit", (code) => {
    if (code !== null && code !== 0) {
      logError(PHASE, `SSH tunnel exited with code ${code}`);
    }
    tunnelProcess = null;
  });

  // Wait for tunnel to be ready
  const ready = await waitForPort(config.localPort);
  if (ready) {
    log(PHASE, `SSH tunnel ready on port ${config.localPort}`);
  } else {
    logError(PHASE, `SSH tunnel failed to start within timeout`);
    closeSshTunnel();
  }
  return ready;
}

/**
 * Closes the SSH tunnel if we started it.
 */
export function closeSshTunnel(): void {
  if (tunnelProcess) {
    log(PHASE, "Closing SSH tunnel...");
    tunnelProcess.kill("SIGTERM");
    tunnelProcess = null;
  }
}
