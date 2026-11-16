/**
 * Helper animals. No Phaser dependency — their sprites and the collect interactions live in
 * systems/animalLayer.ts, the same split as plants.ts / plantLayer.ts.
 *
 * Animals move in by themselves when their home (a `BuildableDef` with `home`) is built; there
 * is nothing to feed or tend, and nothing is lost if they are left alone. What they do:
 *
 *   bees    (Bienenstock)   beds within BEE_RADIUS_TILES grow and regrow faster, every second
 *                           harvest from them yields one extra, and the hive fills with honey
 *                           while there is something in bloom nearby
 *   hens    (Hühnerstall)   keep snails off the beds within HEN_RADIUS_TILES (night event) and
 *                           lay eggs that wait in the house
 *   goat    (Ziegengehege)  every night grazes the nearest blight and opens one bramble
 *                           within GOAT_RADIUS_TILES
 *   horse   (Pferdestall)   once Mohn is befriended, a night with a stable standing leaves her
 *                           rested: riding is a little faster until the next night
 *
 * State: `ext.animals = { stamps: { "<mapId>:<x>:<y>": epoch ms }, rested: boolean }`.
 * A stamp is when the home last gave its produce (or was built); produce is derived from it,
 * so it keeps coming while the game is closed. Old saves simply start without any.
 *
 *   getHomes(animal?)                 every built home, with its map
 *   readyProduce(home)                { itemId, count, max } for hens and bees, else null
 *   collectProduce(home)              hands the waiting produce to the player
 *   isCoveredByHens(mapId, px, py)    used by the snail night (systems/nightEvents.ts)
 *   isHorseRested() / feedHorse()     the stable's effect (honey rests Mohn at once)
 *   startAnimals()                    call once at boot
 */
import { content } from '../content';
import { allPlantingBeds } from '../world';
import { TILE_SIZE } from '../world/tiles';
import { clearBlightTiles, getBlightTiles, onNightfall } from './blight';
import { getPieces, type PlacedPiece } from './building';
import { bus } from './events';
import { hasHorse } from './horse';
import { getBedState, isBedPlanted, speedUpBeds } from './plants';
import { getObstacles, isBlocked, unblockPath } from './obstacles';
import { gameState } from './state';

export type AnimalKind = 'bees' | 'hens' | 'goat' | 'horse' | 'ducks';

export const BEE_RADIUS_TILES = 6;
/** Extra growth per second of real time for a bed the bees visit (0.5 = half as fast again). */
export const BEE_GROWTH_BONUS = 0.5;
export const HEN_RADIUS_TILES = 9;
export const DUCK_RADIUS_TILES = 9;
export const GOAT_RADIUS_TILES = 10;
/** Blight tiles one goat grazes per night (a heart grows six). */
export const GOAT_BITES_PER_NIGHT = 6;
export const RESTED_SPEED_FACTOR = 1.12;

export const EGG_INTERVAL_MS = 75_000;
export const EGGS_MAX = 4;
export const HONEY_INTERVAL_MS = 120_000;
export const HONEY_MAX = 3;
export const DUCK_INTERVAL_MS = 90_000;
export const DUCK_MAX = 3;
const TICK_MS = 3000;

export interface Home extends PlacedPiece {
  mapId: string;
  animal: AnimalKind;
}

interface AnimalsExt {
  stamps: Record<string, number>;
  rested: boolean;
}

const readState = (): AnimalsExt => gameState.getExt<AnimalsExt>('animals', { stamps: {}, rested: false });

export const homeKey = (h: { mapId: string; x: number; y: number }): string => `${h.mapId}:${h.x}:${h.y}`;

/** Every built animal home, on every map. */
export function getHomes(animal?: AnimalKind): Home[] {
  const homes: Home[] = [];
  const built = gameState.getExt<{ pieces: Record<string, PlacedPiece[]> }>('building', { pieces: {} }).pieces;
  for (const mapId of Object.keys(built)) {
    for (const piece of getPieces(mapId)) {
      const kind = content.buildables.find(piece.id)?.home?.animal;
      if (kind && (!animal || kind === animal)) homes.push({ ...piece, mapId, animal: kind });
    }
  }
  return homes;
}

