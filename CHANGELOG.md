# Changelog

All notable changes to dashde will be documented here. This project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once
it exits alpha.

## [Unreleased]

## [0.1.0] — initial alpha

### Added

- Core framework (`lib/`): YAML config loader, hot-reload watcher, layout
  engine, theme registry, widget registry, panel primitive, error
  boundary.
- Thirteen services covering CPU, memory, GPU, disk, battery, sensors,
  Wi-Fi, bandwidth, ping, Tailscale, public IP, tmux, shell, weather,
  media, and time.
- Twenty-one widgets including:
  - `greeting`, `clock`
  - `machine` (combined) + `cpu`, `memory`, `gpu`, `disk`, `battery` (individual)
  - `connection` (combined) + `wifi`, `bandwidth`, `ping`, `tailscale`, `public_ip`
  - `sensors`, `tasks`, `notes`, `tmux`, `shell_output`, `journalctl`
  - `weather`, `calendar`, `pomodoro`, `media`, `quick_launch`
- Three themes: `luxury-journal` (default), `cyber-hud`, `minimal-mono`.
- ANSI SGR parser for the `tmux` widget (minimal — colors, bold, italic, underline).
- `install.sh` for Arch / Fedora / Debian / Void / NixOS with optional
  Hyprland autostart.
- Full docs: README, CONTRIBUTING, architecture, widgets, themes, issue
  templates, PR template, CI (typecheck + format).
