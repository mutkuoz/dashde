type Level = "debug" | "info" | "warn" | "error";

const ENABLED: Record<Level, boolean> = {
  debug: false,
  info: true,
  warn: true,
  error: true,
};

function stamp(): string {
  const d = new Date();
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

function emit(level: Level, tag: string, msg: string, extra?: unknown): void {
  if (!ENABLED[level]) return;
  const prefix = `[${stamp()}] ${level.toUpperCase().padEnd(5)} ${tag.padEnd(14)}`;
  const line = extra !== undefined ? `${prefix} ${msg} ${JSON.stringify(extra)}` : `${prefix} ${msg}`;
  if (level === "error" || level === "warn") {
    printerr(line);
  } else {
    print(line);
  }
}

export function logger(tag: string) {
  return {
    debug: (msg: string, extra?: unknown) => emit("debug", tag, msg, extra),
    info: (msg: string, extra?: unknown) => emit("info", tag, msg, extra),
    warn: (msg: string, extra?: unknown) => emit("warn", tag, msg, extra),
    error: (msg: string, extra?: unknown) => emit("error", tag, msg, extra),
  };
}

export function enableDebug(): void {
  ENABLED.debug = true;
}

// warn-once: avoids spamming journalctl when a missing source polls every second
const warned = new Set<string>();
export function warnOnce(tag: string, key: string, msg: string): void {
  const k = `${tag}::${key}`;
  if (warned.has(k)) return;
  warned.add(k);
  emit("warn", tag, msg);
}
