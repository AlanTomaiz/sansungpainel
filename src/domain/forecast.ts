export interface Hourly {
  time: string[];
  temperature_2m: number[];
  precipitation_probability: number[];
  weather_code: number[];
}

export interface Forecast {
  nowTemp: number;
  code: number;
  condition: string;
  nextRain: string | null;
  curve: { hour: string; temp: number }[];
}

const MIN_SPAN_HOURS = 6;
const MORNING_HOUR = 7;
const RAIN_CHANCE = 50;

const WMO: [number, string][] = [
  [0, 'Céu limpo'],
  [2, 'Poucas nuvens'],
  [3, 'Nublado'],
  [48, 'Neblina'],
  [57, 'Garoa'],
  [67, 'Chuva'],
  [77, 'Neve'],
  [82, 'Pancadas de chuva'],
  [86, 'Neve'],
  [99, 'Tempestade'],
];

export function conditionName(code: number): string {
  const hit = WMO.find(([max]) => code <= max);
  return hit ? hit[1] : 'Nublado';
}

const hourLabel = (iso: string): string => `${Number(iso.slice(11, 13))}h`;

export function summarizeForecast(h: Hourly, nowIso: string): Forecast {
  const found = h.time.findIndex((t) => t >= nowIso);
  const start = found < 0 ? h.time.length - 1 : found;
  const hour = Number((h.time[start] ?? nowIso).slice(11, 13));
  const toMorning = (MORNING_HOUR - hour + 24) % 24 || 24;
  const end = Math.min(start + Math.max(toMorning, MIN_SPAN_HOURS), h.time.length - 1);
  const curve: Forecast['curve'] = [];
  for (let i = start; i <= end; i++) {
    curve.push({
      hour: i === start ? 'Agora' : hourLabel(h.time[i] ?? ''),
      temp: h.temperature_2m[i] ?? 0,
    });
  }
  const rainIdx = h.precipitation_probability.findIndex(
    (p, i) => i > start && i <= end && p >= RAIN_CHANCE,
  );
  const code = h.weather_code[start] ?? 0;
  return {
    nowTemp: h.temperature_2m[start] ?? 0,
    code,
    condition: conditionName(code),
    nextRain: rainIdx < 0 ? null : `chuva às ${hourLabel(h.time[rainIdx] ?? '')}`,
    curve,
  };
}

export const subtitle = (f: Forecast): string =>
  f.nextRain ? `${f.condition}, ${f.nextRain}` : f.condition;
