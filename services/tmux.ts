import { Variable } from "../lib/reactive";
import { execAsync } from "ags/process";
import { commandExists } from "../lib/fs";

export interface TmuxPane {
  target: string;
  available: boolean;
  lines: string[]; // raw lines, may include ANSI escape codes
}

const EMPTY = (target: string): TmuxPane => ({ target, available: false, lines: [] });

let hasTmux: boolean | null = null;

/**
 * Capture a tmux pane. Returns a per-target Variable that polls at the widget's cadence.
 * Caching by target string so multiple widgets on the same pane share one capture.
 */
const cache = new Map<string, Variable<TmuxPane>>();

export function paneStream(target: string, lines: number, refreshMs: number): Variable<TmuxPane> {
  const key = `${target}|${lines}|${refreshMs}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const v = Variable<TmuxPane>(EMPTY(target)).poll(Math.max(250, refreshMs), () =>
    capture(target, lines),
  );
  cache.set(key, v);
  return v;
}

async function capture(target: string, lines: number): Promise<TmuxPane> {
  if (hasTmux === null) hasTmux = commandExists("tmux");
  if (!hasTmux) return EMPTY(target);
  try {
    const args = ["tmux", "capture-pane", "-p", "-e"];
    if (lines > 0) args.push("-S", `-${lines}`);
    args.push("-t", target);
    const out = await execAsync(args);
    const arr = out.split("\n");
    if (arr.length > 0 && arr[arr.length - 1] === "") arr.pop();
    return { target, available: true, lines: arr };
  } catch {
    return EMPTY(target);
  }
}
