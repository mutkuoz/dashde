# Dashboard — build spec

## Vision

A personal desktop dashboard that replaces the default wallpaper with a living, customizable grid of widgets. Aesthetic: a fine leather-bound journal — parchment background, oxblood ink, handwritten labels, classical serif numerals, one flourish of cursive for the greeting. All data pulled live from local sources at cheap intervals. Fully user-configurable via a YAML file — which widgets, where, and their individual options. Extending the catalog with a new widget type takes one file.

## Target environment

- **OS**: Fedora Linux (HP Omen laptop), x11.
- **Compositor**: Hyprland. Dashboard runs as a layer-shell surface, `exclusive_zone=0`, anchored to the whole screen.
- **Framework**: **AGS v2 (Astal)**, GTK4, TypeScript/TSX. If AGS v2 has a blocking gap, fall back to AGS v1, but prefer v2.
- **Build**: `ags run` for dev, `ags bundle` for distribution.
- **Package manager**: pnpm or npm, whichever the AGS template ships with.

Don't assume Hyprland-specific APIs beyond layer-shell; the dashboard should also work if launched in a regular window for testing.

## Architecture — three clean layers

### `services/` — data layer

One file per source. Each service owns its polling cadence and `Utils.subprocess` calls. Services expose one or more `Variable<T>` (AGS reactive store). Widgets never poll, never shell out — they only `bind()`.

Shape:

```ts
// services/cpu.ts
export const cpuUsage = Variable(0, {
  poll: [1000, async () => computeCpuUsage()],
});
```

### `widgets/` — render layer

Pure render. Each widget module exports:

```ts
export const displayName = 'Machine'
export const configSchema = { ... }        // zod or plain object
export function render(config, services) { return <box>...</box> }
```

Widget registry in `widgets/index.ts` maps type name → module. Adding a new type is: create file, add one import + registry entry.

### `config/` — user configuration

`~/.config/dashboard/config.yaml` holds layout + widget instances + theme selection. File watcher on this path triggers hot-reload — **editing the YAML live-updates the dashboard without `ags quit`**.

### `themes/` — SCSS palettes

One file per theme, selected by name in config. Each theme defines the same set of CSS variables so widgets are palette-agnostic.

### Layout model

A 2D array of widget-instance IDs:

```yaml
layout:
  - [greeting, clock]
  - [machine, connection]
  - [tasks, notes]
  - [tmux:orchestrator, quick-launch]
```

