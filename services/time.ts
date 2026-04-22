import { Variable } from "astal";

export const now = Variable<Date>(new Date()).poll(1000, () => new Date());

export function periodPhrase(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "late at night";
  if (h < 12) return "in the morning";
  if (h < 14) return "at midday";
  if (h < 18) return "in the afternoon";
  if (h < 22) return "in the evening";
  return "tonight";
}

export function adaptiveGreeting(d: Date, name: string): string {
  const h = d.getHours();
  if (h < 5) return `still up, ${name}`;
  if (h < 12) return `good morning, ${name}`;
  if (h < 18) return `good afternoon, ${name}`;
  if (h < 22) return `good evening, ${name}`;
  return `good night, ${name}`;
}

export function formatTime(d: Date, fmt: "24h" | "12h"): string {
  const h = d.getHours();
  const m = d.getMinutes();
  if (fmt === "12h") {
    const hh = ((h + 11) % 12) + 1;
    return `${hh}:${String(m).padStart(2, "0")}`;
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatDate(d: Date): string {
  // "friday, 23 april"
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "long" }).toLowerCase();
  return `${weekday}, ${day} ${month}`;
}
