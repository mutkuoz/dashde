import { Gtk } from "ags/gtk4";
import { With, createRoot } from "ags";
import { execAsync } from "ags/process";
import { parseDocument, Document, YAMLSeq } from "yaml";
import app from "ags/gtk4/app";
import { config } from "./config";
import { themeNames } from "./theme";
import { paths } from "./paths";
import { readText, writeText } from "./fs";
import { iconPath } from "./icons";
import { allTypes } from "./registry";
import { logger } from "./logger";

const log = logger("settings");

let singleton: Gtk.Window | null = null;

/** Open (or focus) the settings window. Called from quick_launch when the
 *  user clicks a tile whose command is "dashde:open-settings". */
export function openSettingsWindow(): void {
  if (singleton) {
    singleton.present();
    return;
  }
  createRoot((dispose) => {
    const win = build();
    win.connect("close-request", () => {
      singleton = null;
      dispose();
      return false;
    });
    singleton = win;
    win.present();
  });
}

// ─── config mutations ───────────────────────────────────────────────
// All writes go through updateConfig(). We parse the user's YAML as a
// Document (not a plain object) so comments and key order survive the
// round-trip. The running dashboard picks up the change via its file
// watcher within ~300ms.

function updateConfig(mutate: (doc: Document) => void): void {
  const raw = readText(paths.configFile);
  if (raw === null) {
    log.error(`cannot read ${paths.configFile}`);
    return;
  }
  try {
    const doc = parseDocument(raw);
    mutate(doc);
    if (!writeText(paths.configFile, doc.toString())) {
      log.error("failed to write config");
    }
  } catch (err) {
    log.error(`update failed: ${(err as Error).message}`);
  }
}

function setTheme(name: string): void {
  updateConfig((doc) => doc.set("theme", name));
}

function setGreetingName(name: string): void {
  updateConfig((doc) => doc.setIn(["greeting", "name"], name));
}

function removeWidget(id: string): void {
  updateConfig((doc) => {
    doc.deleteIn(["widgets", id]);
    const layout = doc.get("layout") as YAMLSeq | undefined;
    if (!layout) return;
    layout.items.forEach((row) => {
      const seq = row as YAMLSeq;
      if (!seq?.items) return;
      for (let i = seq.items.length - 1; i >= 0; i--) {
        const item = seq.items[i] as { value?: unknown } | null;
        if (item && item.value === id) seq.delete(i);
      }
    });
  });
}

function addWidget(id: string, type: string): void {
  if (!id || !type) return;
  updateConfig((doc) => {
    if (doc.hasIn(["widgets", id])) {
      log.warn(`widget id "${id}" already exists`);
      return;
    }
    doc.setIn(["widgets", id], { type });
    // append to the last row of layout (or create a new row)
    const layout = doc.get("layout") as YAMLSeq | undefined;
    if (!layout || layout.items.length === 0) {
      doc.set("layout", [[id]]);
      return;
    }
    const last = layout.items[layout.items.length - 1] as YAMLSeq;
    last.add(id);
  });
}

function applyLayoutYaml(text: string): string | null {
  try {
    const parsed = parseDocument(text);
    const value = parsed.toJS();
    if (!Array.isArray(value)) return "layout must be a list of rows";
    for (const row of value) {
      if (!Array.isArray(row)) return "each row must be a list of widget ids";
    }
    updateConfig((doc) => doc.set("layout", value));
    return null;
  } catch (err) {
    return (err as Error).message;
  }
}

function openYamlEditor(): void {
  execAsync(["xdg-open", paths.configFile]).catch((err) =>
    log.error(`xdg-open failed: ${(err as Error).message}`),
  );
}

function openDocs(): void {
  execAsync(["xdg-open", "https://github.com/mutkuoz/dashde"]).catch((err) =>
    log.error(`xdg-open failed: ${(err as Error).message}`),
  );
}

// ─── tiny helpers ───────────────────────────────────────────────────

