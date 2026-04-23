import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";
import { readFile, writeFile } from "ags/file";
import { expand } from "./paths";
import { logger } from "./logger";

const log = logger("fs");

export function readText(path: string): string | null {
  const p = expand(path);
  try {
    return readFile(p);
  } catch (err) {
    log.debug(`read failed ${p}: ${(err as Error).message}`);
    return null;
  }
}

export function writeText(path: string, content: string): boolean {
  const p = expand(path);
  try {
    const dir = GLib.path_get_dirname(p);
    GLib.mkdir_with_parents(dir, 0o755);
    writeFile(p, content);
    return true;
  } catch (err) {
    log.error(`write failed ${p}: ${(err as Error).message}`);
    return false;
  }
}

export function exists(path: string): boolean {
  return GLib.file_test(expand(path), GLib.FileTest.EXISTS);
}

export function commandExists(cmd: string): boolean {
  return GLib.find_program_in_path(cmd) !== null;
}

/** Watch a file for changes. Returns an unsub function. */
export function watch(path: string, cb: () => void): () => void {
  const p = expand(path);
  const f = Gio.File.new_for_path(p);
  const monitor = f.monitor_file(Gio.FileMonitorFlags.NONE, null);
  const handler = monitor.connect("changed", (_m, _file, _other, event) => {
    if (event === Gio.FileMonitorEvent.CHANGED || event === Gio.FileMonitorEvent.CHANGES_DONE_HINT)
      cb();
  });
  return () => {
    monitor.disconnect(handler);
    monitor.cancel();
  };
}