/** Gives new homes a start time and forgets the ones that were taken down. */
function syncStamps(): void {
  const state = readState();
  const homes = getHomes();
  const wanted = new Set(homes.map(homeKey));
  let dirty = false;
  for (const h of homes) {
    if (state.stamps[homeKey(h)] === undefined) {
      state.stamps[homeKey(h)] = Date.now();
      dirty = true;
    }
  }
  for (const k of Object.keys(state.stamps)) {
    if (!wanted.has(k)) {
      delete state.stamps[k];
      dirty = true;
    }
  }
  if (dirty) {
    gameState.setExt('animals', state);
    gameState.save();
  }
}

const centre = (h: { x: number; y: number }): { x: number; y: number } => ({ x: h.x + 0.5, y: h.y + 0.5 });

/** Planted beds on the home's map within `radius` tiles of it. */
export function plantedBedsNear(h: Home, radius = BEE_RADIUS_TILES): { id: string }[] {
  const c = centre(h);
  return allPlantingBeds().filter(
    (b) =>
      b.mapId === h.mapId &&
      isBedPlanted(b.id) &&
      Math.hypot(b.rect.x + b.rect.w / 2 - c.x, b.rect.y + b.rect.h / 2 - c.y) <= radius,
  );
}

// ── Produce ──────────────────────────────────────────────────

export interface Produce {
  itemId: string;
  count: number;
  max: number;
}

export function readyProduce(h: Home): Produce | null {
  const stamp = readState().stamps[homeKey(h)] ?? Date.now();
  const elapsed = Date.now() - stamp;
  if (h.animal === 'hens') {
    return { itemId: 'produce-egg', count: Math.min(EGGS_MAX, Math.floor(elapsed / EGG_INTERVAL_MS)), max: EGGS_MAX };
  }
  if (h.animal === 'bees') {
    return { itemId: 'produce-honey', count: Math.min(HONEY_MAX, Math.floor(elapsed / HONEY_INTERVAL_MS)), max: HONEY_MAX };
  }
  if (h.animal === 'ducks') {
    return { itemId: 'resource-dew', count: Math.min(DUCK_MAX, Math.floor(elapsed / DUCK_INTERVAL_MS)), max: DUCK_MAX };
  }
  return null;
}

/** Gives the waiting produce to the player and starts the next batch. Null if there is none. */
export function collectProduce(h: Home): Produce | null {
  const ready = readyProduce(h);
  if (!ready || ready.count === 0) return null;
  const state = readState();
  state.stamps[homeKey(h)] = Date.now();
  gameState.setExt('animals', state);
  gameState.addItem(ready.itemId, ready.count);
  gameState.setFlag(`animal-produce:${ready.itemId}`);
  gameState.save();
  return ready;
}

// ── Bees ─────────────────────────────────────────────────────

let lastTick = Date.now();

export function tickBees(): void {
  const now = Date.now();
  const elapsed = Math.min(now - lastTick, 15_000);
  lastTick = now;
  const state = readState();
  let stampsChanged = false;
  const ids = new Set<string>();
  for (const hive of getHomes('bees')) {
    const beds = plantedBedsNear(hive, BEE_RADIUS_TILES);
    for (const b of beds) ids.add(b.id);
    // Honey needs something in bloom: with nothing planted nearby the next batch starts over.
    if (beds.length === 0) {
      state.stamps[homeKey(hive)] = now;
      stampsChanged = true;
    }
  }
  if (stampsChanged) gameState.setExt('animals', state);
  if (ids.size > 0) speedUpBeds([...ids], elapsed * BEE_GROWTH_BONUS);
}

/** True if a hive stands within reach of this bed. */
export function isPollinated(bedId: string): boolean {
  const bed = allPlantingBeds().find((b) => b.id === bedId);
  if (!bed) return false;
  return getHomes('bees').some(
    (h) =>
      h.mapId === bed.mapId &&
      Math.hypot(bed.rect.x + bed.rect.w / 2 - (h.x + 0.5), bed.rect.y + bed.rect.h / 2 - (h.y + 0.5)) <= BEE_RADIUS_TILES,
  );
}

// ── Hens & ducks ─────────────────────────────────────────────

