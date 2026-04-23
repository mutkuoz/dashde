import GLib from "gi://GLib?version=2.0";

const HOME = GLib.get_home_dir();
const XDG_CONFIG = GLib.getenv("XDG_CONFIG_HOME") || `${HOME}/.config`;
const XDG_DATA = GLib.getenv("XDG_DATA_HOME") || `${HOME}/.local/share`;
const XDG_CACHE = GLib.getenv("XDG_CACHE_HOME") || `${HOME}/.cache`;

export const paths = {
  home: HOME,
  config: `${XDG_CONFIG}/dashboard`,
  configFile: `${XDG_CONFIG}/dashboard/config.yaml`,
  data: `${XDG_DATA}/dashboard`,
  cache: `${XDG_CACHE}/dashboard`,
};

export function expand(path: string): string {
  if (path.startsWith("~/")) return `${HOME}/${path.slice(2)}`;
  if (path === "~") return HOME;
  if (path.startsWith("$HOME/")) return `${HOME}/${path.slice(6)}`;
  return path;
}

export function ensureDir(path: string): void {
  try {
    GLib.mkdir_with_parents(path, 0o755);
  } catch {
    // already exists or parent permission issue — callers will fail later with a clearer error
  }
}
