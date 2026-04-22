import { Variable } from "astal";
import { readText } from "../lib/fs";
import { warnOnce } from "../lib/logger";

let prev = { idle: 0, total: 0 };

function sample(): number {
  const raw = readText("/proc/stat");
  if (!raw) {
    warnOnce("cpu", "noproc", "/proc/stat unreadable — cpu usage disabled");
    return 0;
  }
  const line = raw.split("\n", 1)[0];
  if (!line || !line.startsWith("cpu ")) return 0;
  const ticks = line.split(/\s+/).slice(1, 9).map(Number);
  if (ticks.some((t) => Number.isNaN(t))) return 0;
  const idle = (ticks[3] ?? 0) + (ticks[4] ?? 0); // idle + iowait
  const total = ticks.reduce((a, b) => a + b, 0);
  const dIdle = idle - prev.idle;
  const dTotal = total - prev.total;
  prev = { idle, total };
  if (dTotal <= 0) return 0;
  return Math.max(0, Math.min(1, 1 - dIdle / dTotal));
}

export const cpuUsage = Variable(0).poll(1000, sample);

export const cpuLabel = cpuUsage((v) => `${Math.round(v * 100)}%`);
