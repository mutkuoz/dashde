import { Gtk } from "ags/gtk4";
import { With } from "ags";
import { Variable, bind } from "../lib/reactive";
import type { WidgetConfig } from "../lib/config";
import type { WidgetModule } from "../lib/registry";
import { Panel } from "../lib/panel";
import { readText, writeText, watch } from "../lib/fs";
import { expand } from "../lib/paths";

interface TasksConfig extends WidgetConfig {
  file?: string;
  show_done?: boolean;
  title?: string;
  /** Show the "add a task…" input row. Default true. */
  editable?: boolean;
}

interface Task {
  index: number; // line number in file
  done: boolean;
  text: string;
}

const LINE_RE = /^\s*[-*]\s*\[(x|X|\s)\]\s*(.*)$/;

function parse(content: string): { lines: string[]; tasks: Task[] } {
  const lines = content.split("\n");
  const tasks: Task[] = [];
  lines.forEach((line, idx) => {
    const m = LINE_RE.exec(line);
    if (!m) return;
    tasks.push({ index: idx, done: m[1].toLowerCase() === "x", text: m[2].trim() });
  });
  return { lines, tasks };
}

function toggle(content: string, taskIndex: number): string {
  const lines = content.split("\n");
  const line = lines[taskIndex];
  if (!line) return content;
  const m = LINE_RE.exec(line);
  if (!m) return content;
  const nextMark = m[1].toLowerCase() === "x" ? " " : "x";
  lines[taskIndex] = line.replace(/\[(x|X|\s)\]/, `[${nextMark}]`);
  return lines.join("\n");
}

function appendTask(content: string, text: string): string {
  const trimmed = content.replace(/\s+$/, "");
  const sep = trimmed.length === 0 ? "" : "\n";
  return `${trimmed}${sep}- [ ] ${text}\n`;
}

export const tasks: WidgetModule = {
  displayName: "Tasks",
  render(cfgIn) {
    const cfg = cfgIn as TasksConfig;
    const path = expand(cfg.file ?? "~/notes/tasks.md");
    const showDone = cfg.show_done ?? true;
    const editable = cfg.editable !== false;

    const state = Variable<{ tasks: Task[]; raw: string }>({ tasks: [], raw: "" });

    const load = () => {
      const raw = readText(path);
      if (raw === null) {
        state.set({ tasks: [], raw: "" });
        return;
      }
      const { tasks } = parse(raw);
      state.set({ tasks, raw });
    };
    load();

    watch(path, load);

    const onToggle = (idx: number) => {
      const cur = state.get();
      const next = toggle(cur.raw, idx);
      if (writeText(path, next)) load();
    };

    const row = (t: Task) => {
      const boxClasses = ["task"];
      if (t.done) boxClasses.push("task--done");
      return (
        <button cssClasses={boxClasses} onClicked={() => onToggle(t.index)}>
          <box orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
            <label cssClasses={["task__mark"]} label={t.done ? "✓" : "○"} />
            <label
              cssClasses={["task__text"]}
              label={t.text}
              halign={Gtk.Align.START}
              hexpand
              wrap
              xalign={0}
            />
          </box>
        </button>
      );
    };

    const suffix = (
      <label
        cssClasses={["num"]}
        halign={Gtk.Align.END}
        valign={Gtk.Align.START}
        label={bind(state).as((s) => {
          const open = s.tasks.filter((t) => !t.done).length;
          return `${open} open · ${s.tasks.length} total`;
        })}
      />
    );

    const listArea = (
      <Gtk.ScrolledWindow
        cssClasses={["panel__scroll"]}
        hscrollbarPolicy={Gtk.PolicyType.NEVER}
        vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
        vexpand
      >
        <With value={state}>
          {(s) => {
            const items = showDone ? s.tasks : s.tasks.filter((t) => !t.done);
            if (s.raw === "" && !editable) {
              return (
                <box cssClasses={["task-list"]} orientation={Gtk.Orientation.VERTICAL}>
                  <label
                    cssClasses={["muted"]}
                    halign={Gtk.Align.START}
                    label={`no file at ${cfg.file ?? "~/notes/tasks.md"}`}
                  />
                </box>
              );
            }
            if (items.length === 0) {
              return (
                <box cssClasses={["task-list"]} orientation={Gtk.Orientation.VERTICAL}>
                  <label
                    cssClasses={["muted"]}
                    halign={Gtk.Align.START}
                    label={
                      editable
                        ? "no tasks yet — type one below"
                        : "nothing yet — add `- [ ] task` to the file"
                    }
                  />
                </box>
              );
            }
            return (
              <box
                orientation={Gtk.Orientation.VERTICAL}
                cssClasses={["task-list"]}
                spacing={2}
              >
                {items.map((t) => row(t) as Gtk.Widget)}
              </box>
            );
          }}
        </With>
      </Gtk.ScrolledWindow>
    ) as Gtk.Widget;

    const entry = (
      <Gtk.Entry
        cssClasses={["task-input"]}
        placeholderText="add a task…"
        hexpand
      />
    ) as Gtk.Entry;

    entry.connect("activate", () => {
      const text = entry.get_text().trim();
      if (!text) return;
      const cur = readText(path) ?? "";
      const next = appendTask(cur, text);
      if (writeText(path, next)) {
        entry.set_text("");
        load();
      }
    });

    return (
      <Panel title={cfg.title ?? "today's tasks"} titleSuffix={suffix}>
        <box orientation={Gtk.Orientation.VERTICAL} spacing={10} vexpand>
          {listArea}
          {editable && (entry as Gtk.Widget)}
        </box>
      </Panel>
    );
  },
};
