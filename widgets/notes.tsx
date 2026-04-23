import { Gtk } from "ags/gtk4";
import { Variable, bind } from "../lib/reactive";
import type { WidgetConfig } from "../lib/config";
import type { WidgetModule } from "../lib/registry";
import { Panel } from "../lib/panel";
import { readText, writeText, watch } from "../lib/fs";
import { expand } from "../lib/paths";

interface NotesConfig extends WidgetConfig {
  file?: string;
  line_count?: number;
  title?: string;
  editable?: boolean;
}

export const notes: WidgetModule = {
  displayName: "Notes",
  render(cfgIn) {
    const cfg = cfgIn as NotesConfig;
    const path = expand(cfg.file ?? "~/notes/scratch.md");
    const editable = cfg.editable !== false;

    const content = Variable<string>("");
    const dirty = Variable<boolean>(false);

    const load = () => {
      const raw = readText(path);
      content.set(raw ?? "");
      dirty.set(false);
    };
    load();
    watch(path, () => {
      // if the widget is dirty with unsaved edits, don't overwrite; user can reload manually
      if (!dirty.get()) load();
    });

    const buffer = new Gtk.TextBuffer();
    buffer.set_text(content.get(), -1);

    const applyContent = (next: string) => {
      const start = buffer.get_start_iter();
      const end = buffer.get_end_iter();
      const cur = buffer.get_text(start, end, false);
      if (cur !== next) buffer.set_text(next, -1);
    };

    content.subscribe(applyContent);

    buffer.connect("changed", () => {
      const start = buffer.get_start_iter();
      const end = buffer.get_end_iter();
      const next = buffer.get_text(start, end, false);
      if (next !== content.get()) {
        content.set(next);
        dirty.set(true);
        scheduleSave(next);
      }
    });

    let saveTimer: number | null = null;
    const scheduleSave = (text: string) => {
      if (saveTimer !== null) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        saveTimer = null;
        if (writeText(path, text)) dirty.set(false);
      }, 500);
    };

    const textView = (
      <Gtk.TextView
        cssClasses={["notes__text"]}
        buffer={buffer}
        editable={editable}
        wrapMode={Gtk.WrapMode.WORD_CHAR}
        hexpand
        vexpand
      />
    );

    const suffix = (
      <label
        cssClasses={["muted"]}
        halign={Gtk.Align.END}
        label={bind(dirty).as((d) => (d ? "saving…" : "saved"))}
      />
    );

    return (
      <Panel title={cfg.title ?? "notes"} titleSuffix={suffix} scrollable>
        <box cssClasses={["notes"]} orientation={Gtk.Orientation.VERTICAL} vexpand>
          {textView}
        </box>
      </Panel>
    );
  },
};
