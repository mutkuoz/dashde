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
 * Shorthand → freedesktop symbolic icon-name map.
 *
 * Symbolic icons ship with the Adwaita icon theme (available on every GTK
 * install) and render as monochrome masks tintable via CSS `color`, so they
 * pick up the current theme's accent automatically. Users can also pass a
 * full icon name (e.g. "applications-development-symbolic") or an absolute
 * path/URI to an SVG or PNG.
 */
const ICONS: Record<string, string> = {
  folder: "folder-symbolic",
  globe: "web-browser-symbolic",
  web: "web-browser-symbolic",
  terminal: "utilities-terminal-symbolic",
  code: "applications-development-symbolic",
  editor: "text-editor-symbolic",
  mail: "mail-unread-symbolic",
  settings: "preferences-system-symbolic",
  prefs: "preferences-system-symbolic",
  music: "audio-x-generic-symbolic",
  camera: "camera-photo-symbolic",
  search: "system-search-symbolic",
  file: "text-x-generic-symbolic",
  calendar: "x-office-calendar-symbolic",
  heart: "emblem-favorite-symbolic",
  star: "starred-symbolic",
  bookmark: "user-bookmarks-symbolic",
  book: "accessories-dictionary-symbolic",
  image: "image-x-generic-symbolic",
  link: "insert-link-symbolic",
  power: "system-shutdown-symbolic",
  lock: "system-lock-screen-symbolic",
  moon: "weather-clear-night-symbolic",
  sun: "weather-clear-symbolic",
  cloud: "weather-overcast-symbolic",
  download: "folder-download-symbolic",
  video: "video-x-generic-symbolic",
  chat: "user-available-symbolic",
  home: "user-home-symbolic",
};

function renderIcon(icon: string): Gtk.Widget {
  if (icon.startsWith("/") || icon.includes("://")) {
    return <image file={icon} pixelSize={32} cssClasses={["tile__img"]} /> as Gtk.Widget;
  }
  const iconName = ICONS[icon] ?? icon; // allow users to pass any icon-name directly
  return <image iconName={iconName} pixelSize={32} cssClasses={["tile__icon"]} /> as Gtk.Widget;
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
