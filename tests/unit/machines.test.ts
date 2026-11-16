import { beforeEach, describe, expect, it } from 'vitest';
import {
  COMPOST_MS,
  FLOUR_ITEM_ID,
  MILL_GRIND_MS,
  RACK_SEEDS,
  isCompostActive,
  machineAction,
  tickMachines,
} from '../../src/systems/machines';
import { placePiece, removePiece } from '../../src/systems/building';
import { getBedState, plantSeed } from '../../src/systems/plants';
import { gameState } from '../../src/systems/state';
import { content } from '../../src/content';

const give = (items: Record<string, number>): void => {
  for (const [id, n] of Object.entries(items)) gameState.addItem(id, n);
};

/** Open grass in the main garden, away from beds, props and the spawn (see buildingAndBlight.test.ts). */
const SPOT = { x: 22, y: 37 };
const NEXT = { x: 23, y: 37 };

/** Builds a planter on SPOT and plants a lavender in it. */
function plantedPlanter(): string {
  give({ 'mat-wood': 2, 'mat-stone': 1, 'seed-lavender': 1 });
  expect(placePiece('garden', 'planter', SPOT.x, SPOT.y)).toBeNull();
  const bedId = `planter:garden:${SPOT.x}:${SPOT.y}`;
  expect(plantSeed(bedId)).toBe(true);
  return bedId;
}

