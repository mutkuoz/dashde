import { App, Astal, Gdk, Gtk } from "astal/gtk4";
import { bind } from "astal";
import { registerBuiltins } from "./widgets/index";
import { config, initConfig, type DashboardConfig } from "./lib/config";
import { applyTheme } from "./lib/theme";
import { renderLayout } from "./lib/layout";
import { logger } from "./lib/logger";
import luxuryJournal from "./themes/luxury-journal.scss";

const log = logger("app");

type LayerName = "background" | "bottom" | "top" | "overlay";
type AnchorName = "top" | "bottom" | "left" | "right";

const LAYERS: Record<LayerName, Astal.Layer> = {
  background: Astal.Layer.BACKGROUND,
  bottom: Astal.Layer.BOTTOM,
  top: Astal.Layer.TOP,
  overlay: Astal.Layer.OVERLAY,
};

const ANCHORS: Record<AnchorName, Astal.WindowAnchor> = {
  top: Astal.WindowAnchor.TOP,
  bottom: Astal.WindowAnchor.BOTTOM,
  left: Astal.WindowAnchor.LEFT,
  right: Astal.WindowAnchor.RIGHT,
};

function anchorFlags(cfg: DashboardConfig): Astal.WindowAnchor {
  const a = cfg.window?.anchor;
  if (!a || a.length === 0) {
    return (
      ANCHORS.top | ANCHORS.bottom | ANCHORS.left | ANCHORS.right
    ) as Astal.WindowAnchor;
  }
  return a
    .filter((n): n is AnchorName => n in ANCHORS)
    .reduce((acc, n) => (acc | ANCHORS[n]) as Astal.WindowAnchor, 0 as Astal.WindowAnchor);
}

function layerFor(cfg: DashboardConfig): Astal.Layer {
  const name = cfg.window?.layer ?? "background";
  return LAYERS[name] ?? Astal.Layer.BACKGROUND;
}

function Dashboard(monitor: Gdk.Monitor): Gtk.Widget {
  return (
    <window
      cssClasses={["dashboard"]}
      application={App}
      gdkmonitor={monitor}
      layer={bind(config).as(layerFor)}
      anchor={bind(config).as(anchorFlags)}
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.NONE}
      namespace="dashde"
      visible
    >
      <box orientation={Gtk.Orientation.VERTICAL}>
        {bind(config).as((cfg) => renderLayout(cfg))}
      </box>
    </window>
  );
}

App.start({
  instanceName: "dashde",
  // Seed CSS with the luxury-journal theme so the first frame renders correctly;
  // applyTheme() below swaps to whatever the user's config requests.
  css: luxuryJournal,
  main() {
    registerBuiltins();
    initConfig();

    applyTheme(config.get().theme);
    config.subscribe((cfg) => applyTheme(cfg.theme));

    const monitors = App.get_monitors();
    if (monitors.length === 0) {
      log.warn("no monitors found — cannot render");
      return;
    }
    for (const m of monitors) Dashboard(m);
    log.info(`dashde up · ${monitors.length} monitor${monitors.length === 1 ? "" : "s"}`);
  },
});
