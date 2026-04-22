import { Variable } from "astal";
import { execAsync } from "astal/process";
import { readText, commandExists } from "../lib/fs";
import { warnOnce } from "../lib/logger";

// ─── wifi ───────────────────────────────────────────────────────────

export interface WifiSnapshot {
  connected: boolean;
  ssid: string;
  signal: number; // 0..1
}

const WIFI_EMPTY: WifiSnapshot = { connected: false, ssid: "", signal: 0 };
let hasNmcli: boolean | null = null;

async function sampleWifi(): Promise<WifiSnapshot> {
  if (hasNmcli === null) hasNmcli = commandExists("nmcli");
  if (!hasNmcli) return WIFI_EMPTY;
  try {
    const out = await execAsync(["nmcli", "-t", "-f", "active,ssid,signal", "dev", "wifi"]);
    for (const line of out.split("\n")) {
      const parts = line.split(":");
      if (parts[0] === "yes") {
        return {
          connected: true,
          ssid: parts[1] ?? "",
          signal: Math.max(0, Math.min(1, Number(parts[2] ?? 0) / 100)),
        };
      }
    }
    return WIFI_EMPTY;
  } catch {
    return WIFI_EMPTY;
  }
}

export const wifi = Variable<WifiSnapshot>(WIFI_EMPTY).poll(10_000, sampleWifi);

// ─── bandwidth ──────────────────────────────────────────────────────

export interface BandwidthSnapshot {
  rx: number; // bytes/s
  tx: number; // bytes/s
  history: number[]; // last N rx+tx samples for sparkline
}

const BW_EMPTY: BandwidthSnapshot = { rx: 0, tx: 0, history: [] };
const HISTORY_LEN = 60;

let prevBytes: { rx: number; tx: number; ts: number } | null = null;
const history: number[] = [];

function readIfaceTotals(): { rx: number; tx: number } | null {
  const raw = readText("/proc/net/dev");
  if (!raw) return null;
  let rx = 0;
  let tx = 0;
  for (const line of raw.split("\n").slice(2)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 17) continue;
    const name = parts[0].replace(":", "");
    if (name === "lo") continue;
    rx += Number(parts[1]);
    tx += Number(parts[9]);
  }
  return { rx, tx };
}

function sampleBandwidth(): BandwidthSnapshot {
  const now = Date.now();
  const cur = readIfaceTotals();
  if (!cur) return BW_EMPTY;
  if (!prevBytes) {
    prevBytes = { ...cur, ts: now };
    return BW_EMPTY;
  }
  const dt = (now - prevBytes.ts) / 1000;
  const rx = dt > 0 ? Math.max(0, (cur.rx - prevBytes.rx) / dt) : 0;
  const tx = dt > 0 ? Math.max(0, (cur.tx - prevBytes.tx) / dt) : 0;
  prevBytes = { ...cur, ts: now };

  history.push(rx + tx);
  if (history.length > HISTORY_LEN) history.shift();

  return { rx, tx, history: [...history] };
}

export const bandwidth = Variable<BandwidthSnapshot>(BW_EMPTY).poll(1000, sampleBandwidth);

// ─── ping ───────────────────────────────────────────────────────────

export interface PingSnapshot {
  host: string;
  reachable: boolean;
  ms: number;
}

const PING_HOST = "1.1.1.1";

async function samplePing(): Promise<PingSnapshot> {
  try {
    const out = await execAsync(["ping", "-c1", "-W1", PING_HOST]);
    const m = /time=([\d.]+)\s*ms/.exec(out);
    if (!m) return { host: PING_HOST, reachable: false, ms: 0 };
    return { host: PING_HOST, reachable: true, ms: Number(m[1]) };
  } catch {
    return { host: PING_HOST, reachable: false, ms: 0 };
  }
}

export const ping = Variable<PingSnapshot>({ host: PING_HOST, reachable: false, ms: 0 }).poll(
  30_000,
  samplePing,
);

// ─── public ip ──────────────────────────────────────────────────────

async function samplePublicIp(): Promise<string> {
  try {
    const out = await execAsync(["curl", "-s", "--max-time", "5", "https://ipinfo.io/ip"]);
    return out.trim() || "unavailable";
  } catch {
    return "unavailable";
  }
}

export const publicIp = Variable<string>("").poll(10 * 60_000, samplePublicIp);
