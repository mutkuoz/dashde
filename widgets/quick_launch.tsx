import { Gtk } from "ags/gtk4";
import { execAsync } from "ags/process";
import type { WidgetConfig } from "../lib/config";
import type { WidgetModule } from "../lib/registry";
import { Panel } from "../lib/panel";
import { logger } from "../lib/logger";

const log = logger("quick_launch");

interface LaunchItem {
  icon: string;
  label: string;
  command: string;
}

interface QuickLaunchConfig extends WidgetConfig {
  columns?: number;
  items?: LaunchItem[];
  title?: string;
}

/**
 * Tiny embedded Lucide-style icon set. Keeps the bundle lean — no runtime SVG loading.
 * Each entry is a Pango markup string rendered as a unicode glyph from a
 * commonly-available font (Symbola / Noto). Users can also pass absolute icon paths
 * which render via Gtk.Image.new_from_file.
 */
const GLYPHS: Record<string, string> = {
  folder: "📁",
  globe: "🌐",
  terminal: "❯_",
  code: "</>",
  mail: "✉",
  settings: "⚙",
  music: "♪",
  camera: "◉",
  search: "🔍",
  file: "📄",
  calendar: "📆",
  heart: "❤",
  star: "★",
  bookmark: "❐",
  book: "📖",
  image: "🖼",
  link: "🔗",
  power: "⏻",
  lock: "⌬",
  moon: "☽",
  sun: "☼",
  cloud: "☁",
};

function renderIcon(icon: string): Gtk.Widget {
  if (icon.startsWith("/") || icon.includes("://")) {
    return <image file={icon} pixelSize={28} cssClasses={["tile__img"]} /> as Gtk.Widget;
  }
  const glyph = GLYPHS[icon] ?? "◇";
  return <label cssClasses={["tile__glyph"]} label={glyph} /> as Gtk.Widget;
}

export const quick_launch: WidgetModule = {
  displayName: "Quick Launch",
  render(cfgIn) {
    const cfg = cfgIn as QuickLaunchConfig;
    const items = cfg.items ?? [];
    const cols = Math.max(1, cfg.columns ?? 3);

    const grid = (
      <Gtk.Grid
        cssClasses={["tiles"]}
        columnHomogeneous
        rowHomogeneous={false}
        columnSpacing={12}
        rowSpacing={12}
      />
    ) as Gtk.Grid;

    items.forEach((item, idx) => {
      const tile = (
        <button
          cssClasses={["tile"]}
          tooltipText={item.command}
          onClicked={() => {
            execAsync(["bash", "-c", item.command]).catch((err) =>
              log.error(`launch "${item.command}" failed: ${(err as Error).message}`),
            );
          }}
        >
          <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["tile__inner"]} spacing={4}>
            {renderIcon(item.icon)}
            <label cssClasses={["tile__label"]} label={item.label} />
          </box>
        </button>
      ) as Gtk.Widget;

      const row = Math.floor(idx / cols);
      const col = idx % cols;
      grid.attach(tile, col, row, 1, 1);
    });

    if (items.length === 0) {
      return (
        <Panel title={cfg.title ?? "quick launch"}>
          <label cssClasses={["muted"]} label="no items configured" halign={Gtk.Align.START} />
        </Panel>
      );
    }

    return (
      <Panel title={cfg.title ?? "quick launch"}>
        <box cssClasses={["tiles-wrap"]}>{grid}</box>
      </Panel>
    );
  },
};
