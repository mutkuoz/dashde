# Contributing to dashde

Everything worth contributing to dashde is small. If a PR touches more
than five files (theme changes aside), it should probably be two PRs.

## Add a widget type in under 50 lines

A widget is a module that exports a `WidgetModule`: a display name and a
`render(config, id)` function. Optionally a `validate(config)` that
returns `null` or an error string.

### 1. Find or add a service

Widgets never shell out. They never poll. They call `bind(someVar)` on a
reactive `Variable` exposed by a service. If the data you need already
exists in `services/`, skip to step 2.

If not, add one:

```ts
// services/uptime.ts
import { Variable } from "astal"
import { readText } from "../lib/fs"

function sample(): number {
  const raw = readText("/proc/uptime")
  if (!raw) return 0
  return Number(raw.split(" ")[0] ?? 0)
}

export const uptime = Variable<number>(0).poll(5000, sample)
```

A service file owns its polling cadence, its types, and its single
exported `Variable`. If multiple polling frequencies are meaningful
(e.g. tmux per-pane), export a **factory** that caches by key — see
`services/tmux.ts` or `services/shell.ts`.

### 2. Write the widget

```tsx
// widgets/uptime.tsx
import type { WidgetConfig } from "../lib/config"
import type { WidgetModule } from "../lib/registry"
import { Panel } from "../lib/panel"
import { StatRow } from "../lib/primitives"
import { bind } from "astal"
import { uptime } from "../services/uptime"

interface UptimeConfig extends WidgetConfig {
  title?: string
}

export const uptimeWidget: WidgetModule = {
  displayName: "Uptime",
  render(cfgIn) {
    const cfg = cfgIn as UptimeConfig
    return (
      <Panel title={cfg.title ?? "uptime"}>
        <StatRow
          label="awake"
          value={bind(uptime).as((s) => {
            const h = Math.floor(s / 3600)
            const m = Math.floor((s % 3600) / 60)
            return `${h}h ${m}m`
          })}
        />
      </Panel>
    )
  },
}
```

That's the whole file. Notable:

- **Render is pure.** Given the same config + service state, it produces
  the same tree. No side effects in `render`.
- **Types come from `WidgetConfig`.** Accept the generic config in, cast
  once at the top, and use a typed variable downstream.
- **Panel does the framing.** Don't build your own title-plus-underline;
  `<Panel title="…">` handles the section label, the 26 × 1 hairline,
  and the optional right-aligned suffix for free.
- **Errors are not your problem.** If the service returns junk, the
  widget's renderer will crash, and `lib/boundary.tsx` will catch it and
  render a muted error cell without killing the dashboard. But try to
  return a sensible default anyway.

### 3. Register it

```ts
// widgets/index.ts
import { uptimeWidget } from "./uptime"

export function registerBuiltins(): void {
  // ...
  register("uptime", uptimeWidget)
}
```

### 4. Reference it from YAML

```yaml
widgets:
  uptime: { type: uptime, title: "awake since" }

layout:
  - [uptime, …]
```

Save. The dashboard picks it up in ~300ms.

---

## Add a theme

Three ship already. Adding a fourth:

1. Copy `themes/luxury-journal.scss` → `themes/your-theme.scss`.
2. Replace the CSS custom property block (inside `.dashboard {}`) with
   your palette and fonts.
3. Override any rules from `_base.scss` that need theme-specific treatment
   (e.g., the `cyber-hud` theme uppercases labels; `minimal-mono` strips
   border-radius).
4. Register it in `lib/theme.ts`:

```ts
import yourTheme from "../themes/your-theme.scss"

const themes: Record<string, string> = {
  // ...
  "your-theme": yourTheme,
}
```

5. Reference `theme: your-theme` in your config.

Please keep the section-rule convention intact — the 1px hairline under
each section label is load-bearing for visual hierarchy across themes.

---

## Code style

- TypeScript strict, JSX via `astal/gtk4`, `react-jsx`.
- `camelCase` for TS identifiers, `snake_case` for widget type names
  and YAML keys (the spec calls for this).
- No comments explaining *what* the code does. Only *why* where it isn't
  obvious. `// parse /proc/stat` is noise; `// warn-once avoids flooding
  journalctl on a 1s poll` is useful.
- No `any` in service code; widgets may cast their config from
  `WidgetConfig` once, at the top.

## Running the checks

```sh
pnpm typecheck        # strict TS
pnpm format:check     # prettier
ags run .             # manual test — live reload
```

CI runs typecheck + format check on every PR.

## Filing issues

- **Bug?** `.github/ISSUE_TEMPLATE/bug.md` — include your distro, the
  output of `ags --version`, and the offending YAML.
- **Widget request?** `.github/ISSUE_TEMPLATE/feature.md` — describe the
  data source, cadence, and the config shape you'd want.

## Code of conduct

Be kind. Assume good faith. Don't be a dick about indentation.
