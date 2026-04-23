/**
 * Icon map + helpers for the bundled Phosphor icon set.
 *
 * We bundle a small curated set of Phosphor Light SVGs under icons/ and
 * reference them by a short friendly alias (e.g. "folder", "web") that widget
 * configs can use. The SVGs use `fill="currentColor"` so GTK4 tints them to
 * whatever `color:` CSS says on the parent `<image>` widget.
 */

// SRC is injected by the AGS bundler; it's the absolute path of the
// project directory the user ran `ags run` against.
declare const SRC: string;

/** Short friendly name → SVG filename (without extension). */
export const ICONS: Record<string, string> = {
  // apps / launchers
  folder: "folder",
  files: "folder",
  web: "globe",
  globe: "globe",
  terminal: "terminal",
  term: "terminal",
  code: "code",
  editor: "code",
  mail: "envelope",
  envelope: "envelope",
  settings: "gear",
  prefs: "gear",
  config: "gear",
  gear: "gear",
  power: "power",
  lock: "lock",
  music: "music-note",
  camera: "camera",
  search: "magnifying-glass",
  file: "file",
  calendar: "calendar",
  house: "house",
  home: "house",
  video: "video-camera",
  chat: "chat-circle",
  docs: "question",
  help: "question",

  // actions
  edit: "pencil-simple",
  pencil: "pencil-simple",
  trash: "trash",
  delete: "trash",
  close: "x",
  x: "x",
  plus: "plus",
  add: "plus",
  check: "check",
  circle: "circle",
  send: "paper-plane-right",
  download: "download-simple",

  // media
  play: "play",
  pause: "pause",
  "skip-back": "skip-back",
  "skip-forward": "skip-forward",

  // content
  star: "star",
  heart: "heart",
  bookmark: "bookmark",
  book: "book",
  image: "image",
  link: "link",
  sun: "sun",
  moon: "moon",
  cloud: "cloud",
};

/** Resolve a short name to an absolute filesystem path to the SVG. */
export function iconPath(nameOrAlias: string): string {
  const resolved = ICONS[nameOrAlias] ?? nameOrAlias;
  return `${SRC}/icons/${resolved}.svg`;
}

/** True if `nameOrAlias` or its mapped name has a bundled SVG. */
export function hasIcon(nameOrAlias: string): boolean {
  return nameOrAlias in ICONS;
}
