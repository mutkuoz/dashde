import { Gtk } from "ags/gtk4";
import { bind } from "../lib/reactive";
import type { WidgetConfig } from "../lib/config";
import type { WidgetModule } from "../lib/registry";
import { Panel } from "../lib/panel";
import { StatRow, human } from "../lib/primitives";
import { wifi, bandwidth, ping, publicIp } from "../services/network";
import { tailscale } from "../services/tailscale";

type Slot = "wifi" | "speed" | "ping" | "tailscale" | "vpn_ip" | "public_ip";

interface ConnectionConfig extends WidgetConfig {
  show?: Slot[];
  title?: string;
}

const DEFAULT_SHOW: Slot[] = ["wifi", "speed", "ping", "tailscale", "public_ip"];

function WifiRow() {
  return (
    <StatRow
      label="wifi"
      value={bind(wifi).as((w) =>
        w.connected ? `${w.ssid} · ${Math.round(w.signal * 100)}%` : "disconnected",
      )}
    />
  );
}

function SpeedRow() {
  return (
    <StatRow
      label="speed"
      value={bind(bandwidth).as((b) => `↓ ${human(b.rx)}/s  ↑ ${human(b.tx)}/s`)}
    />
  );
}

function PingRow() {
  return (
    <StatRow
      label={bind(ping).as((p) => `ping ${p.host}`)}
      value={bind(ping).as((p) => (p.reachable ? `${p.ms.toFixed(0)} ms` : "unreachable"))}
    />
  );
}

function TailscaleRow() {
  return (
    <StatRow
      label="tailscale"
      value={bind(tailscale).as((t) => {
        if (!t.available) return "not installed";
        if (!t.online) return "offline";
        return `${t.self} · ${t.peers} peer${t.peers === 1 ? "" : "s"}`;
      })}
    />
  );
}

function VpnIpRow() {
  return (
    <StatRow
      label="vpn ip"
      value={bind(tailscale).as((t) => t.self || "—")}
    />
  );
}

function PublicIpRow() {
  return <StatRow label="public ip" value={bind(publicIp).as((ip) => ip || "…")} />;
}

const ROWS: Record<Slot, () => Gtk.Widget> = {
  wifi: () => WifiRow() as Gtk.Widget,
  speed: () => SpeedRow() as Gtk.Widget,
  ping: () => PingRow() as Gtk.Widget,
  tailscale: () => TailscaleRow() as Gtk.Widget,
  vpn_ip: () => VpnIpRow() as Gtk.Widget,
  public_ip: () => PublicIpRow() as Gtk.Widget,
};

export const connection: WidgetModule = {
  displayName: "Connection",
  render(cfgIn) {
    const cfg = cfgIn as ConnectionConfig;
    const slots = (cfg.show ?? DEFAULT_SHOW).filter((s) => s in ROWS);
    return (
      <Panel title={cfg.title ?? "connection"}>
        <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["stats"]}>
          {slots.map((s) => ROWS[s]())}
        </box>
      </Panel>
    );
  },
};
