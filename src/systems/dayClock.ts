/** A complete in-game day (4 minutes = 24 in-game hours, i.e. 10 s per hour). */
export const DAY_LENGTH_MS = 4 * 60_000;

/** Start sessions in bright morning daylight instead of midnight. */
export const START_HOUR = 9;

export type DayPhaseId = 'dawn' | 'day' | 'dusk' | 'night';

export interface DayTimeInfo {
  /** Normalized position in [0, 1), where 0 = 00:00 and 0.5 = 12:00. */
  fraction: number;
  /** Continuous in-game hour in [0, 24). */
  hour: number;
  phase: DayPhaseId;
  /** Short German label for the current time of day. */
  phaseLabel: string;
  /** Approximate 24h clock string rounded to 30-minute steps (e.g. "09:00"). */
  formattedTime: string;
  /** Darkness veil alpha in [0, NIGHT_SHADE_ALPHA]; 0 during full daylight. */
  shadeAlpha: number;
  /** True while the sun is above the horizon (06:00–19:00). */
  isDaylight: boolean;
  /** Progress [0, 1] of the sun (day) or moon (night) along its sky arc. */
  celestialProgress: number;
}

const NIGHT_SHADE_ALPHA = 0.52;
const DAWN_START = 5;
const DAY_START = 7;
const DUSK_START = 18.5;
const NIGHT_START = 21;
const SUNRISE_HOUR = 6;
const SUNSET_HOUR = 19;

let elapsedMs = (START_HOUR / 24) * DAY_LENGTH_MS;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/** Pure conversion from elapsed cycle milliseconds to time-of-day info. */
export function computeDayTime(ms: number): DayTimeInfo {
  const wrapped = ((ms % DAY_LENGTH_MS) + DAY_LENGTH_MS) % DAY_LENGTH_MS;
  const fraction = wrapped / DAY_LENGTH_MS;
  const hour = fraction * 24;

  const halfHours = Math.floor(hour * 2) % 48;
  const hh = Math.floor(halfHours / 2);
  const mm = (halfHours % 2) * 30;
  const formattedTime = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

  let phase: DayPhaseId;
  if (hour >= DAWN_START && hour < DAY_START) phase = 'dawn';
  else if (hour >= DAY_START && hour < DUSK_START) phase = 'day';
  else if (hour >= DUSK_START && hour < NIGHT_START) phase = 'dusk';
  else phase = 'night';

  let phaseLabel: string;
  if (hour >= 5 && hour < 11) phaseLabel = 'Morgen';
  else if (hour >= 11 && hour < 17) phaseLabel = 'Tag';
  else if (hour >= 17 && hour < 21) phaseLabel = 'Abend';
  else phaseLabel = 'Nacht';

  let shadeAlpha: number;
  if (hour >= DAY_START && hour <= DUSK_START) {
    shadeAlpha = 0;
  } else if (hour > DAWN_START && hour < DAY_START) {
    shadeAlpha = NIGHT_SHADE_ALPHA * (1 - smoothstep((hour - DAWN_START) / (DAY_START - DAWN_START)));
  } else if (hour > DUSK_START && hour < NIGHT_START) {
    shadeAlpha = NIGHT_SHADE_ALPHA * smoothstep((hour - DUSK_START) / (NIGHT_START - DUSK_START));
  } else {
    shadeAlpha = NIGHT_SHADE_ALPHA;
  }

  const isDaylight = hour >= SUNRISE_HOUR && hour < SUNSET_HOUR;
  const celestialProgress = isDaylight
    ? clamp01((hour - SUNRISE_HOUR) / (SUNSET_HOUR - SUNRISE_HOUR))
    : clamp01(((hour >= SUNSET_HOUR ? hour - SUNSET_HOUR : hour + 24 - SUNSET_HOUR)) / (24 - (SUNSET_HOUR - SUNRISE_HOUR)));

  return {
    fraction,
    hour,
    phase,
    phaseLabel,
    formattedTime,
    shadeAlpha,
    isDaylight,
    celestialProgress,
  };
}

/** Advances the shared in-game clock. Persists across map transitions within a session. */
export function advanceDayClock(deltaMs: number): void {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
  elapsedMs = (elapsedMs + deltaMs) % DAY_LENGTH_MS;
}

export function getDayTime(): DayTimeInfo {
  return computeDayTime(elapsedMs);
}

export function setDayTimeHour(hour: number): void {
  if (!Number.isFinite(hour)) return;
  const normalized = ((hour % 24) + 24) % 24;
  elapsedMs = (normalized / 24) * DAY_LENGTH_MS;
}

export function resetDayClock(): void {
  setDayTimeHour(START_HOUR);
}