function iconBtn(opts: {
  icon: string;
  label?: string;
  classes?: string[];
  onClicked: () => void;
  tooltip?: string;
}): Gtk.Widget {
  const { icon, label, classes = [], onClicked, tooltip } = opts;
  const inner = (
    <box
      orientation={Gtk.Orientation.HORIZONTAL}
      spacing={label ? 8 : 0}
      valign={Gtk.Align.CENTER}
      halign={Gtk.Align.CENTER}
    >
      <image file={iconPath(icon)} pixelSize={16} cssClasses={["btn__icon"]} />
      {label !== undefined && <label label={label} />}
    </box>
  );
  return (
    <button
      cssClasses={["btn", ...(label ? [] : ["btn--icon"]), ...classes]}
      onClicked={onClicked}
      tooltipText={tooltip ?? ""}
    >
      {inner}
    </button>
  ) as Gtk.Widget;
}

function sectionHeader(title: string): Gtk.Widget {
  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={0} halign={Gtk.Align.START}>
      <label cssClasses={["section"]} halign={Gtk.Align.START} label={title} />
      <box cssClasses={["section__rule"]} halign={Gtk.Align.START} />
    </box>
  ) as Gtk.Widget;
}

// ─── sections ───────────────────────────────────────────────────────

function themeSection(): Gtk.Widget {
  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={10}>
      {sectionHeader("theme")}
      <With value={config}>
        {(cur) => (
          <box
            orientation={Gtk.Orientation.HORIZONTAL}
            spacing={8}
            halign={Gtk.Align.START}
            homogeneous
          >
            {themeNames().map(
              (name) =>
                (
                  <button
                    cssClasses={cur.theme === name ? ["btn", "btn--primary"] : ["btn"]}
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
  ) as Gtk.Widget;
}

function greetingSection(): Gtk.Widget {
  const entry = (
    <Gtk.Entry
      cssClasses={["task-input", "settings__entry"]}
      placeholderText="your name"
      hexpand
    />
  ) as Gtk.Entry;

  // Keep the entry populated with whatever config currently says.
  const sub = config.subscribe((cfg) => {
    const name = cfg.greeting?.name ?? "";
    if (entry.get_text() !== name) entry.set_text(name);
  });
  entry.connect("destroy", () => sub());

  // Apply the first value and then again on every Enter press.
  entry.set_text(config.get().greeting?.name ?? "");
  entry.connect("activate", () => {
    setGreetingName(entry.get_text().trim() || "friend");
  });

  const save = iconBtn({
    icon: "check",
    label: "save",
    onClicked: () => setGreetingName(entry.get_text().trim() || "friend"),
  });

  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={10}>
      {sectionHeader("your name")}
      <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
        {entry as Gtk.Widget}
        {save}
      </box>
    </box>
  ) as Gtk.Widget;
}

function widgetsSection(): Gtk.Widget {
  const row = (id: string, type: string): Gtk.Widget => (
    <box
      cssClasses={["settings__widget-row"]}
      orientation={Gtk.Orientation.HORIZONTAL}
      spacing={10}
    >
      <label cssClasses={["num"]} halign={Gtk.Align.START} label={id} hexpand xalign={0} />
      <label cssClasses={["muted"]} halign={Gtk.Align.END} label={type} />
      {iconBtn({
        icon: "trash",
        tooltip: `remove "${id}"`,
        onClicked: () => removeWidget(id),
      })}
    </box>
  );

  // add-widget input row
  const idEntry = (
    <Gtk.Entry
      cssClasses={["task-input", "settings__entry"]}
      placeholderText="new widget id (e.g. weather)"
      hexpand
    />
  ) as Gtk.Entry;

  const typeDropdown = Gtk.DropDown.new_from_strings(allTypes());
  typeDropdown.add_css_class("settings__dropdown");

  const addRow = (
    <box
      cssClasses={["settings__add-row"]}
      orientation={Gtk.Orientation.HORIZONTAL}
      spacing={8}
    >
      {idEntry as Gtk.Widget}
      {typeDropdown as unknown as Gtk.Widget}
      {iconBtn({
        icon: "plus",
        label: "add",
        classes: ["btn--primary"],
        onClicked: () => {
          const id = idEntry.get_text().trim();
          const types = allTypes();
          const idx = typeDropdown.get_selected();
          const type = types[idx];
          if (!id || !type) return;
          addWidget(id, type);
          idEntry.set_text("");
        },
      })}
    </box>
  );

  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={10}>
      {sectionHeader("widgets")}
      <With value={config}>
        {(cfg) => {
          const ids = Object.keys(cfg.widgets ?? {});
          if (ids.length === 0) {
            return (
              <label
                cssClasses={["muted"]}
                halign={Gtk.Align.START}
                label="no widgets configured"
              />
            );
          }
          return (
            <box
              cssClasses={["settings__widget-list"]}
              orientation={Gtk.Orientation.VERTICAL}
            >
              {ids.map((id) => row(id, cfg.widgets[id]?.type ?? "?") as Gtk.Widget)}
            </box>
          );
        }}
      </With>
      {addRow as Gtk.Widget}
    </box>
  ) as Gtk.Widget;
}

function layoutSection(): Gtk.Widget {
  const buffer = new Gtk.TextBuffer();

  // Seed + keep in sync with config (only if the textview isn't focused —
  // don't yank the user's cursor while they're typing).
  const textview = (
    <Gtk.TextView
      cssClasses={["settings__layout-editor"]}
      buffer={buffer}
      monospace
      hexpand
      vexpand
    />
  ) as Gtk.TextView;

  const toYaml = (layout: unknown[][]): string => {
    const doc = new Document(layout);
    return doc.toString().trim();
  };

  const apply = () => {
    const start = buffer.get_start_iter();
    const end = buffer.get_end_iter();
    const text = buffer.get_text(start, end, false);
    const err = applyLayoutYaml(text);
    if (err) log.warn(`layout not applied: ${err}`);
  };

  const seed = (layout: (string | null)[][]) => {
    const text = toYaml(layout);
    const start = buffer.get_start_iter();
    const end = buffer.get_end_iter();
    const current = buffer.get_text(start, end, false);
    if (text !== current && !textview.has_focus) {
      buffer.set_text(text, -1);
    }
  };
  seed(config.get().layout ?? []);
  const sub = config.subscribe((cfg) => seed(cfg.layout ?? []));
  textview.connect("destroy", () => sub());

  const applyBtn = iconBtn({
    icon: "check",
    label: "apply layout",
    classes: ["btn--primary"],
    onClicked: apply,
  });

  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={10}>
      {sectionHeader("layout")}
      <label
        cssClasses={["muted"]}
        halign={Gtk.Align.START}
        label="each row is a list of widget ids. null leaves a gap. widget order matters."
      />
      <Gtk.ScrolledWindow
        cssClasses={["settings__layout-scroll"]}
        hscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
        vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
        minContentHeight={140}
      >
        {textview as Gtk.Widget}
      </Gtk.ScrolledWindow>
      <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8} halign={Gtk.Align.END}>
        {applyBtn}
      </box>
    </box>
  ) as Gtk.Widget;
}

