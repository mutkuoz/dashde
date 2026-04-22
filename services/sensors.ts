import { Variable } from "astal";
import { execAsync } from "astal/process";
import { commandExists } from "../lib/fs";
import { warnOnce } from "../lib/logger";

export interface SensorReading {
  chip: string;
  label: string;
  value: number;
  unit: "°C" | "RPM" | "V" | "";
}

let hasSensors: boolean | null = null;

async function sample(): Promise<SensorReading[]> {
  if (hasSensors === null) hasSensors = commandExists("sensors");
  if (!hasSensors) {
    warnOnce("sensors", "missing", "`sensors` command not found — install lm_sensors");
    return [];
  }
  try {
    const raw = await execAsync(["sensors", "-j"]);
    const json = JSON.parse(raw) as Record<string, Record<string, Record<string, number>>>;
    const readings: SensorReading[] = [];
    for (const chip of Object.keys(json)) {
      const chipData = json[chip];
      if (!chipData || typeof chipData !== "object") continue;
      for (const label of Object.keys(chipData)) {
        const sensor = chipData[label];
        if (!sensor || typeof sensor !== "object") continue;
        for (const key of Object.keys(sensor)) {
          const v = sensor[key];
          if (typeof v !== "number") continue;
          if (key.endsWith("_input")) {
            let unit: SensorReading["unit"] = "";
            if (key.startsWith("temp")) unit = "°C";
            else if (key.startsWith("fan")) unit = "RPM";
            else if (key.startsWith("in")) unit = "V";
            readings.push({ chip, label, value: v, unit });
          }
        }
      }
    }
    return readings;
  } catch (err) {
    warnOnce("sensors", "parse-fail", `sensors parse failed: ${(err as Error).message}`);
    return [];
  }
}

export const sensors = Variable<SensorReading[]>([]).poll(5000, sample);
