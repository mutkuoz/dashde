import { Variable } from "../lib/reactive";
import { execAsync } from "ags/process";
import { commandExists } from "../lib/fs";
import { warnOnce } from "../lib/logger";

export interface TailscaleSnapshot {
  available: boolean;
  online: boolean;
  self: string; // IP
  hostname: string;
  peers: number;
}

const EMPTY: TailscaleSnapshot = {
  available: false,
  online: false,
  self: "",
  hostname: "",
  peers: 0,
};

let hasTailscale: boolean | null = null;

async function sample(): Promise<TailscaleSnapshot> {
  if (hasTailscale === null) hasTailscale = commandExists("tailscale");
  if (!hasTailscale) {
    warnOnce("tailscale", "missing", "tailscale not installed — widget muted");
    return EMPTY;
  }
  try {
    const out = await execAsync(["tailscale", "status", "--json"]);
    const j = JSON.parse(out);
    const self = j.Self || {};
    const peers = j.Peer ? Object.keys(j.Peer).length : 0;
    return {
      available: true,
      online: j.BackendState === "Running",
      self: self.TailscaleIPs?.[0] ?? "",
      hostname: self.HostName ?? "",
      peers,
    };
  } catch {
    return { ...EMPTY, available: true };
  }
}

export const tailscale = Variable<TailscaleSnapshot>(EMPTY).poll(15_000, sample);
