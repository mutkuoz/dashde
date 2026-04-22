import { Gtk } from "astal/gtk4";
import { bind } from "astal";
import type { WidgetConfig } from "../lib/config";
import type { WidgetModule } from "../lib/registry";
import { Panel } from "../lib/panel";
import { Bar, human, percent } from "../lib/primitives";
import { cpuUsage } from "../services/cpu";
import { memory } from "../services/memory";
import { gpu } from "../services/gpu";
import { disk } from "../services/disk";
import { battery } from "../services/battery";

/** Each of these is the singular form of `machine`'s per-stat row, promoted to its own panel. */

export const cpuWidget: WidgetModule = {
  displayName: "CPU",
  render: (cfgIn) => {
    const cfg = cfgIn as WidgetConfig & { title?: string };
    return (
      <Panel title={cfg.title ?? "cpu"}>
        <Bar value={bind(cpuUsage)} right={bind(cpuUsage).as(percent)} tone="primary" />
      </Panel>
    );
  },
};

export const memoryWidget: WidgetModule = {
  displayName: "Memory",
  render: (cfgIn) => {
    const cfg = cfgIn as WidgetConfig & { title?: string };
    return (
      <Panel title={cfg.title ?? "memory"}>
        <Bar
          value={bind(memory).as((m) => m.usage)}
          right={bind(memory).as((m) =>
            m.total > 0 ? `${human(m.used)} / ${human(m.total)}` : "—",
          )}
          tone="primary"
        />
      </Panel>
    );
  },
};

export const gpuWidget: WidgetModule = {
  displayName: "GPU",
  render: (cfgIn) => {
    const cfg = cfgIn as WidgetConfig & { title?: string };
    return (
      <Panel title={cfg.title ?? "gpu"}>
        <Bar
          value={bind(gpu).as((g) => g.utilization)}
          right={bind(gpu).as((g) =>
            g.available
              ? `${percent(g.utilization)} · ${human(g.memoryUsed)} / ${human(g.memoryTotal)}`
              : "unavailable",
          )}
          tone="primary"
        />
      </Panel>
    );
  },
};

export const diskWidget: WidgetModule = {
  displayName: "Disk",
  render: (cfgIn) => {
    const cfg = cfgIn as WidgetConfig & { title?: string };
    return (
      <Panel title={cfg.title ?? "disk"}>
        <Bar
          value={bind(disk).as((d) => d.usage)}
          right={bind(disk).as((d) =>
            d.available ? `${human(d.used)} / ${human(d.total)}` : "unavailable",
          )}
          tone={bind(disk).as((d) => (d.usage > 0.85 ? "warn" : "primary"))}
        />
      </Panel>
    );
  },
};

export const batteryWidget: WidgetModule = {
  displayName: "Battery",
  render: (cfgIn) => {
    const cfg = cfgIn as WidgetConfig & { title?: string };
    return (
      <Panel title={cfg.title ?? "battery"}>
        <Bar
          value={bind(battery).as((b) => b.capacity)}
          right={bind(battery).as((b) => (b.available ? percent(b.capacity) : "no battery"))}
          tone={bind(battery).as((b) =>
            b.capacity < 0.2 && b.status === "Discharging" ? "warn" : "good",
          )}
        />
      </Panel>
    );
  },
};
