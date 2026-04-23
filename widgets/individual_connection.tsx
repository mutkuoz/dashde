import { Gtk } from "ags/gtk4";
import { bind } from "../lib/reactive";
import type { WidgetConfig } from "../lib/config";
import type { WidgetModule } from "../lib/registry";
import { Panel } from "../lib/panel";
import { StatRow, human } from "../lib/primitives";
import { wifi, bandwidth, ping, publicIp } from "../services/network";
import { tailscale } from "../services/tailscale";

export const wifiWidget: WidgetModule = {
  displayName: "Wi-Fi",
  render: (cfg) => (
    <Panel title={(cfg as { title?: string }).title ?? "wifi"}>
      <StatRow
        label="network"
        value={bind(wifi).as((w) =>
          w.connected ? `${w.ssid} · ${Math.round(w.signal * 100)}%` : "disconnected",
        )}
      />
    </Panel>
  ),
};

export const bandwidthWidget: WidgetModule = {
  displayName: "Bandwidth",
  render: (cfg) => (
    <Panel title={(cfg as { title?: string }).title ?? "bandwidth"}>
      <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["stats"]}>
        <StatRow label="down" value={bind(bandwidth).as((b) => `${human(b.rx)}/s`)} />
        <StatRow label="up" value={bind(bandwidth).as((b) => `${human(b.tx)}/s`)} />
      </box>
    </Panel>
  ),
};

export const pingWidget: WidgetModule = {
  displayName: "Ping",
  render: (cfg) => (
    <Panel title={(cfg as { title?: string }).title ?? "ping"}>
      <StatRow
        label={bind(ping).as((p) => p.host)}
        value={bind(ping).as((p) => (p.reachable ? `${p.ms.toFixed(0)} ms` : "unreachable"))}
      />
    </Panel>
  ),
};

export const tailscaleWidget: WidgetModule = {
  displayName: "Tailscale",
  render: (cfg) => (
    <Panel title={(cfg as { title?: string }).title ?? "tailscale"}>
      <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["stats"]}>
        <StatRow
          label="state"
          value={bind(tailscale).as((t) =>
            !t.available ? "not installed" : t.online ? "online" : "offline",
          )}
        />
        <StatRow label="ip" value={bind(tailscale).as((t) => t.self || "—")} />
        <StatRow label="peers" value={bind(tailscale).as((t) => String(t.peers))} />
      </box>
    </Panel>
  ),
};

export const publicIpWidget: WidgetModule = {
  displayName: "Public IP",
  render: (cfg) => (
    <Panel title={(cfg as { title?: string }).title ?? "public ip"}>
      <StatRow label="ip" value={bind(publicIp).as((ip) => ip || "…")} />
    </Panel>
  ),
};
