import { Gtk } from "ags/gtk4";
import { execAsync } from "ags/process";
import type { WidgetConfig } from "../lib/config";
import type { WidgetModule } from "../lib/registry";
import { Panel } from "../lib/panel";
import { logger } from "../lib/logger";
import { iconPath, hasIcon } from "../lib/icons";
import { openSettingsWindow } from "../lib/settings-window";

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

/** Build an icon widget from either a bundled alias, a system icon-name,
 *  or an absolute file/URI path. */
function renderIcon(icon: string): Gtk.Widget {
  if (icon.startsWith("/") || icon.includes("://")) {
    return <image file={icon} pixelSize={32} cssClasses={["tile__icon"]} /> as Gtk.Widget;
  }
  if (hasIcon(icon)) {
    return (
      <image file={iconPath(icon)} pixelSize={32} cssClasses={["tile__icon"]} />
    ) as Gtk.Widget;
  }
  // Fallback: treat as an icon-theme name
  return (
    <image iconName={icon} pixelSize={32} cssClasses={["tile__icon"]} />
  ) as Gtk.Widget;
}

/** Runs a command, with a small set of internal `dashde:…` protocol handlers
 *  for things like opening the settings window. */
function runCommand(command: string): void {
  if (command === "dashde:open-settings" || command === "dashde:settings") {
    openSettingsWindow();
    return;
  }
  execAsync(["bash", "-lc", command]).catch((err) =>
    log.error(`launch "${command}" failed: ${(err as Error).message}`),
  );
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
        rowHomogeneous
        columnSpacing={10}
        rowSpacing={10}
      />
    ) as Gtk.Grid;

    items.forEach((item, idx) => {
      const tile = (
        <button
          cssClasses={["tile"]}
          tooltipText={item.command}
          onClicked={() => runCommand(item.command)}
        >
          <box
            orientation={Gtk.Orientation.VERTICAL}
            cssClasses={["tile__inner"]}
            spacing={6}
            halign={Gtk.Align.CENTER}
            valign={Gtk.Align.CENTER}
          >
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
        <box cssClasses={["tiles-wrap"]} vexpand>
          {grid}
        </box>
      </Panel>
    );
  },
};
