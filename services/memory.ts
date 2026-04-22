import { Variable } from "astal";
import { readText } from "../lib/fs";

export interface MemorySnapshot {
  total: number; // bytes
  available: number; // bytes
  used: number; // bytes
  usage: number; // 0..1
}

function sample(): MemorySnapshot {
  const raw = readText("/proc/meminfo");
  if (!raw) return { total: 0, available: 0, used: 0, usage: 0 };
  const kv = new Map<string, number>();
  for (const line of raw.split("\n")) {
    const m = /^(\w+):\s+(\d+)\s*(\w+)?/.exec(line);
    if (!m) continue;
    const [, key, valStr, unit] = m;
    const n = Number(valStr) * (unit === "kB" ? 1024 : 1);
    kv.set(key, n);
  }
  const total = kv.get("MemTotal") ?? 0;
  const available = kv.get("MemAvailable") ?? kv.get("MemFree") ?? 0;
  const used = Math.max(0, total - available);
  const usage = total > 0 ? used / total : 0;
  return { total, available, used, usage };
}

export const memory = Variable<MemorySnapshot>({ total: 0, available: 0, used: 0, usage: 0 }).poll(
  1000,
  sample,
);
