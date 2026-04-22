import { Gtk } from "astal/gtk4";
import { bind } from "astal";
import type { WidgetConfig } from "../lib/config";
import type { WidgetModule } from "../lib/registry";
import { Panel } from "../lib/panel";
import {
  weatherStream,
  weatherDescription,
  weatherSymbol,
  type WeatherSnapshot,
} from "../services/weather";

interface WeatherConfig extends WidgetConfig {
  lat: number;
  lon: number;
  days?: number;
  units?: "metric" | "imperial";
  title?: string;
}

function weekdayShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
}

export const weather: WidgetModule = {
  displayName: "Weather",
  validate(cfg) {
    if (typeof cfg.lat !== "number" || typeof cfg.lon !== "number")
      return "missing numeric `lat`/`lon`";
    return null;
  },
  render(cfgIn) {
    const cfg = cfgIn as WeatherConfig;
    const stream = weatherStream({
      lat: cfg.lat,
      lon: cfg.lon,
      days: cfg.days ?? 3,
      units: cfg.units ?? "metric",
    });
    const unitLabel = (cfg.units ?? "metric") === "imperial" ? "°F" : "°C";

    const current = (
      <box orientation={Gtk.Orientation.HORIZONTAL} cssClasses={["weather__now"]} spacing={14}>
        <label
          cssClasses={["weather__glyph"]}
          label={bind(stream).as((w) => weatherSymbol(w.code))}
        />
        <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
          <label
            cssClasses={["num-display"]}
            halign={Gtk.Align.START}
            label={bind(stream).as((w) => `${Math.round(w.temp)}${unitLabel}`)}
          />
          <label
            cssClasses={["muted"]}
            halign={Gtk.Align.START}
            label={bind(stream).as((w: WeatherSnapshot) =>
              w.available
                ? `${weatherDescription(w.code)} · feels ${Math.round(w.apparent)}${unitLabel}`
                : "offline — cannot fetch weather",
            )}
          />
        </box>
      </box>
    );

    const forecast = (
      <box orientation={Gtk.Orientation.HORIZONTAL} cssClasses={["weather__forecast"]} spacing={14}>
        {bind(stream).as((w) => {
          const rest = w.days.slice(1); // skip today (shown above)
          return rest.map((d) => (
            <box
              cssClasses={["weather__day"]}
              orientation={Gtk.Orientation.VERTICAL}
              halign={Gtk.Align.CENTER}
              hexpand
            >
              <label cssClasses={["label"]} label={weekdayShort(d.date)} />
              <label cssClasses={["weather__glyph-small"]} label={weatherSymbol(d.code)} />
              <label
                cssClasses={["num"]}
                label={`${Math.round(d.tMax)} / ${Math.round(d.tMin)}`}
              />
            </box>
          )) as Gtk.Widget[];
        })}
      </box>
    );

    return (
      <Panel title={cfg.title ?? "weather"} extraClass="panel--weather">
        <box orientation={Gtk.Orientation.VERTICAL} spacing={14}>
          {current}
          {forecast}
        </box>
      </Panel>
    );
  },
};
