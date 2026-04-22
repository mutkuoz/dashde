import { Variable } from "astal";
import { execAsync } from "astal/process";
import { warnOnce } from "../lib/logger";

export interface DiskSnapshot {
  available: boolean;
  used: number;
  total: number;
  usage: number; // 0..1
}

const EMPTY: DiskSnapshot = { available: false, used: 0, total: 0, usage: 0 };

async function sample(): Promise<DiskSnapshot> {
  try {
    const out = await execAsync(["df", "-B1", "--output=used,size", "/"]);
    const parts = out.trim().split("\n")[1]?.trim().split(/\s+/);
    if (!parts || parts.length < 2) return EMPTY;
    const used = Number(parts[0]);
    const total = Number(parts[1]);
    if (Number.isNaN(used) || Number.isNaN(total) || total === 0) return EMPTY;
    return { available: true, used, total, usage: used / total };
  } catch (err) {
    warnOnce("disk", "df-fail", `df failed: ${(err as Error).message}`);
    return EMPTY;
  }
}

export const disk = Variable<DiskSnapshot>(EMPTY).poll(30_000, sample);
