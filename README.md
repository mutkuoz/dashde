# DashDE

> **D**ash**D**esktop **E**nvironment — a living, configurable dashboard for
> Linux that pretends to be a DE so convincingly you forget it isn't one.
> Leather-bound journal by default — parchment, oxblood ink, handwritten
> labels. Swap the whole palette with one line of YAML.

<p align="center">
  <img src="docs/screenshots/hero.png" alt="DashDE — luxury-journal theme" width="900" />
  <br>
  <sub><em>default theme: <code>luxury-journal</code></em></sub>
</p>

<sub>(It's not *actually* a desktop environment — it's a layer-shell surface
that anchors behind your window stack. But between the widget grid, the
hot-reloaded YAML config, and the click-to-launch tiles, you can be
forgiven for treating it like one. The name is a joke about how little
separation there is these days between "dashboard" and "DE.")</sub>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-1e2735" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/runtime-AGS%20v2%20·%20GTK4-2d1810" alt="AGS v2 · GTK4">
  <img src="https://img.shields.io/badge/distro-linux-722529" alt="Linux">
  <img src="https://img.shields.io/badge/status-alpha-9e7b3a" alt="alpha">
</p>

---

## What it is

A layer-shell surface that sits behind your windows on Hyprland (or any
layer-shell Wayland compositor — Sway works too). Instead of a wallpaper,
you get a live grid of widgets: clock, machine stats, wifi, tailscale,
tasks, notes, tmux pane mirror, quick-launcher, weather, and any shell
command you care to paste in.

Every widget pulls from cheap local sources (/proc, /sys, nmcli, tmux,
playerctl, open-meteo for weather). Nothing runs as a daemon. Polling
cadences per source: 1–30s for live stats, 15m for weather, never for
things that don't change.

**Customization is a YAML file.** Edit it, save it, the dashboard
re-renders in ~300ms. No restart.

**Extension is one file.** Drop a `.tsx` in `widgets/`, add one line to
`widgets/index.ts`, reference it in your YAML. Done.

---

## Install

> [!WARNING]
> **Naming collision.** The `ags` you get from Fedora/Debian repos is
> **Adventure Game Studio** — a completely unrelated 2D game engine. This
> project needs **Aylur's GTK Shell v2** (a.k.a. Astal). If `ags --version`
> prints "Adventure Game Studio", remove that package first
> (`sudo dnf remove ags` / `sudo apt remove ags`) before installing the
> real AGS v2.

### tl;dr

```sh
git clone https://github.com/mutkuoz/dashde.git ~/code/dashde
cd ~/code/dashde
./install.sh
ags run .
```

`install.sh` will:

1. Install AGS v2, `dart-sass`, `lm_sensors`, NetworkManager, and JetBrains Mono via your package manager (Arch, Fedora, Debian, Void).
2. Download the three theme fonts (Parisienne, Caveat, Cormorant Garamond) + alternates (Rajdhani, Darker Grotesque) from Google Fonts into `~/.local/share/fonts` and refresh the fontconfig cache.
3. Symlink a starter `config.yaml` into `~/.config/dashboard/` (preserves yours if one exists).
4. Seed `~/notes/tasks.md` and `~/notes/scratch.md`.
5. Offer to add an `exec-once` line to your Hyprland config.

Flags: `--no-fonts`, `--no-hypr`, `--dry-run`. `./install.sh --help` prints the header.

### Fedora install

Fedora doesn't ship Aylur's GTK Shell v2. Two routes:

**A — Nix (no build, no sudo after one-time nix setup):**

```sh
curl -L https://nixos.org/nix/install | sh -s -- --daemon
# new shell, then from the repo:
nix run github:aylur/ags -- run .
```

**B — build AGS v2 from source:**

```sh
# Remove the game-engine that squats on the `ags` name
sudo dnf remove ags

# Build deps
sudo dnf install -y meson vala gjs dart-sass \
  gtk4-devel gtk4-layer-shell-devel libadwaita-devel \
  libsoup3-devel json-glib-devel wayland-protocols-devel \
  upower-devel gobject-introspection-devel

# Astal libraries (io + gtk4)
git clone https://github.com/aylur/astal.git ~/src/astal
cd ~/src/astal/lib/astal/io
meson setup --prefix=/usr --buildtype=release build && sudo meson install -C build
cd ../gtk4
meson setup --prefix=/usr --buildtype=release build && sudo meson install -C build

# AGS v2 CLI
cd ~/src && git clone https://github.com/aylur/ags.git
cd ags && sudo ./install.sh
ags --version    # should print 2.x, not "Adventure Game Studio"
```

