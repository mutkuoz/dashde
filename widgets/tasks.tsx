import { Gtk } from "astal/gtk4";
import { Variable, bind } from "astal";
import type { WidgetConfig } from "../lib/config";
import type { WidgetModule } from "../lib/registry";
import { Panel } from "../lib/panel";
import { readText, writeText, watch } from "../lib/fs";
import { expand } from "../lib/paths";

interface TasksConfig extends WidgetConfig {
  file?: string;
  show_done?: boolean;
  title?: string;
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

export const tasks: WidgetModule = {
  displayName: "Tasks",
  render(cfgIn) {
    const cfg = cfgIn as TasksConfig;
    const path = expand(cfg.file ?? "~/notes/tasks.md");
    const showDone = cfg.show_done ?? true;

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
          <box orientation={Gtk.Orientation.HORIZONTAL} spacing={10}>
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
        label={bind(state).as((s) => {
          const open = s.tasks.filter((t) => !t.done).length;
          return `${open} open · ${s.tasks.length} total`;
        })}
      />
    );

    return (
      <Panel title={cfg.title ?? "today's tasks"} titleSuffix={suffix} scrollable>
        <box
          orientation={Gtk.Orientation.VERTICAL}
          cssClasses={["task-list"]}
          spacing={2}
        >
          {bind(state).as((s) => {
            const items = showDone ? s.tasks : s.tasks.filter((t) => !t.done);
            if (s.raw === "") {
              return [
                (
                  <label
                    cssClasses={["muted"]}
                    halign={Gtk.Align.START}
                    label={`no file at ${cfg.file ?? "~/notes/tasks.md"}`}
                  />
                ) as Gtk.Widget,
              ];
            }
            if (items.length === 0) {
              return [
                (
                  <label
                    cssClasses={["muted"]}
                    halign={Gtk.Align.START}
                    label="nothing yet — add lines like `- [ ] task` to the file"
                  />
                ) as Gtk.Widget,
              ];
            }
            return items.map((t) => row(t) as Gtk.Widget);
          })}
        </box>
      </Panel>
    );
  },
};
