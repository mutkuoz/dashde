import { Variable } from "../lib/reactive";
import { readText, exists } from "../lib/fs";
import { warnOnce } from "../lib/logger";

export type BatteryStatus = "Charging" | "Discharging" | "Full" | "Not charging" | "Unknown";

export interface BatterySnapshot {
  available: boolean;
  capacity: number; // 0..1
  status: BatteryStatus;
  /** Seconds to empty/full when discharging/charging, or null when idle or unknown. */
  timeRemaining: number | null;
}

const EMPTY: BatterySnapshot = {
  available: false,
  capacity: 0,
  status: "Unknown",
  timeRemaining: null,
};

function detect(): string | null {
  for (const name of ["BAT0", "BAT1", "BAT2"]) {
    if (exists(`/sys/class/power_supply/${name}/capacity`)) return name;
  }
  return null;
}

let path: string | null = null;
let detected = false;

function sample(): BatterySnapshot {
  if (!detected) {
    path = detect();
    detected = true;
    if (!path) warnOnce("battery", "none", "no battery found — widget will render muted");
  }
  if (!path) return EMPTY;
  const base = `/sys/class/power_supply/${path}`;
  const capRaw = readText(`${base}/capacity`);
  const statusRaw = readText(`${base}/status`);
  if (!capRaw || !statusRaw) return EMPTY;

  const capacity = Math.max(0, Math.min(1, Number(capRaw.trim()) / 100));
  const status = statusRaw.trim() as BatteryStatus;

  // Optional: time remaining from energy_now/power_now (Wh and W). Not all kernels expose it.
  let timeRemaining: number | null = null;
  const energyRaw = readText(`${base}/energy_now`);
  const powerRaw = readText(`${base}/power_now`);
  const energyFullRaw = readText(`${base}/energy_full`);
  if (energyRaw && powerRaw) {
    const energy = Number(energyRaw) / 1_000_000; // µWh -> Wh
    const energyFull = energyFullRaw ? Number(energyFullRaw) / 1_000_000 : 0;
    const power = Number(powerRaw) / 1_000_000; // µW -> W
    if (power > 0) {
      if (status === "Discharging") timeRemaining = (energy / power) * 3600;
      else if (status === "Charging" && energyFull > 0)
        timeRemaining = ((energyFull - energy) / power) * 3600;
    }
  }

  return { available: true, capacity, status, timeRemaining };
}

export const battery = Variable<BatterySnapshot>(EMPTY).poll(10_000, sample);