/** True if a henhouse on this map is close enough (px position) to keep snails off. */
export function isCoveredByHens(mapId: string, px: number, py: number): boolean {
  return getHomes('hens').some(
    (h) => h.mapId === mapId && Math.hypot((h.x + 0.5) * TILE_SIZE - px, (h.y + 0.5) * TILE_SIZE - py) <= HEN_RADIUS_TILES * TILE_SIZE,
  );
}

/** True if a duckhouse on this map is close enough (px position) to keep snails off shore beds. */
export function isCoveredByDucks(mapId: string, px: number, py: number): boolean {
  return getHomes('ducks').some(
    (h) => h.mapId === mapId && Math.hypot((h.x + 0.5) * TILE_SIZE - px, (h.y + 0.5) * TILE_SIZE - py) <= DUCK_RADIUS_TILES * TILE_SIZE,
  );
}

// ── Goat ─────────────────────────────────────────────────────

function graze(): void {
  const playerMap = gameState.data.player.mapId;
  for (const pen of getHomes('goat')) {
    const c = centre(pen);
    const near = (x: number, y: number): number => Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y);
    const bites = getBlightTiles(pen.mapId)
      .filter((t) => near(t.x, t.y) <= GOAT_RADIUS_TILES)
      .sort((a, b) => near(a.x, a.y) - near(b.x, b.y))
      .slice(0, GOAT_BITES_PER_NIGHT);
    const eaten = bites.length > 0 ? clearBlightTiles(pen.mapId, bites) : 0;
    const bramble = getObstacles(pen.mapId)
      .filter((o) => o.blockedBy === 'bramble' && o.removable && isBlocked(o.id))
      .map((o) => ({ o, d: Math.hypot(o.rect.x + o.rect.w / 2 - c.x, o.rect.y + o.rect.h / 2 - c.y) }))
      .filter((e) => e.d <= GOAT_RADIUS_TILES)
      .sort((a, b) => a.d - b.d)[0];
    const opened = bramble ? unblockPath(bramble.o.id) : false;
    if (opened) gameState.setFlag('goat-cleared-bramble');
    if (eaten > 0) gameState.setFlag('goat-grazed');
    if (pen.mapId !== playerMap) continue;
    if (opened) bus.emit('toast', { text: 'Die Ziege hat sich in der Nacht durchs Gestrüpp gefressen.' });
    else if (eaten > 0) bus.emit('toast', { text: 'Die Ziege hat Welke abgeweidet.' });
  }
}

// ── Mohn and the stable ──────────────────────────────────────

export function isHorseRested(): boolean {
  return hasHorse() && readState().rested;
}

function setRested(rested: boolean): void {
  const state = readState();
  if (state.rested === rested) return;
  state.rested = rested;
  gameState.setExt('animals', state);
  gameState.save();
}

/** Honey at the stable rests Mohn at once. Returns false if she is not here, already rested, or there is no honey. */
export function feedHorse(): boolean {
  if (!hasHorse() || isHorseRested() || !gameState.removeItem('produce-honey', 1)) return false;
  setRested(true);
  return true;
}

function nightAtStable(): void {
  const rested = hasHorse() && getHomes('horse').length > 0;
  if (rested && !readState().rested) {
    bus.emit('toast', { text: 'Mohn hat im Stall gut geschlafen und trabt heute munterer.' });
  }
  setRested(rested);
}

// ── Pollinated harvests ──────────────────────────────────────

bus.on('plant-harvested', ({ bedId, itemId }) => {
  if (!isPollinated(bedId)) return;
  if ((getBedState(bedId)?.harvests ?? 0) % 2 !== 0) return;
  gameState.addItem(itemId, 1);
  bus.emit('toast', { text: `Die Bienen waren da: ein zweites ${content.items.get(itemId).name}.` });
});

bus.on('build-changed', syncStamps);
bus.on('save-loaded', () => {
  lastTick = Date.now();
  syncStamps();
});

let started = false;
/** Starts the bees' ticker and the night routines. Call once at boot. */
export function startAnimals(): void {
  if (started) return;
  started = true;
  lastTick = Date.now();
  syncStamps();
  window.setInterval(tickBees, TICK_MS);
  onNightfall(graze);
  onNightfall(nightAtStable);
}