function footer(onClose: () => void): Gtk.Widget {
  return (
    <box
      cssClasses={["settings__footer"]}
      orientation={Gtk.Orientation.HORIZONTAL}
      spacing={8}
      halign={Gtk.Align.END}
    >
      {iconBtn({ icon: "edit", label: "edit yaml", onClicked: openYamlEditor })}
      {iconBtn({ icon: "docs", label: "docs", onClicked: openDocs })}
      {iconBtn({ icon: "close", label: "close", onClicked: onClose })}
    </box>
  ) as Gtk.Widget;
}

// ─── root build ─────────────────────────────────────────────────────

function build(): Gtk.Window {
  const win = (
    <Gtk.Window
      title="dashde · settings"
      defaultWidth={760}
      defaultHeight={880}
      application={app}
      cssClasses={["dashboard", "settings-window"]}
    />
  ) as Gtk.Window;

  const close = () => win.close();

  const body = (
    <Gtk.ScrolledWindow
      cssClasses={["settings-window__scroll"]}
      hscrollbarPolicy={Gtk.PolicyType.NEVER}
      vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
      vexpand
    >
      <box
        orientation={Gtk.Orientation.VERTICAL}
        cssClasses={["settings-window__body"]}
        spacing={28}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
          <label cssClasses={["greeting", "settings-window__title"]}
                 halign={Gtk.Align.START}
                 label="dashde · settings" />
          <label cssClasses={["muted"]}
                 halign={Gtk.Align.START}
                 label="everything here writes back to your config.yaml — the dashboard hot-reloads on save" />
        </box>
        {themeSection()}
        {greetingSection()}
        {widgetsSection()}
        {layoutSection()}
        {footer(close)}
      </box>
    </Gtk.ScrolledWindow>
  );

  win.set_child(body as unknown as Gtk.Widget);
  return win;
}
