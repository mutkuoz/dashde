import { Variable } from "astal";
import { execAsync } from "astal/process";

export interface ShellSnapshot {
  available: boolean;
  stdout: string;
  ran: number; // ms timestamp of last successful sample
}

/**
 * Keyed per (command,refresh) so two widgets running the same command at the same
 * interval share one subprocess.
 */
const cache = new Map<string, Variable<ShellSnapshot>>();

export function shellStream(command: string, refreshMs: number): Variable<ShellSnapshot> {
  const key = `${command}|${refreshMs}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const v = Variable<ShellSnapshot>({ available: false, stdout: "", ran: 0 }).poll(
    Math.max(500, refreshMs),
    () => run(command),
  );
  cache.set(key, v);
  return v;
}

async function run(command: string): Promise<ShellSnapshot> {
  try {
    const out = await execAsync(["bash", "-c", command]);
    return { available: true, stdout: out, ran: Date.now() };
  } catch (err) {
    // Commands may exit non-zero with useful stderr; treat as unavailable for this sample.
    return { available: false, stdout: String((err as Error).message ?? err), ran: Date.now() };
  }
}
