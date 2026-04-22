import { Gtk } from "astal/gtk4";
import { bind } from "astal";
import { execAsync } from "astal/process";
import type { WidgetConfig } from "../lib/config";
import type { WidgetModule } from "../lib/registry";
import { Panel } from "../lib/panel";
import { shellStream } from "../services/shell";
import { ansiToPango, stripAnsi } from "./tmux";
import { logger } from "../lib/logger";

const log = logger("shell_output");

interface ShellOutputConfig extends WidgetConfig {
  command: string;
  refresh_ms?: number;
  lines?: number;
  parse_ansi?: boolean;
  title?: string;
  mono_font?: string;
  font_size?: number;
  on_click?: string;
}

export const shell_output: WidgetModule = {
  displayName: "Shell Output",
  validate(cfg) {
    if (!cfg.command || typeof cfg.command !== "string") return "missing `command`";
    return null;
  },
  render(cfgIn) {
    const cfg = cfgIn as ShellOutputConfig;
    const refresh = cfg.refresh_ms ?? 5000;
    const lines = cfg.lines ?? 10;
    const parseAnsi = cfg.parse_ansi === true;
    const font = cfg.mono_font ?? "JetBrains Mono";
    const size = cfg.font_size ?? 12;

    const stream = shellStream(cfg.command, refresh);

    const onClick = cfg.on_click
      ? () => {
          execAsync(["bash", "-c", cfg.on_click!]).catch((err) =>
            log.error(`on_click failed: ${(err as Error).message}`),
          );
        }
      : undefined;

    return (
      <Panel title={cfg.title ?? "shell"} onPrimary={onClick} extraClass="panel--shell">
        <Gtk.ScrolledWindow
          cssClasses={["shell__scroll"]}
          hscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
          vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
          vexpand
        >
          <label
            cssClasses={["shell__text"]}
            useMarkup={parseAnsi}
            selectable
            halign={Gtk.Align.START}
            valign={Gtk.Align.START}
            xalign={0}
            yalign={0}
            wrap={false}
            label={bind(stream).as((s) => {
              if (!s.ran) return parseAnsi ? '<span foreground="#6b4e36">…</span>' : "…";
              const raw = s.stdout || "";
              const arr = raw.split("\n");
              if (arr.length > 0 && arr[arr.length - 1] === "") arr.pop();
              const tail = lines > 0 ? arr.slice(-lines) : arr;
              return parseAnsi ? tail.map(ansiToPango).join("\n") : tail.map(stripAnsi).join("\n");
            })}
            css={`font-family: "${font}", monospace; font-size: ${size}px;`}
          />
        </Gtk.ScrolledWindow>
      </Panel>
    );
  },
};
