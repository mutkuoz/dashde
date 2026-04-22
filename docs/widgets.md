# Widget reference

Every widget takes a `type` and a unique `id`. The `id` is whatever you
want — dashde only uses it to resolve references from `layout:`.

```yaml
widgets:
  <id>:
    type: <widget type>
    <options>: …
```

All widgets accept an optional `title:` override. When omitted, each
widget uses its default ("machine", "connection", "today's tasks", …).

---

## time & presence

### `greeting`

Adaptive greeting in the theme's display font.

```yaml
name: Utku
```

### `clock`

```yaml
format: "24h"        # "24h" | "12h"
show_period: true    # "in the evening" line
show_date: true      # "friday, 23 april" line
```

### `calendar`

Month grid; today is highlighted.

```yaml
week_starts_on: monday   # "monday" | "sunday"
```

### `pomodoro`

Focus/break timer; state persists across reloads at
`~/.local/share/dashboard/pomodoro.json`.

```yaml
focus_min: 25
break_min: 5
rounds: 4
```

---

## system

### `machine`

One panel, any subset of bars in one card.

```yaml
show: [cpu, memory, gpu, disk, battery]
```

### `cpu` · `memory` · `gpu` · `disk` · `battery`

Individual single-bar panels. No config beyond `title:`.

- `cpu` reads `/proc/stat` every 1 s.
- `memory` reads `/proc/meminfo` every 1 s.
- `gpu` runs `nvidia-smi` every 2 s; muted if `nvidia-smi` is missing.
- `disk` runs `df -B1 --output=used,size /` every 30 s.
- `battery` reads `/sys/class/power_supply/BAT0…BAT2` every 10 s; muted on desktops.

### `sensors`

Reads `sensors -j`. Provide a `show` list of substrings to filter chips
and labels; omit to show everything.

```yaml
show: [Tctl, Tccd1, fan1]
```

---

## network

### `connection`

One panel combining any of:

```yaml
show: [wifi, speed, ping, tailscale, vpn_ip, public_ip]
```

### `wifi` · `bandwidth` · `ping` · `tailscale` · `public_ip`

Individual panels. Each is a single-source reading with no options.

---

## work

### `tasks`

Checklist backed by a markdown file. Lines matching `- [ ]` or `- [x]`
become clickable tasks.

```yaml
file: ~/notes/tasks.md
show_done: true
```

### `notes`

Editable text pane with debounced (500 ms) autosave.

```yaml
file: ~/notes/scratch.md
editable: true
```

### `tmux`

Periodic `tmux capture-pane`. Parses basic ANSI SGR (colors,
bold/italic/underline). Autoscrolls to bottom on update. Click runs
`on_click` if set — ideal for `kitty tmux attach -t …`.

```yaml
target: research:0          # session:window or session:window.pane
lines: 14                   # -1 = full pane height
refresh_ms: 2000
parse_ansi: true
mono_font: "JetBrains Mono"
font_size: 12
on_click: "kitty tmux attach -t research"
```

### `shell_output`

Universal escape hatch. Runs any shell command on a timer.

```yaml
command: 'docker ps --format "{{.Names}}\t{{.Status}}"'
refresh_ms: 5000
lines: 10
parse_ansi: false
mono_font: "JetBrains Mono"
font_size: 12
on_click: "kitty"
```

### `journalctl`

Alias for `shell_output`. Provide your own `command:` —
dashde doesn't assume the unit.

```yaml
type: journalctl
command: "journalctl -u nginx -n 20 --no-pager"
refresh_ms: 10000
lines: 20
parse_ansi: false
```

---

## tools

### `quick_launch`

Icon grid; click to run.

```yaml
columns: 3
items:
  - { icon: folder,   label: files, command: thunar }
  - { icon: globe,    label: web,   command: firefox }
  - { icon: terminal, label: term,  command: kitty }
  - { icon: /path/to/icon.svg, label: custom, command: "cmd args" }
```

Built-in icon names resolve to unicode glyphs: `folder`, `globe`,
`terminal`, `code`, `mail`, `settings`, `music`, `camera`, `search`,
`file`, `calendar`, `heart`, `star`, `bookmark`, `book`, `image`,
`link`, `power`, `lock`, `moon`, `sun`, `cloud`. Provide an absolute
path for any SVG/PNG you want to load directly.

---

## environment

### `weather`

Open-meteo. No API key.

```yaml
lat: 41.0082
lon: 28.9784
days: 4
units: metric        # "metric" | "imperial"
```

---

## media

### `media`

Reads `playerctl`. Shows title/artist/album and exposes ⏮ ⏯ ⏭ buttons.
No options; it follows the active player.

---

## Window sizing

If you don't want a fullscreen layer-shell surface, override at the top
of your config:

```yaml
window:
  layer: top              # background | bottom | top | overlay
  anchor: [top, left]     # omit for all-4 (fullscreen)
```

Setting `layer: top` makes the dashboard a regular(ish) window — useful
for testing.
