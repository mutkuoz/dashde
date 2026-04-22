import { Gtk } from "astal/gtk4";
import { bind } from "astal";
import type { WidgetConfig } from "../lib/config";
import type { WidgetModule } from "../lib/registry";
import { Panel } from "../lib/panel";
import { media, playerctl } from "../services/media";

export const mediaWidget: WidgetModule = {
  displayName: "Media",
  render(cfgIn) {
    const cfg = cfgIn as WidgetConfig & { title?: string };
    return (
      <Panel title={cfg.title ?? "now playing"}>
        <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["media"]} spacing={8}>
          <label
            cssClasses={["media__title"]}
            halign={Gtk.Align.START}
            label={bind(media).as((m) => (m.available ? m.title || "—" : "no player running"))}
          />
          <label
            cssClasses={["muted"]}
            halign={Gtk.Align.START}
            label={bind(media).as((m) =>
              m.available ? [m.artist, m.album].filter(Boolean).join(" · ") : "",
            )}
          />
          <box orientation={Gtk.Orientation.HORIZONTAL} spacing={6} halign={Gtk.Align.START}>
            <button cssClasses={["btn"]} onClicked={() => playerctl("previous")}>
              <label label="⏮" />
            </button>
            <button cssClasses={["btn", "btn--primary"]} onClicked={() => playerctl("play-pause")}>
              <label
                label={bind(media).as((m) => (m.status === "Playing" ? "⏸" : "⏵"))}
              />
            </button>
            <button cssClasses={["btn"]} onClicked={() => playerctl("next")}>
              <label label="⏭" />
            </button>
          </box>
        </box>
      </Panel>
    );
  },
};