Rules:
- Rows have any number of cells.
- Cells with the same row index share a row.
- Cell widths default to equal; override per-row with `layout_widths: [2, 1]` to get a 2:1 ratio.
- `null` or empty string = spacer.
- A widget ID not found in `widgets:` raises a clear error at load time (list all missing IDs, don't crash).

## Aesthetic — default theme `luxury-journal`

### Palette

| token | hex | usage |
|---|---|---|
| `--bg` | `#ece0c8` | outer parchment |
| `--panel-bg` | `#f2e8d3` | panels |
| `--panel-border` | `rgba(114, 37, 41, 0.15)` | 1px hairline |
| `--ink-dark` | `#2d1810` | primary text |
| `--ink-medium` | `#6b4e36` | secondary text |
| `--burgundy` | `#722529` | labels, accents, primary bars |
| `--gold` | `#9e7b3a` | warning / high-usage bars |
| `--green` | `#4a6b3a` | good state (connected, running) |
| `--track` | `rgba(61, 40, 23, 0.12)` | bar tracks |

### Fonts (must be installed system-wide)

```
yay -S ttf-parisienne ttf-caveat ttf-cormorant
# or drop the .ttf files in ~/.local/share/fonts/ and fc-cache -fv
```

- **Parisienne 400** — greeting only (one use, big, burgundy, 44px).
- **Caveat 400** — all labels and body (handwritten feel).
- **Cormorant Garamond 500** — numbers (clock, percentages, figures).

Typography rules:
- All lowercase for labels. "today's tasks", not "Today's Tasks" or "TODAY'S TASKS".
- Section label: 19px Caveat, color `--burgundy`, with a 26px 1px burgundy underline 3px below.
- Body: 15px Caveat, line-height 1.7.
- Numbers: 17px Cormorant 500.
- Greeting: 44px Parisienne, `--burgundy`.
- Header ornament: a thin burgundy line across the width with a centered `◆` glyph, 22px of vertical breathing room above and below.

### Spacing

- Outer dashboard padding: 28px 26px
- Panel padding: 14px 16px 16px
- Panel border: 1px solid `--panel-border`, radius 4px
- Grid gap: 14px

### Other themes to include as alternates

- `cyber-hud` — deep navy + cyan (from first mockup iteration).
- `minimal-mono` — stark white + black, single-weight sans.

Theme swap is just `theme: cyber-hud` in config; same widget layout renders with new palette.

## Widget catalog

Every widget is a first-class module. IDs in `layout` reference **instances**, not types — so you can have two `tmux` widgets showing different sessions, each with its own ID.

### Time & presence

- **`greeting`** — adaptive greeting in Parisienne cursive. Config: `name`, `custom_phrases?`.
- **`clock`** — large HH:MM + period ("in the evening"). Config: `format: '24h'|'12h'`, `show_period`, `show_date`.
- **`calendar`** — monthly mini-grid, today highlighted, optional event dots from a local `.ics` file. Config: `ics_path?`.
- **`upcoming`** — next N calendar events. Config: `count`, `ics_path`.
- **`pomodoro`** — focus/break timer, persists across reloads. Config: `focus_min`, `break_min`, `rounds`.

### System

- **`machine`** — combined card: selectable stat bars in one panel. Config: `show: [cpu, memory, gpu, disk, battery]`.
- **`cpu`**, **`memory`**, **`gpu`**, **`disk`**, **`battery`** — individual versions of the above for finer layout control.
- **`sensors`** — temps and fan speeds from `lm_sensors`. Config: `show: ['cpu-temp', 'gpu-temp', 'fan1']`.
- **`processes`** — top N by CPU or memory. Config: `sort_by: 'cpu'|'mem'`, `count`.

### Network

- **`connection`** — combined card. Config: `show: [wifi, speed, ping, tailscale, vpn_ip]`.
- **`wifi`**, **`bandwidth`**, **`ping`**, **`tailscale`**, **`public_ip`** — individual versions.
- **`bandwidth`** optionally includes a sparkline. Config: `show_sparkline`, `history_seconds: 60`.

### Work — including the key custom

- **`tasks`** — checklist backed by a plain markdown or todo.txt file. Click toggles. Config: `file` (default `~/notes/tasks.md`), `show_done: bool`.
- **`notes`** — persistent scratch pad. Edits save to file. Config: `file`, `line_count`.
- **`git_status`** — for each configured repo: branch + dirty flag + ahead/behind. Config: `repos: [{path, label}]`.
- **`tmux`** — **priority widget.** Periodically captures a tmux pane and renders it as a scrolling monospace log inside a panel.

  ```yaml
  tmux:orchestrator:
    type: tmux
    target: 'research:0'        # session:window or session:window.pane
    lines: 14                   # -1 = full pane height
    refresh_ms: 2000
    parse_ansi: true            # render basic SGR colors
    mono_font: 'JetBrains Mono'
    font_size: 12
    on_click: 'kitty tmux attach -t research'  # double-click opens pane in a real terminal
  ```

  Implementation:
  - Poll via `tmux capture-pane -p -e -S -${lines} -t ${target}`.
  - If `parse_ansi`, map SGR escape sequences to colored `<span>` (support at minimum: 30–37, 90–97, reset, bold). Use a small parser — no full terminal emulation.
  - Auto-scroll to bottom on each update.
  - If the target doesn't exist, show "session not found" in `--ink-medium` — don't spam errors to journalctl.
  - On click, run `on_click` shell command via `Utils.execAsync`.

- **`shell_output`** — **universal escape hatch.** Run any command on an interval, render stdout. Subsumes `journalctl`, `docker ps`, `git status`, etc. for users who don't want a dedicated widget.

  ```yaml
  containers:
    type: shell_output
    command: 'docker ps --format "{{.Names}}\t{{.Status}}"'
    refresh_ms: 5000
    lines: 10
    parse_ansi: false
  ```

- **`journalctl`** — preset of `shell_output` for systemd units. Config: `unit`, `lines`.

### Tools

- **`quick_launch`** — icon grid. Each tile is `{icon, label, command}`.

  ```yaml
  quick-launch:
    type: quick_launch
    columns: 3
    items:
      - { icon: folder,   label: files, command: thunar }
      - { icon: globe,    label: web,   command: firefox }
      - { icon: terminal, label: term,  command: kitty }
      - { icon: code,     label: code,  command: 'code ~/code' }
      - { icon: mail,     label: mail,  command: thunderbird }
      - { icon: settings, label: prefs, command: 'kitty -e nvim ~/.config/dashboard/config.yaml' }
  ```

  Icons: resolve `icon` as either a Lucide name (bundle lucide SVGs) or a path to an SVG file. Stroke color = `--burgundy` in the default theme (inherits from the panel, so theme swap works).

- **`clipboard`** — recent entries via `cliphist list`, click restores. Config: `count`.
- **`shortcuts_cheatsheet`** — static keyboard cheat sheet. Config: `shortcuts: [{keys, desc}]`.

### Environment

- **`weather`** — current + 3-day forecast via **open-meteo** (no API key needed). Config: `lat`, `lon`, `days`, `units: 'metric'|'imperial'`.
- **`sun`** — sunrise/sunset. Computed from lat/lon.
- **`moon`** — phase + illumination.

### Media

- **`media`** — `playerctl` title/artist + play/pause/next/prev.
- **`volume`**, **`mic`** — sliders.

## Data source reference

All local, cheap, single-shot — no long-running daemons.

| service | source | cadence |
|---|---|---|
| cpu | `/proc/stat`, delta across ticks | 1 s |
| memory | `/proc/meminfo` (MemTotal − MemAvailable) | 1 s |
| gpu | `nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits` | 2 s |
| disk | `df -B1 --output=used,size /` | 30 s |
| battery | `/sys/class/power_supply/BAT0/{capacity,status,energy_now,power_now}` | 10 s |
| bandwidth | `/proc/net/dev`, delta bytes | 1 s |
| wifi | `nmcli -t -f active,ssid,signal dev wifi \| grep '^yes'` | 10 s |
| ping | `ping -c1 -W1 ${host}` | 30 s |
| tailscale | `tailscale status --json` | 15 s |
| public_ip | `curl -s https://ipinfo.io/ip` | 10 min |
| sensors | `sensors -j` | 5 s |
| tmux | `tmux capture-pane -p -e -S -${N} -t ${target}` | per-widget |
| shell_output | user command | per-widget |
| weather | `https://api.open-meteo.com/v1/forecast?...` | 15 min |
| media | `playerctl metadata --format '{{json}}'` | 2 s |

If a source is unavailable (no NVIDIA GPU → `nvidia-smi` missing, no battery → laptop has no `/sys/class/power_supply/BAT0`), the corresponding widget renders a muted "unavailable" state. It does not throw or kill the dashboard.

## Configuration example (ship as `config/default.yaml`)

```yaml
theme: luxury-journal

greeting:
  name: Utku

layout_widths:
  default: [1, 1]

layout:
  - [greeting, clock]
  - [machine, connection]
  - [tasks, notes]
  - [tmux:orchestrator, quick-launch]

widgets:
  greeting: { type: greeting, name: Utku }
  clock:    { type: clock, format: '24h', show_period: true }

  machine:
    type: machine
    show: [cpu, memory, gpu, disk, battery]

  connection:
    type: connection
    show: [wifi, speed, ping, tailscale, vpn_ip]

  tasks:
    type: tasks
    file: ~/notes/tasks.md

  notes:
    type: notes
    file: ~/notes/scratch.md
    line_count: 6

  tmux:orchestrator:
    type: tmux
    target: research:0
    lines: 14
    refresh_ms: 2000
    parse_ansi: true
    on_click: 'kitty tmux attach -t research'

  quick-launch:
    type: quick_launch
    columns: 3
    items:
      - { icon: folder,   label: files, command: thunar }
      - { icon: globe,    label: web,   command: firefox }
      - { icon: terminal, label: term,  command: kitty }
      - { icon: code,     label: code,  command: 'code ~/code' }
      - { icon: mail,     label: mail,  command: thunderbird }
      - { icon: settings, label: prefs, command: 'kitty -e nvim ~/.config/dashboard/config.yaml' }
```

## MVP order

Ship in this sequence — each step must produce a dashboard that boots and renders:

1. **Scaffold**: AGS v2 project, config loader, theme loader, hot-reload, layout engine, empty-panel placeholders. Boots showing grid of labeled empty panels.
2. **`greeting` + `clock`** (header). Live time, adaptive greeting.
3. **`machine`** (one card, all 5 stats). Real `/proc` + `/sys` polling.
4. **`connection`** (wifi + speed + ping + tailscale).
5. **`tasks`, `notes`** (file-backed, click-to-toggle for tasks).
6. **`quick_launch`**.
7. **`tmux`** — full implementation with ANSI parsing.
8. **`weather`**.
9. **`shell_output`** as the universal extension.

Everything beyond step 9 is phase 2.

## Non-goals

- Windows/macOS. Linux only.
- External sync of tasks/notes. Plain files; user handles sync with syncthing/git/whatever.
- A GUI settings editor. YAML is the editor.
- Sub-second updates for anything but clock seconds.
- A widget marketplace or plugin loader. New widgets = pull request.
- Accessibility features beyond readable contrast (can revisit).

## Acceptance criteria

- `git clone && pnpm install && ./install.sh && ags run` yields a working dashboard on first boot.
- Default config visually matches the aesthetic mockup (screenshot in `docs/mockup.png` for reference).
- All MVP widgets show **live, correct data** verified by cross-checking with `top`, `nmcli`, `tmux list-sessions`, etc.
- Saving `config.yaml` reloads the dashboard within 500ms, no restart.
- Swapping `theme:` in config swaps the palette without touching any widget code.
- A user can add a new widget type by creating one `widgets/my_widget.tsx` file, registering it in `widgets/index.ts`, and referencing it in config — no core changes required.
- No widget crash kills the dashboard. Missing data sources render a muted "unavailable" state.

## Deliverables

```
dashboard/
├── config.ts                    # entry
├── services/
│   ├── cpu.ts
│   ├── memory.ts
│   ├── gpu.ts
│   ├── disk.ts
│   ├── battery.ts
│   ├── network.ts               # wifi + speed + ping
│   ├── tailscale.ts
│   ├── tmux.ts
│   ├── shell.ts                 # generic command runner
│   ├── weather.ts
│   └── ...
├── widgets/
│   ├── index.ts                 # registry
│   ├── greeting.tsx
│   ├── clock.tsx
│   ├── machine.tsx
│   ├── connection.tsx
│   ├── tasks.tsx
│   ├── notes.tsx
│   ├── tmux.tsx
│   ├── quick_launch.tsx
│   ├── shell_output.tsx
│   └── ...
├── themes/
│   ├── luxury-journal.scss
│   ├── cyber-hud.scss
│   └── minimal-mono.scss
├── config/
│   └── default.yaml
├── install.sh                   # installs fonts, symlinks config, adds Hyprland autostart
├── docs/
│   └── mockup.png
├── CONTRIBUTING.md              # "how to add a widget" in ≤50 lines
└── README.md                    # install + customize + screenshot
```

## Style notes for the AI building this

- Prefer small, obvious files over clever abstractions. A 40-line widget is better than a 12-line widget that requires reading three other files to understand.
- Every service file is self-contained: its types, its polling logic, its variable export — all in one file.
- No global state beyond AGS variables. No singletons.
- Comments only where the *why* isn't obvious from the code. Don't narrate what the code does.
- Error handling: log once to stderr, render muted state, keep going. Never crash the dashboard.
- Ship `install.sh` that works on a fresh Arch box — that's the test.
