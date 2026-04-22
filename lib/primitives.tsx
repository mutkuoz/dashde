import { Gtk } from "astal/gtk4";
import type { Binding } from "astal";

export interface BarProps {
  value: Binding<number> | number; // 0..1
  tone?: Binding<"primary" | "good" | "warn"> | "primary" | "good" | "warn";
  label?: Binding<string> | string;
  right?: Binding<string> | string;
}

/**
 * A horizontal progress bar with an optional label/right-text row above.
 * Plain GTK primitives only — no DrawingArea — so theme swaps just work.
 */
export function Bar(props: BarProps): Gtk.Widget {
  const toneClass = toStyle(props.tone ?? "primary", (t) => `bar__fill bar__fill--${t}`);
  const width = toStyle(props.value, (v) => `min-width: ${Math.max(0, Math.min(1, v)) * 100}%;`);

  const fillClasses: Binding<string[]> | string[] =
    typeof (toneClass as Binding<string>)?.as === "function"
      ? (toneClass as Binding<string>).as((s) => s.split(" "))
      : (toneClass as string).split(" ");

  return (
    <box cssClasses={["bar"]} orientation={Gtk.Orientation.VERTICAL}>
      {(props.label !== undefined || props.right !== undefined) && (
        <box cssClasses={["bar__labels"]} orientation={Gtk.Orientation.HORIZONTAL}>
          {props.label !== undefined && (
            <label cssClasses={["label"]} halign={Gtk.Align.START} hexpand label={props.label} />
          )}
          {props.right !== undefined && (
            <label cssClasses={["num"]} halign={Gtk.Align.END} label={props.right} />
          )}
        </box>
      )}
      <box cssClasses={["bar__track"]} hexpand>
        <box cssClasses={fillClasses} css={width} />
      </box>
    </box>
  );
}

function toStyle<T, U>(v: Binding<T> | T, fn: (x: T) => U): Binding<U> | U {
  if (typeof (v as Binding<T>)?.as === "function") {
    return (v as Binding<T>).as(fn);
  }
  return fn(v as T);
}

export interface StatRowProps {
  label: Binding<string> | string;
  value: Binding<string> | string;
}

export function StatRow(props: StatRowProps): Gtk.Widget {
  return (
    <box cssClasses={["stat-row"]} orientation={Gtk.Orientation.HORIZONTAL}>
      <label cssClasses={["label"]} halign={Gtk.Align.START} hexpand label={props.label} />
      <label cssClasses={["num"]} halign={Gtk.Align.END} label={props.value} />
    </box>
  );
}

export function Divider(): Gtk.Widget {
  return <box cssClasses={["divider"]} hexpand />;
}

export function human(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = bytes;
  let u = 0;
  while (n >= 1024 && u < units.length - 1) {
    n /= 1024;
    u++;
  }
  return `${n >= 10 || u === 0 ? n.toFixed(0) : n.toFixed(1)} ${units[u]}`;
}

export function percent(v: number): string {
  return `${Math.round(v * 100)}%`;
}
