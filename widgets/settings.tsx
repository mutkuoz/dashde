import { Gtk } from "ags/gtk4";
import { With } from "ags";
import { execAsync } from "ags/process";
import { parseDocument } from "yaml";
import type { WidgetConfig } from "../lib/config";
import type { WidgetModule } from "../lib/registry";
import { Panel } from "../lib/panel";
import { config } from "../lib/config";
import { themeNames } from "../lib/theme";
import { paths } from "../lib/paths";
import { readText, writeText } from "../lib/fs";
import { logger } from "../lib/logger";

const log = logger("settings");

/**
 * Write `theme: <name>` back into the user's config.yaml while preserving
 * comments and existing keys. Parses the YAML as a Document (not a plain
 * object), mutates the `theme` node, and re-stringifies — yaml@2 keeps
 * comments and trailing whitespace intact through a round-trip.
 */
function setTheme(name: string): void {
  const raw = readText(paths.configFile);
  if (raw === null) {
    log.error(`cannot read ${paths.configFile}`);
    return;
  }
  try {
    const doc = parseDocument(raw);
    doc.set("theme", name);
    if (!writeText(paths.configFile, doc.toString())) {
      log.error("failed to write config");
    } else {
      log.info(`theme → ${name}`);
    }
  } catch (err) {
    log.error(`failed to update theme: ${(err as Error).message}`);
  }
}

function openConfig(): void {
  execAsync(["xdg-open", paths.configFile]).catch((err) =>
    log.error(`xdg-open failed: ${(err as Error).message}`),
  );
}

function openDocs(): void {
  execAsync(["xdg-open", "https://github.com/mutkuoz/dashde"]).catch((err) =>
    log.error(`xdg-open failed: ${(err as Error).message}`),
  );
}

export const settingsWidget: WidgetModule = {
  displayName: "Settings",
  render(cfgIn) {
    const cfg = cfgIn as WidgetConfig & { title?: string };
    return (
      <Panel title={cfg.title ?? "settings"}>
        <box
          orientation={Gtk.Orientation.VERTICAL}
          spacing={14}
          cssClasses={["settings"]}
        >
          <box orientation={Gtk.Orientation.VERTICAL} spacing={6}>
            <label cssClasses={["label"]} halign={Gtk.Align.START} label="theme" />
            <With value={config}>
              {(cur) => (
                <box
                  orientation={Gtk.Orientation.HORIZONTAL}
                  spacing={6}
                  halign={Gtk.Align.START}
                  cssClasses={["settings__themes"]}
                  homogeneous
                >
                  {themeNames().map(
                    (name) =>
                      (
                        <button
                          cssClasses={
                            cur.theme === name ? ["btn", "btn--primary"] : ["btn"]
                          }
                          onClicked={() => setTheme(name)}
                        >
                          <label label={name} />
                        </button>
                      ) as Gtk.Widget,
                  )}
                </box>
              )}
            </With>
          </box>

          <box cssClasses={["divider"]} hexpand />

          <box orientation={Gtk.Orientation.VERTICAL} spacing={6}>
            <label cssClasses={["label"]} halign={Gtk.Align.START} label="config" />
            <box
              orientation={Gtk.Orientation.HORIZONTAL}
              spacing={6}
              halign={Gtk.Align.START}
            >
              <button cssClasses={["btn"]} onClicked={openConfig}>
                <box
                  orientation={Gtk.Orientation.HORIZONTAL}
                  spacing={6}
                  valign={Gtk.Align.CENTER}
                >
                  <image iconName="document-edit-symbolic" pixelSize={16} />
                  <label label="edit yaml" />
                </box>
              </button>
              <button cssClasses={["btn"]} onClicked={openDocs}>
                <box
                  orientation={Gtk.Orientation.HORIZONTAL}
                  spacing={6}
                  valign={Gtk.Align.CENTER}
                >
                  <image iconName="help-browser-symbolic" pixelSize={16} />
                  <label label="docs" />
                </box>
              </button>
            </box>
          </box>
        </box>
      </Panel>
    );
  },
};
