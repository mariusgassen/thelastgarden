import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { content } from '../../src/content';
import {
  collectProduce,
  EGG_INTERVAL_MS,
  feedHorse,
  getHomes,
  GOAT_BITES_PER_NIGHT,
  HONEY_INTERVAL_MS,
  isCoveredByHens,
  isHorseRested,
  isPollinated,
  readyProduce,
  startAnimals,
  tickBees,
} from '../../src/systems/animals';
import { BLIGHT_FLAG, blightNightfall, getBlightTiles, restUntilMorning } from '../../src/systems/blight';
import { getPieces, placePiece, planterBedId, removePiece, whyNotPlace } from '../../src/systems/building';
import { HORSE_FLAG } from '../../src/systems/horse';
import { isBlocked } from '../../src/systems/obstacles';
import { currentStage, getBedState, plantSeed } from '../../src/systems/plants';
import { parseSave } from '../../src/systems/save';
import { gameState } from '../../src/systems/state';
import { TILE_SIZE } from '../../src/world/tiles';

const give = (items: Record<string, number>): void => {
  for (const [id, n] of Object.entries(items)) gameState.addItem(id, n);
};
const SPOT = { x: 22, y: 37 };

/** The first free tile within `radius` of (cx, cy) where `piece` can be built. */
function freeTileNear(piece: string, cx: number, cy: number, radius: number): { x: number; y: number } {
  for (let r = 0; r <= radius; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (whyNotPlace('garden', piece, cx + dx, cy + dy) === null) return { x: cx + dx, y: cy + dy };
      }
  throw new Error(`no room for ${piece} near ${cx},${cy}`);
}

describe('helper animals', () => {
  beforeAll(() => startAnimals());
  beforeEach(() => {
    localStorage.clear();
    gameState.reset();
    give({ 'mat-wood': 40, 'mat-stone': 20, 'mat-scrap': 10, 'produce-tendril': 5, 'produce-light-pollen': 5 });
  });
  afterEach(() => vi.useRealTimers());

  it('gives every home a piece of its own, with items for the cost', () => {
    const homes = content.buildables.all().filter((b) => b.home);
    expect(homes.map((b) => b.home!.animal).sort()).toEqual(['bees', 'goat', 'hens', 'horse']);
    expect(content.items.has('produce-egg') && content.items.has('produce-honey')).toBe(true);
  });

  it('lays eggs over time, up to four, and starts over when they are taken', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    expect(placePiece('garden', 'henhouse', SPOT.x, SPOT.y)).toBeNull();
    const [house] = getHomes('hens');
    expect(readyProduce(house)?.count).toBe(0);
    vi.setSystemTime(1_000_000 + EGG_INTERVAL_MS * 2 + 1);
    expect(readyProduce(house)?.count).toBe(2);
    vi.setSystemTime(1_000_000 + EGG_INTERVAL_MS * 20);
    expect(readyProduce(house)?.count).toBe(4);
    expect(collectProduce(house)?.count).toBe(4);
    expect(gameState.getItemCount('produce-egg')).toBe(4);
    expect(collectProduce(house)).toBeNull();
    expect(readyProduce(house)?.count).toBe(0);
  });

  it('keeps hens only as far as they reach', () => {
    placePiece('garden', 'henhouse', SPOT.x, SPOT.y);
    expect(isCoveredByHens('garden', (SPOT.x + 3) * TILE_SIZE, SPOT.y * TILE_SIZE)).toBe(true);
    expect(isCoveredByHens('garden', (SPOT.x + 20) * TILE_SIZE, SPOT.y * TILE_SIZE)).toBe(false);
    expect(isCoveredByHens('orchard', SPOT.x * TILE_SIZE, SPOT.y * TILE_SIZE)).toBe(false);
    removePiece('garden', SPOT.x, SPOT.y);
    expect(getHomes()).toEqual([]);
    expect(isCoveredByHens('garden', SPOT.x * TILE_SIZE, SPOT.y * TILE_SIZE)).toBe(false);
  });

  it('makes bees speed up growth and fill the hive only while something blooms nearby', () => {
    vi.useFakeTimers();
    vi.setSystemTime(2_000_000);
    give({ 'seed-lavender': 1 });
    placePiece('garden', 'planter', SPOT.x, SPOT.y);
    const bedId = planterBedId('garden', SPOT.x, SPOT.y);
    placePiece('garden', 'beehive', SPOT.x + 2, SPOT.y);
    const [hive] = getHomes('bees');
    expect(isPollinated(bedId)).toBe(true);

    // Nothing planted yet: the honey clock keeps starting over.
    vi.setSystemTime(2_000_000 + HONEY_INTERVAL_MS * 3);
    tickBees();
    expect(readyProduce(hive)?.count).toBe(0);

    expect(plantSeed(bedId)).toBe(true);
    const before = getBedState(bedId)!.plantedAt;
    vi.setSystemTime(Date.now() + 10_000);
    tickBees();
    expect(before - getBedState(bedId)!.plantedAt).toBeGreaterThan(4_000); // half again as fast
    expect(currentStage(getBedState(bedId)!)).toBeGreaterThanOrEqual(0);

    vi.setSystemTime(Date.now() + HONEY_INTERVAL_MS * 2 + 1);
    expect(readyProduce(hive)?.count).toBe(2);
    expect(collectProduce(hive)?.itemId).toBe('produce-honey');
  });

  it('does not reach beds on other maps or far away', () => {
    placePiece('garden', 'beehive', SPOT.x, SPOT.y);
    expect(isPollinated('bed-bramble')).toBe(false);
  });

  it('lets a goat graze the nearest blight and open a bramble in the night', () => {
    gameState.setFlag(BLIGHT_FLAG);
    const pen = freeTileNear('goatpen', 33, 17, 5);
    expect(placePiece('garden', 'goatpen', pen.x, pen.y)).toBeNull();
    expect(isBlocked('bramble-greenhouse-yard')).toBe(true);
    blightNightfall();
    const before = getBlightTiles('garden').length;
    restUntilMorning(); // a night: blight grows, then the goat grazes
    expect(isBlocked('bramble-greenhouse-yard')).toBe(false);
    expect(gameState.hasFlag('goat-cleared-bramble')).toBe(true);
    expect(getBlightTiles('garden').length).toBeLessThan(before + 6 * 4);
    expect(GOAT_BITES_PER_NIGHT).toBeGreaterThan(0);
  });

  it('rests Mohn after a night in the stable, or at once with honey', () => {
    placePiece('garden', 'stable', SPOT.x, SPOT.y);
    restUntilMorning();
    expect(isHorseRested()).toBe(false); // she is not befriended yet
    gameState.setFlag(HORSE_FLAG);
    expect(feedHorse()).toBe(false); // no honey
    give({ 'produce-honey': 1 });
    expect(feedHorse()).toBe(true);
    expect(isHorseRested()).toBe(true);
    expect(gameState.getItemCount('produce-honey')).toBe(0);
    removePiece('garden', SPOT.x, SPOT.y);
    restUntilMorning();
    expect(isHorseRested()).toBe(false); // nobody slept in a stable
    restUntilMorning();
    expect(getPieces('garden')).toEqual([]);
  });

  it('loads a save from before the animals existed', () => {
    const save = parseSave(JSON.stringify({ version: 1, player: { mapId: 'garden', x: 800, y: 1000, facing: 'left' }, ext: {} }));
    gameState.data = save!;
    expect(getHomes()).toEqual([]);
    expect(isHorseRested()).toBe(false);
  });
});