Debian/Ubuntu: same shape — substitute the `libgtk-4-dev` / `libgtk4-layer-shell-dev` / `libadwaita-1-dev` / `libsoup-3.0-dev` / `libjson-glib-dev` / `libupower-glib-dev` / `libgirepository1.0-dev` / `valac` / `gjs` / `meson` / `sass` packages.

### manual

If you prefer not to run the `install.sh` helper for the non-AGS
dependencies:

| dependency | what for |
| --- | --- |
| [AGS v2 / aylurs-gtk-shell](https://aylur.github.io/ags/) | runtime (GTK4, layer-shell) |
| `dart-sass` | compiles theme SCSS at load |
| `lm_sensors` | temps/fan readings for the `sensors` widget |
| `NetworkManager` (`nmcli`) | Wi-Fi widget |
| `tmux` | tmux widget (only if used) |
| `playerctl` | media widget (only if used) |
| `nvidia-smi` | GPU widget (only if you have NVIDIA) |
| `tailscale` | tailscale widget (only if used) |
| `curl` | public-ip + weather |

Fonts come from Google Fonts — `Parisienne`, `Caveat`, `Cormorant Garamond`
are required for the default theme.

### a note on Wayland / Hyprland

dashde uses `gtk4-layer-shell` (bundled with AGS) so it anchors behind
your window stack like a wallpaper. It works on Hyprland, Sway, labwc,
niri, and any Wayland compositor with layer-shell support. **It does not
run on X11** — the spec mentions x11/Hyprland but Hyprland is
Wayland-only; if you're on X11 you'd need another dashboard project.

If you want to test without layer-shell (e.g., launch it in a floating
window for dev), set `window.layer: top` in your config and it'll behave
like a normal window.

---

## Configure

The config is one YAML file at `~/.config/dashboard/config.yaml`:

```yaml
theme: luxury-journal      # or: cyber-hud | minimal-mono

layout_widths:
  default: [1, 1]
  "0": [2, 1]              # optional: row 0 gets a 2:1 ratio

layout:
  - [greeting, clock]
  - [machine, connection]
  - [tasks, notes]
  - [tmux:orchestrator, quick-launch]

widgets:
  machine: { type: machine, show: [cpu, memory, gpu, disk, battery] }
  # ...
```

**Rules of the road:**

- Each cell in `layout` references a **widget ID** from `widgets:`.
- The ID is arbitrary — `tmux:orchestrator`, `work-tasks`, `pixel-ping`. The *type* is what matters.
- `null` or `""` in a row renders a spacer.
- An ID in the layout that isn't in `widgets:` logs a warning and renders a red error cell — it **won't crash the dashboard**.
- `layout_widths` uses column-spans against `Gtk.Grid`; keys are row indices as strings or `default`.

See [`config/default.yaml`](config/default.yaml) for a fully commented example.

---

## Widgets

Every widget is self-contained. You reference it in YAML by setting `type:`.

| type | shows | key config |
| --- | --- | --- |
| `greeting` | adaptive greeting in Parisienne | `name` |
| `clock` | HH:MM + period + date | `format: 24h\|12h`, `show_period`, `show_date` |
| `machine` | combined CPU · MEM · GPU · DISK · BAT bars | `show: [...]` |
| `cpu` `memory` `gpu` `disk` `battery` | individual bars | — |
| `connection` | combined Wi-Fi · speed · ping · tailscale · IP | `show: [...]` |
| `wifi` `bandwidth` `ping` `tailscale` `public_ip` | individual rows | — |
| `sensors` | lm\_sensors temps/fans | `show: [label substrings]` |
| `tasks` | markdown checklist, click toggles | `file`, `show_done` |
| `notes` | editable scratch pad, debounced autosave | `file`, `editable` |
| `tmux` | periodic `capture-pane` with ANSI colors | `target`, `lines`, `refresh_ms`, `parse_ansi`, `on_click` |
| `shell_output` | any command, stdout, on a timer | `command`, `refresh_ms`, `lines`, `parse_ansi` |
| `journalctl` | alias for `shell_output` | `command: journalctl -u …` |
| `weather` | open-meteo: current + forecast | `lat`, `lon`, `days`, `units` |
| `calendar` | month grid with today highlighted | `week_starts_on` |
| `pomodoro` | focus/break timer, survives reload | `focus_min`, `break_min`, `rounds` |
| `media` | playerctl title + transport | — |
| `quick_launch` | icon grid, click to run | `columns`, `items: [{icon, label, command}]` |

Full reference with all options in [`docs/widgets.md`](docs/widgets.md).

---

## Themes

Three ship by default. Each is one SCSS file that declares CSS custom
properties and inherits the structural rules from `_base.scss`.

| `theme:` | mood | fonts |
| --- | --- | --- |
| `luxury-journal` (default) | parchment · oxblood · handwritten | Parisienne, Caveat, Cormorant Garamond |
| `cyber-hud` | deep navy · cyan · neon bloom | Rajdhani, JetBrains Mono |
| `minimal-mono` | newsprint · pure black · no ornament | Darker Grotesque, JetBrains Mono |

Swap with one YAML line. Writing a fourth: copy any existing `themes/*.scss`,
rename it, change the variables, add an import in `lib/theme.ts`. More in
[`docs/themes.md`](docs/themes.md).

---

## Adding a widget type

In short: **one file, one line.** The full tour is in [CONTRIBUTING.md](CONTRIBUTING.md).

```tsx
// widgets/my_widget.tsx
import { Gtk } from "astal/gtk4"
import { bind } from "astal"
import { Panel } from "../lib/panel"
import { StatRow } from "../lib/primitives"
import { cpuUsage } from "../services/cpu"
import type { WidgetModule } from "../lib/registry"

export const myWidget: WidgetModule = {
  displayName: "My Widget",
  render: (cfg) => (
    <Panel title="cpu, sorta">
      <StatRow label="busy" value={bind(cpuUsage).as(v => `${Math.round(v * 100)}%`)} />
    </Panel>
  ),
}
```

```ts
// widgets/index.ts
import { myWidget } from "./my_widget"
register("my_widget", myWidget)
```

```yaml
# ~/.config/dashboard/config.yaml
widgets:
  mine:
    type: my_widget
```

Save the YAML. Widget appears in ~300ms.

---

## Architecture

```
app.tsx                 # entry — registers widgets, inits config, applies theme, creates windows
lib/
├── config.ts           # yaml load, debounced watcher, reactive Variable
├── theme.ts            # theme name → CSS string, App.apply_css on change
├── layout.tsx          # 2D-array-of-IDs → Gtk.Grid with widths via col_spans
├── panel.tsx           # <Panel> + <Ornament> primitives
├── primitives.tsx      # <Bar>, <StatRow>, <Divider>, human(), percent()
├── registry.ts         # type name → WidgetModule
├── boundary.tsx        # safeRender wrapper: a crashing widget never kills the grid
├── fs.ts               # read/write/watch with ~-expansion
├── paths.ts            # XDG paths
└── logger.ts           # tagged, warn-once stderr
services/               # one file per data source — all polled at their own cadence
widgets/                # one file per widget type — pure render
themes/                 # SCSS, one per palette
config/default.yaml     # starter config
install.sh              # distro-aware installer
```

Design principles the code keeps honest:

- **Services poll, widgets `bind`.** No widget shells out. No widget holds state beyond its own UI. Crash a widget and the rest keeps running.
- **One file per thing.** Open a widget — you can read the whole thing. Open a service — same. If a widget needs two files, you have a naming problem.
- **Fail muted, not loud.** `nvidia-smi` missing, no battery, tmux session gone — the widget renders a faded "unavailable" and moves on. Nothing bubbles to journalctl except once at startup.
- **Hot reload is a feature, not a hack.** The config is a reactive Variable; every bind re-evaluates on change. No window recreation, no restart.

More in [`docs/architecture.md`](docs/architecture.md).

---

## Development

```sh
pnpm install        # or: npm install
ags run .           # live-reloaded dev
pnpm typecheck      # or: npm run typecheck
pnpm format         # prettier
ags bundle .        # standalone binary
```

### testing a widget without layer-shell

Set `window.layer: top` in your config; the dashboard becomes a floating
window (still reacts to edits). Move it, screenshot it, ship it.

### what uses what

- TypeScript, strict, with the AGS v2 JSX runtime (`react-jsx` + `astal/gtk4`).
- No npm dependencies at runtime beyond [`yaml`](https://eemeli.org/yaml/).
- SCSS for themes, compiled by AGS at load via `dart-sass`.

---

## Contributing

Widgets are small. Fonts are welcome. PRs for new themes are encouraged —
please keep the 26px-hairline-under-section-label convention intact so
swapping themes doesn't scramble layout.

Ground rules: **no widget may call a subprocess directly.** If your widget
needs data, put a service file in `services/` and `bind()` it.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full walkthrough and
[code of conduct](CODE_OF_CONDUCT.md).

---

## License

MIT — see [LICENSE](LICENSE).

Parisienne · Caveat · Cormorant Garamond · Rajdhani · Darker Grotesque are
all SIL Open Font License 1.1 via [Google Fonts](https://fonts.google.com/).
