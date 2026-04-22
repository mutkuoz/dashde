import { Gtk } from "astal/gtk4";
import { logger } from "./logger";

const log = logger("widget");

export function safeRender(
  type: string,
  id: string,
  fn: () => Gtk.Widget,
): Gtk.Widget {
  try {
    return fn();
  } catch (err) {
    log.error(`widget ${id} (${type}) crashed during render: ${(err as Error).message}`);
    return (
      <box cssClasses={["panel", "panel--error"]} orientation={Gtk.Orientation.VERTICAL}>
        <label cssClasses={["section"]} label={`${type}`} halign={Gtk.Align.START} />
        <label cssClasses={["muted"]} label="render error — see journal" halign={Gtk.Align.START} />
      </box>
    );
  }
}

export function unavailable(label: string): Gtk.Widget {
  return (
    <box cssClasses={["unavailable"]} halign={Gtk.Align.START}>
      <label cssClasses={["muted"]} label={label} />
    </box>
  );
}

export function missingWidget(id: string): Gtk.Widget {
  return (
    <box cssClasses={["panel", "panel--error"]} orientation={Gtk.Orientation.VERTICAL}>
      <label cssClasses={["section"]} label="unknown widget" halign={Gtk.Align.START} />
      <label cssClasses={["muted"]} label={id} halign={Gtk.Align.START} />
    </box>
  );
}
