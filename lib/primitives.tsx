import { Gtk } from "ags/gtk4";
import type { Binding } from "./reactive";

type Tone = "primary" | "good" | "warn";

export interface BarProps {
  value: Binding<number> | number; // 0..1
  tone?: Binding<Tone> | Tone;
  label?: Binding<string> | string;
  right?: Binding<string> | string;
}

/**
 * A horizontal bar backed by Gtk.LevelBar. We use LevelBar because GTK4
 * CSS rejects `min-width: X%` on plain boxes (which is how the old
 * implementation drew the fill), so percentage-based fills silently
 * failed with a "Percentages are not allowed here" parser error.
 */
export function Bar(props: BarProps): Gtk.Widget {
  const valueAcc = toStyle(props.value, (v) => Math.max(0, Math.min(1, v)));
  const toneClasses = toStyle(props.tone ?? "primary", (t) => ["bar__fill", `bar__fill--${t}`]);

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
      <Gtk.LevelBar
        cssClasses={toneClasses as Binding<string[]> | string[]}
        mode={Gtk.LevelBarMode.CONTINUOUS}
        minValue={0}
        maxValue={1}
        value={valueAcc as Binding<number> | number}
        hexpand
      />
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
