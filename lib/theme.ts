import app from "ags/gtk4/app";
import luxuryJournal from "../themes/luxury-journal.scss";
import cyberHud from "../themes/cyber-hud.scss";
import minimalMono from "../themes/minimal-mono.scss";
import { logger } from "./logger";

const log = logger("theme");

const themes: Record<string, string> = {
  "luxury-journal": luxuryJournal,
  "cyber-hud": cyberHud,
  "minimal-mono": minimalMono,
};

let currentName = "";

export function applyTheme(name: string): void {
  if (name === currentName) return;
  const css = themes[name];
  if (!css) {
    log.warn(`unknown theme "${name}" — available: ${Object.keys(themes).join(", ")}`);
    if (currentName) return; // stay on current
    // first boot fallback
    app.apply_css(themes["luxury-journal"], true);
    currentName = "luxury-journal";
    return;
  }
  app.apply_css(css, true);
  currentName = name;
  log.info(`applied theme · ${name}`);
}

export function themeNames(): string[] {
  return Object.keys(themes);
}
