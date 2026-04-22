# Themes

dashde ships three themes. Each is a single SCSS file that declares
a palette of CSS custom properties and inherits structure from
`_base.scss`.

## Built-ins

### `luxury-journal` — default

Parchment, oxblood, handwritten labels, classical serif numerals. The
dashboard as fine stationery.

**Palette**

| token | value | usage |
| --- | --- | --- |
| `--bg` | `#ece0c8` | outer parchment |
| `--panel-bg` | `#f2e8d3` | panels |
| `--panel-border` | `rgba(114, 37, 41, 0.15)` | hairline |
| `--ink-dark` | `#2d1810` | primary text |
| `--ink-medium` | `#6b4e36` | labels, muted |
| `--accent` | `#722529` | burgundy (labels, bars, tiles) |
| `--good` | `#4a6b3a` | sage (good state) |
| `--warn` | `#9e7b3a` | gold (high usage) |
| `--track` | `rgba(61, 40, 23, 0.12)` | bar track |

**Fonts**

- `Parisienne 400` — greeting (one use, 44 px)
- `Caveat 400` — labels, body
- `Cormorant Garamond 500` — numbers, clock, percentages

### `cyber-hud`

Deep navy, cyan, and a soft neon bloom on bars. Angular uppercase
labels; monospace numerals.

**Fonts**

- `Rajdhani 400/500/600` — display + labels
- `JetBrains Mono 400` — numbers

### `minimal-mono`

Near-white page, pure black ink, zero ornament. The dashboard by way of
newsprint and 1990s Dieter Rams.

**Fonts**

- `Darker Grotesque 400/700` — everything display/label/body
- `JetBrains Mono 400` — numbers

## Writing a theme

```scss
// themes/your-theme.scss
.dashboard {
  --font-display: "Your Display Font", serif;
  --font-label:   "Your Label Font", sans-serif;
  --font-body:    "Your Label Font", sans-serif;
  --font-num:     "Your Mono Font", monospace;

  --bg: #…;
  --panel-bg: #…;
  --panel-border: rgba(…);
  --panel-border-strong: rgba(…);
  --panel-radius: 4px;           // 0 for sharp, 4 for soft

  --ink-dark: #…;
  --ink-medium: #…;

  --accent: #…;
  --good:   #…;
  --warn:   #…;
  --on-accent: #…;                // text color on --accent (for cal today, btn--primary)

  --track: rgba(…);
  --divider: rgba(…);
  --hover-bg: rgba(…);
  --tile-bg: rgba(…);
  --tile-bg-hover: rgba(…);
  --mono-bg: rgba(…);             // tmux/shell_output panel background
}

@import "_base";

// theme-specific overrides only below this line
```

Register it in `lib/theme.ts`:

```ts
import yourTheme from "../themes/your-theme.scss"

const themes: Record<string, string> = {
  // ...
  "your-theme": yourTheme,
}
```

Reference it in YAML:

```yaml
theme: your-theme
```

## Conventions worth preserving

- **Section rule.** The 1 px hairline under each panel title is a
  navigational anchor. Change its color or length, but keep something
  there so rows don't dissolve into a wall of labels.
- **One display font use.** The greeting is the only place `Parisienne`
  (or its theme equivalent) appears. A second use collapses the
  hierarchy.
- **Numbers in their own face.** Tabular digits matter; Cormorant,
  JetBrains Mono, or another face with `tnum` features keeps columns
  aligned as values tick.
- **Accent is load-bearing.** Bar fills, labels, tile glyphs, calendar
  today cell — they all use `--accent`. Pick a color you like on pale
  backgrounds and dark backgrounds alike.

## Known GTK4 CSS limits

- No `::before` / `::after` on most widgets — decorative elements go in
  the TSX tree (see the `section__rule` box in `Panel`).
- No `display:` property — layout is GTK-native (orientation / homogeneous).
- Transitions work on `background`, `border-color`, `box-shadow`, and
  sizing. Transitioning `font-size` is flaky; don't rely on it.
- Custom properties (CSS variables) are supported in GTK 4.6+. If you're
  on older GTK, you'll need to SCSS-substitute at compile time instead.
