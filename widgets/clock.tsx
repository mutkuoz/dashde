import { Gtk } from "astal/gtk4";
import { bind } from "astal";
import type { WidgetConfig } from "../lib/config";
import type { WidgetModule } from "../lib/registry";
import { now, formatTime, formatDate, periodPhrase } from "../services/time";
import { Panel } from "../lib/panel";

interface ClockConfig extends WidgetConfig {
  format?: "24h" | "12h";
  show_period?: boolean;
  show_date?: boolean;
}

export const clock: WidgetModule = {
  displayName: "Clock",
  render(cfgIn) {
    const cfg = cfgIn as ClockConfig;
    const fmt = cfg.format ?? "24h";
    const showPeriod = cfg.show_period !== false;
    const showDate = cfg.show_date !== false;
    return (
      <Panel extraClass="panel--clock">
        <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER} halign={Gtk.Align.END}>
          <label
            cssClasses={["clock", "num-display"]}
            halign={Gtk.Align.END}
            label={bind(now).as((d) => formatTime(d, fmt))}
          />
          {showPeriod && (
            <label
              cssClasses={["muted"]}
              halign={Gtk.Align.END}
              label={bind(now).as(periodPhrase)}
            />
          )}
          {showDate && (
            <label
              cssClasses={["muted"]}
              halign={Gtk.Align.END}
              label={bind(now).as(formatDate)}
            />
          )}
        </box>
      </Panel>
    );
  },
};
