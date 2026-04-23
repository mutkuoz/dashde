import { Variable } from "../lib/reactive";
import { execAsync } from "ags/process";
import { commandExists } from "../lib/fs";

export interface MediaSnapshot {
  available: boolean;
  player: string;
  title: string;
  artist: string;
  album: string;
  status: "Playing" | "Paused" | "Stopped";
}

const EMPTY: MediaSnapshot = {
  available: false,
  player: "",
  title: "",
  artist: "",
  album: "",
  status: "Stopped",
};

let hasPlayerctl: boolean | null = null;

async function sample(): Promise<MediaSnapshot> {
  if (hasPlayerctl === null) hasPlayerctl = commandExists("playerctl");
  if (!hasPlayerctl) return EMPTY;
  try {
    const out = await execAsync(["playerctl", "metadata", "--format", "{{json(.)}}"]);
    const j = JSON.parse(out);
    return {
      available: true,
      player: j["mpris:playerctlName"] ?? "",
      title: j["xesam:title"] ?? "",
      artist: Array.isArray(j["xesam:artist"]) ? j["xesam:artist"].join(", ") : (j["xesam:artist"] ?? ""),
      album: j["xesam:album"] ?? "",
      status: (j["mpris:status"] ?? "Stopped") as MediaSnapshot["status"],
    };
  } catch {
    return EMPTY;
  }
}

export const media = Variable<MediaSnapshot>(EMPTY).poll(2000, sample);

export async function playerctl(...args: string[]): Promise<void> {
  try {
    await execAsync(["playerctl", ...args]);
  } catch {
    // no active player, ignore
  }
}
