import { Variable } from "astal";
import { monitorFile, readFile } from "astal/file";
import { parse as parseYaml } from "yaml";
import { logger } from "./logger";
import { paths, ensureDir } from "./paths";

const log = logger("config");

export interface DashboardConfig {
  theme: string;
  layout: (string | null)[][];
  layout_widths?: Record<string, number[]> | number[];
  widgets: Record<string, WidgetConfig>;
  window?: {
    layer?: "background" | "bottom" | "top" | "overlay";
    anchor?: Array<"top" | "bottom" | "left" | "right">;
    margin?: [number, number, number, number];
    width?: number;
    height?: number;
  };
  greeting?: { name?: string; custom_phrases?: Record<string, string[]> };
}

export interface WidgetConfig {
  type: string;
  [key: string]: unknown;
}

const DEFAULT: DashboardConfig = {
  theme: "luxury-journal",
  layout: [],
  widgets: {},
};

export const config = Variable<DashboardConfig>(DEFAULT);

let lastGoodRaw = "";
let reloadTimer: number | null = null;

function parseAndValidate(raw: string): DashboardConfig | Error {
  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    return new Error(`YAML parse error: ${(err as Error).message}`);
  }
  if (!parsed || typeof parsed !== "object") {
    return new Error("config must be a YAML mapping");
  }
  const p = parsed as Record<string, unknown>;

  const theme = typeof p.theme === "string" ? p.theme : DEFAULT.theme;
  const layout = Array.isArray(p.layout) ? (p.layout as (string | null)[][]) : [];
  const widgets = (p.widgets && typeof p.widgets === "object" ? p.widgets : {}) as Record<
    string,
    WidgetConfig
  >;
  const layout_widths = p.layout_widths as DashboardConfig["layout_widths"];
  const window = p.window as DashboardConfig["window"];
  const greeting = p.greeting as DashboardConfig["greeting"];

  // cross-check layout references exist in widgets
  const ids = new Set(Object.keys(widgets));
  const missing: string[] = [];
  for (const row of layout) {
    if (!Array.isArray(row)) continue;
    for (const cell of row) {
      if (cell && !ids.has(cell)) missing.push(cell);
    }
  }
  if (missing.length > 0) {
    log.warn(`layout references missing widget IDs: ${[...new Set(missing)].join(", ")}`);
  }

  return {
    theme,
    layout,
    layout_widths,
    widgets,
    window,
    greeting,
  };
}

function reload(path: string): void {
  let raw: string;
  try {
    raw = readFile(path);
  } catch (err) {
    log.error(`failed to read ${path}: ${(err as Error).message}`);
    return;
  }
  if (raw === lastGoodRaw) return; // no-op if unchanged content (some watchers fire twice)

  const result = parseAndValidate(raw);
  if (result instanceof Error) {
    log.error(result.message);
    return; // keep previous config
  }
  lastGoodRaw = raw;
  config.set(result);
  log.info(`loaded config · theme=${result.theme} · ${result.layout.length} rows`);
}

export function initConfig(): void {
  ensureDir(paths.config);
  try {
    const raw = readFile(paths.configFile);
    const result = parseAndValidate(raw);
    if (result instanceof Error) {
      log.error(`initial config invalid — using defaults · ${result.message}`);
    } else {
      lastGoodRaw = raw;
      config.set(result);
      log.info(`loaded config · theme=${result.theme} · ${result.layout.length} rows`);
    }
  } catch {
    log.warn(`no config at ${paths.configFile}, using defaults — run install.sh to seed one`);
  }

  // debounced file watcher: coalesce bursts of FS events within 300ms.
  // Content-equality check in reload() dedupes no-op saves.
  monitorFile(paths.configFile, () => {
    if (reloadTimer !== null) clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      reloadTimer = null;
      reload(paths.configFile);
    }, 300);
  });
}

export function widthsForRow(rowIdx: number, cellCount: number, cfg: DashboardConfig): number[] {
  const w = cfg.layout_widths;
  if (!w) return new Array(cellCount).fill(1);
  if (Array.isArray(w)) return w.length === cellCount ? w : new Array(cellCount).fill(1);
  const key = String(rowIdx);
  if (key in w && Array.isArray(w[key]) && w[key].length === cellCount) return w[key];
  if ("default" in w && Array.isArray(w.default) && w.default.length === cellCount)
    return w.default;
  return new Array(cellCount).fill(1);
}
