import { afterEach, describe, expect, it } from 'vitest';
import {
  advanceDayClock,
  computeDayTime,
  DAY_LENGTH_MS,
  getDayTime,
  resetDayClock,
  setDayTimeHour,
  START_HOUR,
} from '../../src/systems/dayClock';

describe('dayClock system', () => {
  afterEach(() => {
    resetDayClock();
  });

  it('starts in bright morning daylight with zero darkness shade', () => {
    resetDayClock();
    const t = getDayTime();
    expect(t.hour).toBeCloseTo(START_HOUR, 5);
    expect(t.formattedTime).toBe('09:00');
    expect(t.phaseLabel).toBe('Morgen');
    expect(t.shadeAlpha).toBe(0);
    expect(t.isDaylight).toBe(true);
  });

  it('keeps daytime completely bright and transitions smoothly through dusk, night, and dawn', () => {
    for (const h of [7, 9, 12, 15, 18.5]) {
      setDayTimeHour(h);
      expect(getDayTime().shadeAlpha).toBe(0);
    }

    setDayTimeHour(19.75);
    const dusk = getDayTime();
    expect(dusk.phase).toBe('dusk');
    expect(dusk.phaseLabel).toBe('Abend');
    expect(dusk.shadeAlpha).toBeGreaterThan(0);
    expect(dusk.shadeAlpha).toBeLessThan(0.52);

    setDayTimeHour(23);
    const night = getDayTime();
    expect(night.phase).toBe('night');
    expect(night.phaseLabel).toBe('Nacht');
    expect(night.shadeAlpha).toBeCloseTo(0.52, 5);
    expect(night.isDaylight).toBe(false);

    setDayTimeHour(6);
    const dawn = getDayTime();
    expect(dawn.phase).toBe('dawn');
    expect(dawn.phaseLabel).toBe('Morgen');
    expect(dawn.shadeAlpha).toBeGreaterThan(0);
    expect(dawn.shadeAlpha).toBeLessThan(0.52);
  });

  it('advances across a full 24h cycle and wraps cleanly', () => {
    setDayTimeHour(9);
    advanceDayClock(DAY_LENGTH_MS / 2); // +12h -> 21:00
    expect(getDayTime().hour).toBeCloseTo(21, 5);
    expect(getDayTime().formattedTime).toBe('21:00');
    expect(getDayTime().phaseLabel).toBe('Nacht');

    advanceDayClock(DAY_LENGTH_MS / 2); // +12h -> 09:00 next day
    expect(getDayTime().hour).toBeCloseTo(9, 5);
    expect(getDayTime().shadeAlpha).toBe(0);
  });

  it('computes celestial arc progress smoothly across day and night', () => {
    const sunrise = computeDayTime((6 / 24) * DAY_LENGTH_MS);
    expect(sunrise.isDaylight).toBe(true);
    expect(sunrise.celestialProgress).toBeCloseTo(0, 5);

    const solarNoon = computeDayTime((12.5 / 24) * DAY_LENGTH_MS);
    expect(solarNoon.isDaylight).toBe(true);
    expect(solarNoon.celestialProgress).toBeCloseTo(0.5, 5);

    const midnight = computeDayTime(0);
    expect(midnight.isDaylight).toBe(false);
    expect(midnight.celestialProgress).toBeGreaterThan(0.4);
    expect(midnight.celestialProgress).toBeLessThan(0.5);
  });
});
