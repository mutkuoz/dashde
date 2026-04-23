import { Gtk } from "ags/gtk4";
import { bind } from "../lib/reactive";
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
          <box
            orientation={Gtk.Orientation.HORIZONTAL}
            spacing={6}
            halign={Gtk.Align.START}
            cssClasses={["media__controls"]}
          >
            <button cssClasses={["btn", "btn--icon"]} onClicked={() => playerctl("previous")}>
              <image iconName="media-skip-backward-symbolic" pixelSize={18} />
            </button>
            <button
              cssClasses={["btn", "btn--icon", "btn--primary"]}
              onClicked={() => playerctl("play-pause")}
            >
              <image
                iconName={bind(media).as((m) =>
                  m.status === "Playing"
                    ? "media-playback-pause-symbolic"
                    : "media-playback-start-symbolic",
                )}
                pixelSize={18}
              />
            </button>
            <button cssClasses={["btn", "btn--icon"]} onClicked={() => playerctl("next")}>
              <image iconName="media-skip-forward-symbolic" pixelSize={18} />
            </button>
          </box>
        </box>
      </Panel>
    );
  },
};
