# Architecture

Three layers, two rules.

## The layers

```
                     ┌────────────────────────┐
                     │       config.yaml       │
                     └─────────────┬──────────┘
                                   │  monitorFile + yaml parse
                                   ▼
               ┌──────────────────────────────────────┐
               │    config: Variable<DashboardConfig>  │
               └──────────────┬─────────────┬─────────┘
                              │             │
            layer:            │             │            layer:
            render            ▼             ▼            theme
                  ┌──────────────────┐  ┌──────────────────┐
                  │   renderLayout   │  │   applyTheme     │
                  │  (lib/layout)    │  │  (lib/theme)     │
                  └──────────┬───────┘  └─────────┬────────┘
                             │                    │
                             ▼                    ▼
                   widgets/* (render)     themes/*.scss
                             │
                             ▼
                        services/*
                        (poll loops,
                         shared state)
```

## services/

One file per data source. Each file:

- Declares its shape — a plain TypeScript interface for the snapshot.
- Owns its polling cadence, via `Variable<T>().poll(ms, sample)`.
- Exports a single `Variable<T>` — or a **factory** that caches
  sub-streams by key (see `tmux.ts`, `shell.ts`).
- Handles "source unavailable" by returning a sentinel (`available:
  false`, empty array, etc.) and using `warnOnce(...)` so missing
  binaries don't spam journalctl.

Services never import widgets. Services never import the config. A
service is a pipe; the caller decides how to render.

## widgets/

One file per widget type. Each file exports a `WidgetModule`:

```ts
interface WidgetModule {
  displayName: string
  render: (cfg: WidgetConfig, instanceId: string) => JSX.Element
  validate?: (cfg: WidgetConfig) => string | null
}
```

- `render` is called once per instance at construction time. It returns
  a GTK tree. All *reactive* pieces inside use `bind(someVar)` —
  GTK rebuilds only the bound subtree on change.
- `validate` runs before render. Return `"missing foo"` and the layout
  engine renders an error cell without crashing.
- Widgets never hold singleton state. All state goes through an AGS
  `Variable` (so it's shared and disposable).

## lib/

Small, boring utilities:

- `config.ts` — YAML → `Variable<DashboardConfig>`, with a 300ms
  debounced file watcher.
- `layout.tsx` — Turns the 2D-array-of-IDs into a `Gtk.Grid`.
  Column spans come from the `layout_widths` lookup.
- `panel.tsx` — The card primitive. One file, the whole convention
  lives here (title + underline rule + optional right suffix).
- `primitives.tsx` — `Bar`, `StatRow`, helpers (`human(bytes)`,
  `percent(0..1)`).
- `registry.ts` — Type name → module. Trivial map.
- `boundary.tsx` — `safeRender(type, id, fn)`. Catches exceptions,
  renders a muted error card.
- `fs.ts` — Thin wrappers over `readFile`/`writeFile` with `~`
  expansion and file watching.
- `theme.ts` — Three static imports, `App.apply_css` on change.
- `paths.ts` — XDG paths only. No "~/" strings in business logic.
- `logger.ts` — Tagged, with `warnOnce` for sources that fail every
  poll.

## Hot reload — how it actually works

1. `monitorFile('~/.config/dashboard/config.yaml', …)` fires on save.
2. Debounce 300 ms to coalesce editor multi-writes.
3. Re-read + re-parse. If YAML is broken → log, keep previous config.
4. `config.set(nextConfig)` → every `bind(config)` re-evaluates.
5. `applyTheme(next.theme)` — only if the theme name changed.
6. `renderLayout(next)` — emits a new tree; GTK reconciles.

No window creation, no process restart. Total latency on my laptop:
~80 ms from `:w` in neovim to rendered.

## Rules (the two)

1. **Services poll, widgets bind.** A widget that shells out is a bug.
   If your data needs to be live, it lives in `services/`.
2. **Fail muted, stay up.** A crashed widget → error cell. A missing
   binary → "unavailable" text. A broken YAML edit → previous config
   kept, error logged. The dashboard does not go down.

## Why AGS v2?

Because the JSX + `Variable.bind()` model turns the painful parts of
building a GTK UI into the fun parts. Tree-diffing, reactive rebinding,
and CSS theming are first-class. It also ships `gtk4-layer-shell`
bindings so our layer-shell surface is one prop.

AGS v1 would work — the architecture here would port with only the
imports changing. If you're stuck on an old distro, check the `v1`
branch (if it exists; not guaranteed).

## File layout

```
dashde/
├─ app.tsx                  # entry — 50 lines
├─ lib/                     # framework utilities
│  ├─ config.ts
│  ├─ layout.tsx
│  ├─ theme.ts
│  ├─ panel.tsx
│  ├─ primitives.tsx
│  ├─ registry.ts
│  ├─ boundary.tsx
│  ├─ fs.ts
│  ├─ paths.ts
│  └─ logger.ts
├─ services/                # one file per data source
├─ widgets/                 # one file per widget type
├─ themes/
│  ├─ _base.scss            # shared structural rules
│  └─ {name}.scss           # per-theme palette + font overrides
└─ config/default.yaml
```