describe('working buildings', () => {
  beforeEach(() => {
    localStorage.clear();
    gameState.reset();
  });

  it('defines the four machines with costs that exist as items', () => {
    const machines = content.buildables.all().filter((b) => b.machine);
    expect(machines.map((b) => b.machine).sort()).toEqual(['compost', 'drying-rack', 'rain-barrel', 'windmill']);
    for (const m of machines) for (const c of m.cost) expect(content.items.has(c.itemId)).toBe(true);
  });

  it('a rain barrel speeds up the bed beside it, and one that is far away does nothing', () => {
    const bedId = plantedPlanter();
    const before = getBedState(bedId)?.plantedAt as number;
    give({ 'mat-wood': 3, 'mat-scrap': 1 });
    expect(placePiece('garden', 'rain-barrel', NEXT.x, NEXT.y)).toBeNull();
    const now = Date.now();
    tickMachines(now - 4000, now);
    expect(getBedState(bedId)?.plantedAt).toBe(before - 2000);

    give({ 'mat-wood': 3, 'mat-scrap': 1 });
    expect(placePiece('garden', 'rain-barrel', SPOT.x + 10, SPOT.y)).toBeNull();
    const after = getBedState(bedId)?.plantedAt as number;
    tickMachines(now, now + 4000);
    // Only the near barrel counts, and a second one in reach would not stack.
    expect(getBedState(bedId)?.plantedAt).toBe(after - 2000);
  });

  it('a compost heap works for a while per harvest and doubles growth meanwhile', () => {
    const bedId = plantedPlanter();
    give({ 'mat-wood': 3 });
    expect(placePiece('garden', 'compost', NEXT.x, NEXT.y)).toBeNull();
    const act = (): string => (machineAction('garden', NEXT.x, NEXT.y) as NonNullable<ReturnType<typeof machineAction>>).act();

    expect(act()).toMatch(/Pflanzenreste/); // nothing to feed it yet
    give({ 'produce-tendril': 5 });
    expect(act()).toMatch(/arbeitet/);
    expect(isCompostActive('garden', NEXT.x, NEXT.y)).toBe(true);
    expect(gameState.getItemCount('produce-tendril')).toBe(4);

    const before = getBedState(bedId)?.plantedAt as number;
    const now = Date.now();
    tickMachines(now - 3000, now);
    expect(getBedState(bedId)?.plantedAt).toBe(before - 3000);

    act();
    act();
    expect(act()).toMatch(/satt/);
    expect(gameState.getItemCount('produce-tendril')).toBe(2);
    expect(isCompostActive('garden', NEXT.x, NEXT.y, Date.now() + COMPOST_MS * 3 + 1000)).toBe(false);
  });

  it('a drying rack turns one harvest into two seeds, and hands it back if taken down', () => {
    give({ 'mat-wood': 4, 'mat-scrap': 2, 'produce-scent-bundle': 2 });
    expect(placePiece('garden', 'drying-rack', SPOT.x, SPOT.y)).toBeNull();
    const rack = (): NonNullable<ReturnType<typeof machineAction>> => machineAction('garden', SPOT.x, SPOT.y) as NonNullable<ReturnType<typeof machineAction>>;

    expect(rack().label).toBe('Trocknen');
    expect(rack().act()).toMatch(/Trocknen/);
    expect(gameState.getItemCount('produce-scent-bundle')).toBe(1);
    expect(rack().label).toBe('Prüfen');
    expect(rack().act()).toMatch(/trocknen noch/);

    // The rack runs on real time; wind it forward by editing the saved ready time.
    const state = gameState.getExt<{ stations: Record<string, { readyAt: number }> }>('machines', { stations: {} });
    state.stations[`garden:${SPOT.x}:${SPOT.y}`].readyAt = Date.now() - 1;
    gameState.setExt('machines', state);
    expect(rack().label).toBe('Samen nehmen');
    expect(rack().act()).toBe('+2 Lavendel-Samen');
    expect(gameState.getItemCount('seed-lavender')).toBe(RACK_SEEDS);

    // A second batch in progress comes back as the harvest when the rack is dismantled.
    rack().act();
    expect(gameState.getItemCount('produce-scent-bundle')).toBe(0);
    expect(removePiece('garden', SPOT.x, SPOT.y)).toBeNull();
    expect(gameState.getItemCount('produce-scent-bundle')).toBe(1);
    expect(gameState.getExt<{ stations: object }>('machines', { stations: {} }).stations).toEqual({});
  });

  it('a windmill grinds two harvests into one flour and returns them if removed mid-grind', () => {
    give({ 'mat-wood': 4, 'mat-stone': 3, 'mat-scrap': 2 });
    expect(placePiece('garden', 'windmill', SPOT.x, SPOT.y)).toBeNull();
    const mill = (): NonNullable<ReturnType<typeof machineAction>> => machineAction('garden', SPOT.x, SPOT.y) as NonNullable<ReturnType<typeof machineAction>>;

    expect(mill().act()).toMatch(/braucht 2 Ernten/);
    give({ 'produce-tendril': 1, 'produce-nectar': 1 });
    expect(mill().act()).toMatch(/Flügel/);
    expect(gameState.getItemCount('produce-tendril') + gameState.getItemCount('produce-nectar')).toBe(0);
    expect(mill().label).toBe('Prüfen');

    expect(removePiece('garden', SPOT.x, SPOT.y)).toBeNull();
    expect(gameState.getItemCount('produce-tendril')).toBe(1);
    expect(gameState.getItemCount('produce-nectar')).toBe(1);

    give({ 'mat-wood': 4, 'mat-stone': 3, 'mat-scrap': 2 });
    expect(placePiece('garden', 'windmill', SPOT.x, SPOT.y)).toBeNull();
    mill().act();
    const state = gameState.getExt<{ stations: Record<string, { readyAt: number }> }>('machines', { stations: {} });
    state.stations[`garden:${SPOT.x}:${SPOT.y}`].readyAt = Date.now() - MILL_GRIND_MS;
    gameState.setExt('machines', state);
    expect(mill().label).toBe('Mehl holen');
    expect(mill().act()).toBe('+1 Blütenmehl');
    expect(gameState.getItemCount(FLOUR_ITEM_ID)).toBe(1);
  });

  it('the barrel offers no action, and old saves without machines load fine', () => {
    give({ 'mat-wood': 3, 'mat-scrap': 1 });
    expect(placePiece('garden', 'rain-barrel', SPOT.x, SPOT.y)).toBeNull();
    expect(machineAction('garden', SPOT.x, SPOT.y)).toBeNull();
    expect(gameState.getExt('machines', { stations: {} })).toEqual({ stations: {} });
  });
});
