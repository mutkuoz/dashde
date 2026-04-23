import { Astal, Gdk, Gtk } from "ags/gtk4";
import app from "ags/gtk4/app";
import { With } from "ags";
import GLib from "gi://GLib?version=2.0";
import { bind } from "./lib/reactive";
import { registerBuiltins } from "./widgets/index";
import { config, initConfig, type DashboardConfig } from "./lib/config";
import { applyTheme } from "./lib/theme";
import { renderLayout } from "./lib/layout";
import { logger } from "./lib/logger";
import { openSettingsWindow } from "./lib/settings-window";
import luxuryJournal from "./themes/luxury-journal.scss";

const log = logger("app");

const IS_WAYLAND = GLib.getenv("WAYLAND_DISPLAY") !== null;

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

/**
 * On Wayland: a layer-shell surface anchored across the whole monitor,
 * background layer, no keyboard focus, no exclusive zone. Sits behind
 * everything else like a live wallpaper.
 *
 * On X11: a plain Gtk.Window sized 1280×800 so you can see the grid
 * while iterating. Layer-shell has no X11 counterpart; this is the
 * honest fallback.
 */
function WaylandDashboard(monitor: Gdk.Monitor): Gtk.Widget {
  return (
    <window
      cssClasses={["dashboard"]}
      application={app}
      gdkmonitor={monitor}
      layer={bind(config).as(layerFor)}
      anchor={bind(config).as(anchorFlags)}
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.NONE}
      namespace="dashde"
      visible
    >
      <box
        orientation={Gtk.Orientation.VERTICAL}
        valign={Gtk.Align.START}
        hexpand
        vexpand
      >
        <With value={config}>{(cfg) => renderLayout(cfg)}</With>
      </box>
    </window>
  );
}

function X11Dashboard(): Gtk.Widget {
  return (
    <Gtk.Window
      cssClasses={["dashboard"]}
      application={app}
      defaultWidth={1600}
      defaultHeight={1000}
      title="DashDE"
      visible
    >
      <box
        orientation={Gtk.Orientation.VERTICAL}
        valign={Gtk.Align.START}
        hexpand
        vexpand
      >
        <With value={config}>{(cfg) => renderLayout(cfg)}</With>
      </box>
    </Gtk.Window>
  );
}

app.start({
  instanceName: "dashde",
  // Seed CSS with the luxury-journal theme so the first frame renders correctly;
  // applyTheme() below swaps to whatever the user's config requests.
  css: luxuryJournal,
  main() {
    registerBuiltins();
    initConfig();

    applyTheme(config.get().theme);
    config.subscribe((cfg) => applyTheme(cfg.theme));

    if (IS_WAYLAND) {
      const monitors = app.get_monitors();
      if (monitors.length === 0) {
        log.warn("no monitors found — cannot render");
        return;
      }
      for (const m of monitors) WaylandDashboard(m);
      log.info(
        `dashde up on wayland · ${monitors.length} monitor${monitors.length === 1 ? "" : "s"}`,
      );
    } else {
      log.info("dashde up on x11 · floating-window fallback (layer-shell is wayland-only)");
      X11Dashboard();
    }

    // Debug hook: DASHDE_AUTO_SETTINGS=1 opens the settings window on launch.
    if (GLib.getenv("DASHDE_AUTO_SETTINGS") !== null) {
      setTimeout(() => openSettingsWindow(), 800);
    }
  },
});
