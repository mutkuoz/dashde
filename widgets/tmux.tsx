import { Gtk } from "ags/gtk4";
import { bind } from "../lib/reactive";
import { execAsync } from "ags/process";
import type { WidgetConfig } from "../lib/config";
import type { WidgetModule } from "../lib/registry";
import { Panel } from "../lib/panel";
import { paneStream } from "../services/tmux";
import { logger } from "../lib/logger";

const log = logger("tmux");

interface TmuxConfig extends WidgetConfig {
  target: string;
  lines?: number;
  refresh_ms?: number;
  parse_ansi?: boolean;
  mono_font?: string;
  font_size?: number;
  on_click?: string;
  title?: string;
}

// ─── ANSI SGR → Pango markup ────────────────────────────────────────
// Minimal parser: supports 30–37 / 90–97 foregrounds, 40–47 backgrounds,
// 1 (bold), 3 (italic), 4 (underline), 0 (reset), 39 (default fg), 49 (default bg).

const FG_NORMAL = [
  "#2d1810", // 30 black (ink)
  "#722529", // 31 red (burgundy)
  "#4a6b3a", // 32 green
  "#9e7b3a", // 33 yellow (gold)
  "#35516b", // 34 blue
  "#6b3a4a", // 35 magenta
  "#3a6b6b", // 36 cyan
  "#6b4e36", // 37 white (ink-medium)
];

const FG_BRIGHT = [
  "#4a2b1f", // 90
  "#a4383d",
  "#6a8f56",
  "#c7a05a",
  "#4a6f8c",
  "#8f5066",
  "#5a8a8a",
  "#8a7358",
];

interface Attr {
  fg?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

function escapeMarkup(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function applySGR(attr: Attr, codes: number[]): Attr {
  const next = { ...attr };
  for (const c of codes) {
    if (c === 0) return {};
    if (c === 1) next.bold = true;
    else if (c === 3) next.italic = true;
    else if (c === 4) next.underline = true;
    else if (c === 22) next.bold = false;
    else if (c === 23) next.italic = false;
    else if (c === 24) next.underline = false;
    else if (c >= 30 && c <= 37) next.fg = FG_NORMAL[c - 30];
    else if (c === 39) next.fg = undefined;
    else if (c >= 90 && c <= 97) next.fg = FG_BRIGHT[c - 90];
    // backgrounds (40–47, 49, 100–107) intentionally ignored — parchment is sacred
  }
  return next;
}

function openSpan(attr: Attr): string {
  const pieces: string[] = [];
  if (attr.fg) pieces.push(`foreground="${attr.fg}"`);
  if (attr.bold) pieces.push(`font_weight="bold"`);
  if (attr.italic) pieces.push(`font_style="italic"`);
  if (attr.underline) pieces.push(`underline="single"`);
  return pieces.length > 0 ? `<span ${pieces.join(" ")}>` : "";
}

export function ansiToPango(line: string): string {
  const result: string[] = [];
  let attr: Attr = {};
  let openTag = "";
  let i = 0;
  while (i < line.length) {
    const esc = line.indexOf("\x1b[", i);
    if (esc === -1) {
      result.push(escapeMarkup(line.slice(i)));
      break;
    }
    if (esc > i) result.push(escapeMarkup(line.slice(i, esc)));

    const end = line.indexOf("m", esc);
    if (end === -1) {
      result.push(escapeMarkup(line.slice(esc)));
      break;
    }
    const body = line.slice(esc + 2, end);
    const codes = body
      .split(";")
      .map((s) => parseInt(s, 10))
      .filter((n) => !Number.isNaN(n));
    if (codes.length === 0) codes.push(0);
    const nextAttr = applySGR(attr, codes);

    if (openTag) result.push("</span>");
    attr = nextAttr;
    openTag = openSpan(attr);
    if (openTag) result.push(openTag);

    i = end + 1;
  }
  if (openTag) result.push("</span>");
  return result.join("");
}

export function stripAnsi(line: string): string {
  return line.replace(/\x1b\[[0-9;]*m/g, "");
}

export const tmux: WidgetModule = {
  displayName: "Tmux",
  validate(cfg) {
    if (!cfg.target || typeof cfg.target !== "string") return "missing `target`";
    return null;
  },
  render(cfgIn) {
    const cfg = cfgIn as TmuxConfig;
    const lines = cfg.lines ?? 14;
    const refresh = cfg.refresh_ms ?? 2000;
    const parseAnsi = cfg.parse_ansi !== false;
    const monoFont = cfg.mono_font ?? "JetBrains Mono";
    const fontSize = cfg.font_size ?? 12;

    const stream = paneStream(cfg.target, lines, refresh);

    const textLabel = (
      <label
        cssClasses={["tmux__text"]}
        useMarkup={parseAnsi}
        selectable
        halign={Gtk.Align.START}
        valign={Gtk.Align.END}
        xalign={0}
        yalign={1}
        wrap={false}
        label={bind(stream).as((pane) => {
          if (!pane.available) return parseAnsi ? '<span foreground="#6b4e36">session not found</span>' : "session not found";
          const rendered = pane.lines.map(parseAnsi ? ansiToPango : stripAnsi);
          return rendered.join("\n");
        })}
        css={`font-family: "${monoFont}", "JetBrains Mono", "Fira Code", monospace; font-size: ${fontSize}px;`}
      />
    );

    const scroll = (
      <Gtk.ScrolledWindow
        cssClasses={["tmux__scroll"]}
        hscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
        vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
        vexpand
        hexpand
      >
        {textLabel}
      </Gtk.ScrolledWindow>
    ) as Gtk.ScrolledWindow;

    // Auto-scroll to bottom when content changes.
    stream.subscribe(() => {
      const adj = scroll.get_vadjustment();
      // Schedule after the label reflows.
      setTimeout(() => adj.set_value(adj.get_upper()), 16);
    });

    const onClick = cfg.on_click
      ? () => {
          execAsync(["bash", "-c", cfg.on_click!]).catch((err) =>
            log.error(`on_click failed: ${(err as Error).message}`),
          );
        }
      : undefined;

    const suffix = (
      <label
        cssClasses={["muted"]}
        halign={Gtk.Align.END}
        label={bind(stream).as((p) => (p.available ? p.target : "—"))}
      />
    );

    return (
      <Panel
        title={cfg.title ?? `tmux ${cfg.target}`}
        titleSuffix={suffix}
        extraClass="panel--tmux"
        onPrimary={onClick}
      >
        {scroll}
      </Panel>
    );
  },
};
