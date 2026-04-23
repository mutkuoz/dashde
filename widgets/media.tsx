import { Gtk } from "ags/gtk4";
import { bind } from "../lib/reactive";
import type { WidgetConfig } from "../lib/config";
import type { WidgetModule } from "../lib/registry";
import { Panel } from "../lib/panel";
import { media, playerctl } from "../services/media";
import { iconPath } from "../lib/icons";

export const mediaWidget: WidgetModule = {
  displayName: "Media",
  render(cfgIn) {
    const cfg = cfgIn as WidgetConfig & { title?: string };
    return (
      <Panel title={cfg.title ?? "now playing"}>
        <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["media"]} spacing={10}>
          <label
            cssClasses={["media__title"]}
            halign={Gtk.Align.START}
            label={bind(media).as((m) => (m.available ? m.title || "—" : "no player running"))}
            ellipsize={3}
          />
          <label
            cssClasses={["muted"]}
            halign={Gtk.Align.START}
            label={bind(media).as((m) =>
              m.available ? [m.artist, m.album].filter(Boolean).join(" · ") : "",
            )}
            ellipsize={3}
          />
          <box
            orientation={Gtk.Orientation.HORIZONTAL}
            spacing={8}
            halign={Gtk.Align.START}
            cssClasses={["media__controls"]}
          >
            <button
              cssClasses={["btn", "btn--icon"]}
              onClicked={() => playerctl("previous")}
            >
              <image
                file={iconPath("skip-back")}
                pixelSize={18}
                cssClasses={["btn__icon"]}
              />
            </button>
            <button
              cssClasses={["btn", "btn--icon", "btn--primary"]}
              onClicked={() => playerctl("play-pause")}
            >
              <image
                file={bind(media).as((m) =>
                  iconPath(m.status === "Playing" ? "pause" : "play"),
                )}
                pixelSize={18}
                cssClasses={["btn__icon"]}
              />
            </button>
            <button
              cssClasses={["btn", "btn--icon"]}
              onClicked={() => playerctl("next")}
            >
              <image
                file={iconPath("skip-forward")}
                pixelSize={18}
                cssClasses={["btn__icon"]}
              />
            </button>
          </box>
        </box>
      </Panel>
    );
  },
};
