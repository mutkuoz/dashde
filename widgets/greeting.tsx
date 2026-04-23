import { Gtk } from "ags/gtk4";
import { bind } from "../lib/reactive";
import type { WidgetConfig } from "../lib/config";
import type { WidgetModule } from "../lib/registry";
import { now, adaptiveGreeting, periodPhrase } from "../services/time";
import { Panel } from "../lib/panel";

interface GreetingConfig extends WidgetConfig {
  name?: string;
  custom_phrases?: Record<string, string[]>;
}

export const greeting: WidgetModule = {
  displayName: "Greeting",
  render(cfgIn) {
    const cfg = cfgIn as GreetingConfig;
    const name = cfg.name ?? "friend";
    return (
      <Panel extraClass="panel--greeting">
        <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
          <label
            cssClasses={["greeting"]}
            halign={Gtk.Align.START}
            label={bind(now).as((d) => adaptiveGreeting(d, name))}
          />
          <label
            cssClasses={["muted"]}
            halign={Gtk.Align.START}
            label={bind(now).as((d) => periodPhrase(d))}
          />
        </box>
      </Panel>
    );
  },
};
