import { Gtk } from "ags/gtk4";
import { bind } from "../lib/reactive";
import type { WidgetConfig } from "../lib/config";
import type { WidgetModule } from "../lib/registry";
import { Panel } from "../lib/panel";
import { StatRow } from "../lib/primitives";
import { sensors } from "../services/sensors";

interface SensorsConfig extends WidgetConfig {
  /** Sensor label match list; leave empty for all. Matches substring of "chip/label". */
  show?: string[];
  title?: string;
}

export const sensorsWidget: WidgetModule = {
  displayName: "Sensors",
  render(cfgIn) {
    const cfg = cfgIn as SensorsConfig;
    const filters = cfg.show ?? [];
    return (
      <Panel title={cfg.title ?? "sensors"}>
        <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["stats"]}>
          {bind(sensors).as((list) => {
            const matched = filters.length === 0
              ? list
              : list.filter((r) => filters.some((f) => `${r.chip}/${r.label}`.includes(f)));
            if (matched.length === 0)
              return [
                (
                  <label
                    cssClasses={["muted"]}
                    halign={Gtk.Align.START}
                    label="no readings available"
                  />
                ) as Gtk.Widget,
              ];
            return matched.map(
              (r) =>
                (
                  <StatRow
                    label={r.label}
                    value={`${r.value.toFixed(r.unit === "°C" ? 1 : 0)} ${r.unit}`}
                  />
                ) as Gtk.Widget,
            );
          })}
        </box>
      </Panel>
    );
  },
};
