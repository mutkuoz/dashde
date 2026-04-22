import type { Gtk } from "astal/gtk4";
import type { WidgetConfig } from "./config";

export interface WidgetModule {
  displayName: string;
  render: (config: WidgetConfig, instanceId: string) => Gtk.Widget;
  validate?: (config: WidgetConfig) => string | null;
}

const registry = new Map<string, WidgetModule>();

export function register(type: string, module: WidgetModule): void {
  registry.set(type, module);
}

export function resolve(type: string): WidgetModule | undefined {
  return registry.get(type);
}

export function allTypes(): string[] {
  return [...registry.keys()].sort();
}
