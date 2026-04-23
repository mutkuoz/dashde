import { Variable } from "../lib/reactive";
import { execAsync } from "ags/process";
import { commandExists } from "../lib/fs";
import { warnOnce } from "../lib/logger";

export interface GpuSnapshot {
  available: boolean;
  utilization: number; // 0..1
  memoryUsed: number; // bytes
  memoryTotal: number; // bytes
  temperature: number; // celsius
}

const EMPTY: GpuSnapshot = {
  available: false,
  utilization: 0,
  memoryUsed: 0,
  memoryTotal: 0,
  temperature: 0,
};

let hasNvidiaSmi: boolean | null = null;

async function sample(): Promise<GpuSnapshot> {
  if (hasNvidiaSmi === null) hasNvidiaSmi = commandExists("nvidia-smi");
  if (!hasNvidiaSmi) {
    warnOnce("gpu", "no-nvidia-smi", "nvidia-smi not found — gpu widget will render muted");
    return EMPTY;
  }
  try {
    const out = await execAsync([
      "nvidia-smi",
      "--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu",
      "--format=csv,noheader,nounits",
    ]);
    const firstLine = out.split("\n")[0];
    const parts = firstLine.split(",").map((s) => Number(s.trim()));
    if (parts.length < 4 || parts.some(Number.isNaN)) return EMPTY;
    const [util, memUsedMb, memTotalMb, temp] = parts;
    return {
      available: true,
      utilization: Math.max(0, Math.min(1, util / 100)),
      memoryUsed: memUsedMb * 1024 * 1024,
      memoryTotal: memTotalMb * 1024 * 1024,
      temperature: temp,
    };
  } catch {
    return EMPTY;
  }
}

export const gpu = Variable<GpuSnapshot>(EMPTY).poll(2000, sample);
