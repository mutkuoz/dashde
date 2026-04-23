import { Gtk } from "ags/gtk4";
import { bind } from "../lib/reactive";
import type { WidgetConfig } from "../lib/config";
import type { WidgetModule } from "../lib/registry";
import { Panel } from "../lib/panel";
import { Bar, StatRow, human, percent } from "../lib/primitives";
import { cpuUsage } from "../services/cpu";
import { memory } from "../services/memory";
import { gpu } from "../services/gpu";
import { disk } from "../services/disk";
import { battery } from "../services/battery";

type Stat = "cpu" | "memory" | "gpu" | "disk" | "battery";

interface MachineConfig extends WidgetConfig {
  show?: Stat[];
  title?: string;
  /**
   * Dense single-line rows (no bar). Good for sidebars or small cells.
   * Defaults to false — bars render full-width.
   */
  compact?: boolean;
}

const DEFAULT_STATS: Stat[] = ["cpu", "memory", "gpu", "disk", "battery"];

function toneForUsage(v: number): "primary" | "warn" {
  return v > 0.85 ? "warn" : "primary";
}

// ─── full bar rows ──────────────────────────────────────────────────

function CpuBar() {
  return <Bar label="cpu" value={bind(cpuUsage)} right={bind(cpuUsage).as(percent)} tone="primary" />;
}

function MemoryBar() {
  return (
    <Bar
      label="memory"
      value={bind(memory).as((m) => m.usage)}
      right={bind(memory).as((m) => (m.total > 0 ? `${human(m.used)} / ${human(m.total)}` : "—"))}
      tone="primary"
    />
  );
}

function GpuBar() {
  return (
    <Bar
      label="gpu"
      value={bind(gpu).as((g) => (g.available ? g.utilization : 0))}
      right={bind(gpu).as((g) =>
        g.available
          ? `${percent(g.utilization)} · ${human(g.memoryUsed)} / ${human(g.memoryTotal)}`
          : "unavailable",
      )}
      tone="primary"
    />
  );
}

function DiskBar() {
  return (
    <Bar
      label="disk /"
      value={bind(disk).as((d) => (d.available ? d.usage : 0))}
      right={bind(disk).as((d) => (d.available ? `${human(d.used)} / ${human(d.total)}` : "unavailable"))}
      tone={bind(disk).as((d) => toneForUsage(d.usage))}
    />
  );
}

function BatteryBar() {
  return (
    <Bar
      label={bind(battery).as((b) => (b.available ? `battery · ${b.status.toLowerCase()}` : "battery"))}
      value={bind(battery).as((b) => (b.available ? b.capacity : 0))}
      right={bind(battery).as((b) => {
        if (!b.available) return "unavailable";
        const pct = percent(b.capacity);
        if (b.timeRemaining !== null && b.timeRemaining > 60) {
          const m = Math.round(b.timeRemaining / 60);
          const h = Math.floor(m / 60);
          const mm = m % 60;
          return `${pct} · ${h > 0 ? `${h}h ${mm}m` : `${m}m`}`;
        }
        return pct;
      })}
      tone={bind(battery).as((b) => (b.capacity < 0.2 && b.status === "Discharging" ? "warn" : "good"))}
    />
  );
}

// ─── compact rows (no bar) ──────────────────────────────────────────

function CpuRow() {
  return <StatRow label="cpu" value={bind(cpuUsage).as(percent)} />;
}

function MemoryRow() {
  return (
    <StatRow
      label="memory"
      value={bind(memory).as((m) => (m.total > 0 ? `${human(m.used)} / ${human(m.total)}` : "—"))}
    />
  );
}

function GpuRow() {
  return (
    <StatRow
      label="gpu"
      value={bind(gpu).as((g) =>
        g.available ? `${percent(g.utilization)} · ${human(g.memoryUsed)}` : "unavailable",
      )}
    />
  );
}

function DiskRow() {
  return (
    <StatRow
      label="disk /"
      value={bind(disk).as((d) => (d.available ? `${human(d.used)} / ${human(d.total)}` : "unavailable"))}
    />
  );
}

function BatteryRow() {
  return (
    <StatRow
      label="battery"
      value={bind(battery).as((b) => {
        if (!b.available) return "no battery";
        return `${percent(b.capacity)} · ${b.status.toLowerCase()}`;
      })}
    />
  );
}

const BAR_ROWS: Record<Stat, () => Gtk.Widget> = {
  cpu: () => CpuBar() as Gtk.Widget,
  memory: () => MemoryBar() as Gtk.Widget,
  gpu: () => GpuBar() as Gtk.Widget,
  disk: () => DiskBar() as Gtk.Widget,
  battery: () => BatteryBar() as Gtk.Widget,
};

const COMPACT_ROWS: Record<Stat, () => Gtk.Widget> = {
  cpu: () => CpuRow() as Gtk.Widget,
  memory: () => MemoryRow() as Gtk.Widget,
  gpu: () => GpuRow() as Gtk.Widget,
  disk: () => DiskRow() as Gtk.Widget,
  battery: () => BatteryRow() as Gtk.Widget,
};

export const machine: WidgetModule = {
  displayName: "Machine",
  render(cfgIn) {
    const cfg = cfgIn as MachineConfig;
    const stats = (cfg.show ?? DEFAULT_STATS).filter((s) => s in BAR_ROWS);
    const rows = cfg.compact ? COMPACT_ROWS : BAR_ROWS;
    return (
      <Panel title={cfg.title ?? "machine"}>
        <box
          orientation={Gtk.Orientation.VERTICAL}
          cssClasses={["stats"]}
          spacing={cfg.compact ? 0 : 4}
        >
          {stats.map((s) => rows[s]())}
        </box>
      </Panel>
    );
  },
};
