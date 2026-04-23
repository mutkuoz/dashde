import { Variable } from "../lib/reactive";
import { execAsync } from "ags/process";
import { logger } from "../lib/logger";

const log = logger("weather");

export interface WeatherDay {
  date: string; // YYYY-MM-DD
  tMax: number;
  tMin: number;
  code: number;
}

export interface WeatherSnapshot {
  available: boolean;
  temp: number;
  apparent: number;
  code: number;
  isDay: boolean;
  days: WeatherDay[];
  units: "metric" | "imperial";
}

export interface WeatherQuery {
  lat: number;
  lon: number;
  days?: number;
  units?: "metric" | "imperial";
}

const cache = new Map<string, Variable<WeatherSnapshot>>();

function key(q: WeatherQuery): string {
  return `${q.lat}|${q.lon}|${q.days ?? 3}|${q.units ?? "metric"}`;
}

export function weatherStream(q: WeatherQuery): Variable<WeatherSnapshot> {
  const k = key(q);
  const existing = cache.get(k);
  if (existing) return existing;

  const empty: WeatherSnapshot = {
    available: false,
    temp: 0,
    apparent: 0,
    code: 0,
    isDay: true,
    days: [],
    units: q.units ?? "metric",
  };

  const v = Variable<WeatherSnapshot>(empty).poll(15 * 60_000, () => fetch(q));
  cache.set(k, v);
  return v;
}

async function fetch(q: WeatherQuery): Promise<WeatherSnapshot> {
  const units = q.units ?? "metric";
  const days = Math.max(1, Math.min(q.days ?? 3, 7));
  const tempUnit = units === "imperial" ? "fahrenheit" : "celsius";

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${q.lat}&longitude=${q.lon}` +
    `&current=temperature_2m,apparent_temperature,is_day,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&temperature_unit=${tempUnit}&forecast_days=${days}&timezone=auto`;

  try {
    const raw = await execAsync(["curl", "-s", "--max-time", "8", url]);
    const j = JSON.parse(raw);
    const out: WeatherSnapshot = {
      available: true,
      temp: j.current?.temperature_2m ?? 0,
      apparent: j.current?.apparent_temperature ?? 0,
      code: j.current?.weather_code ?? 0,
      isDay: (j.current?.is_day ?? 1) === 1,
      days: [],
      units,
    };
    const time = j.daily?.time as string[] | undefined;
    const tMax = j.daily?.temperature_2m_max as number[] | undefined;
    const tMin = j.daily?.temperature_2m_min as number[] | undefined;
    const codes = j.daily?.weather_code as number[] | undefined;
    if (time && tMax && tMin && codes) {
      for (let i = 0; i < time.length; i++) {
        out.days.push({ date: time[i], tMax: tMax[i], tMin: tMin[i], code: codes[i] });
      }
    }
    return out;
  } catch (err) {
    log.warn(`fetch failed: ${(err as Error).message}`);
    return {
      available: false,
      temp: 0,
      apparent: 0,
      code: 0,
      isDay: true,
      days: [],
      units,
    };
  }
}

export function weatherSymbol(code: number): string {
  // https://open-meteo.com/en/docs#weathervariables
  if (code === 0) return "☼";
  if (code === 1 || code === 2) return "☼";
  if (code === 3) return "☁";
  if (code >= 45 && code <= 48) return "≋";
  if (code >= 51 && code <= 67) return "☂";
  if (code >= 71 && code <= 77) return "❄";
  if (code >= 80 && code <= 82) return "☂";
  if (code >= 85 && code <= 86) return "❄";
  if (code >= 95) return "⚡";
  return "•";
}

export function weatherDescription(code: number): string {
  if (code === 0) return "clear";
  if (code === 1) return "mostly clear";
  if (code === 2) return "partly cloudy";
  if (code === 3) return "overcast";
  if (code >= 45 && code <= 48) return "fog";
  if (code >= 51 && code <= 55) return "drizzle";
  if (code >= 56 && code <= 57) return "freezing drizzle";
  if (code >= 61 && code <= 65) return "rain";
  if (code >= 66 && code <= 67) return "freezing rain";
  if (code >= 71 && code <= 75) return "snow";
  if (code === 77) return "snow grains";
  if (code >= 80 && code <= 82) return "rain showers";
  if (code >= 85 && code <= 86) return "snow showers";
  if (code === 95) return "thunderstorm";
  if (code >= 96) return "thunder with hail";
  return "—";
}
