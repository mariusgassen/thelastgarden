/**
 * The blight ("die Welke"): grey wilt that creeps back over open ground every night and is
 * held off by what the player builds and grows. No Phaser dependency — rendering lives in
 * systems/blightLayer.ts.
 *
 * It grows from the hearts in the map data (`MapDef.blightHearts`), a few tiles per night,
 * at most `reach` steps from its heart, and never
 *   - through anything built (every piece is a wall),
 *   - into a ward: the tiles around a lantern, hedge or shelter (`BuildableDef.wardRadius`)
 *     and around every mature plant.
 * Blight that loses its connection to a living heart dries up at once, so a lantern at its
 * edge pushes it back, a fence line starves what lies behind it, and a ward over the heart
 * itself seals it for as long as the ward stands.
 *
 * Blighted ground can be walked on (slowly), but nothing can be built on it and renewable
 * pickups on it stay gone. There is no fail state: every heart's reach is bounded.
 *
 * State: `ext.blight = { tiles: { [mapId]: "x,y"[] } }`. It sleeps until BLIGHT_FLAG is set.
 *
 *   blightNightfall()        one night of growth on every map; called at dusk and by resting
 *   refreshBlight(mapId)     drop blight that is warded or cut off; call after wards change
 *   isBlighted(mapId, x, y) / isBlightedPx(mapId, px, py)
 *   getBlightTiles(mapId) / getWards(mapId) / isHeartSealed(heart)
 *   restUntilMorning()       a shelter's rest: skips the clock to morning, the night still counts
 *   startBlightScheduler()   call once at boot
 */
import { content } from '../content';
import { allBlightHearts, allPlantingBeds, MAPS } from '../world';
import { TILE_SIZE } from '../world/tiles';
import type { BlightHeartDef } from '../world/types';
import { addPlacementBlocker, getPieceAt, getPieces, isTileWalkable } from './building';
import { getDayTime, setDayTimeHour } from './dayClock';
import { bus } from './events';
import { isBedMature } from './plants';
import { gameState } from './state';

/** The blight wakes once the garden's first chapter is done; older saves that are past it get it on load. */
export const BLIGHT_FLAG = 'episode-1-complete';
/** New tiles per living heart and night. */
export const GROWTH_PER_NIGHT = 6;
/** A mature plant wards this many tiles around its bed (plus a little for wide beds). */
const PLANT_WARD_TILES = 3;

export type HeartWithMap = BlightHeartDef & { mapId: string };

interface BlightExt {
  tiles: Record<string, string[]>;
}

export interface Ward {
  /** Centre in tiles (fractional). */
  x: number;
  y: number;
  radius: number;
}

const key = (x: number, y: number): string => `${x},${y}`;

function readState(): BlightExt {
  return gameState.getExt<BlightExt>('blight', { tiles: {} });
}

const tileSets = new Map<string, Set<string>>();

function tileSet(mapId: string): Set<string> {
  let set = tileSets.get(mapId);
  if (!set) {
    set = new Set(readState().tiles[mapId] ?? []);
    tileSets.set(mapId, set);
  }
  return set;
}

function writeTiles(mapId: string, tiles: string[]): void {
  const state = readState();
  if (tiles.length > 0) state.tiles[mapId] = tiles;
  else delete state.tiles[mapId];
  gameState.setExt('blight', state);
  tileSets.set(mapId, new Set(tiles));
  bus.emit('blight-changed', { mapId });
}

export function isBlightAwake(): boolean {
  return gameState.hasFlag(BLIGHT_FLAG);
}

export function getBlightTiles(mapId: string): { x: number; y: number }[] {
  return [...tileSet(mapId)].map((k) => {
    const [x, y] = k.split(',').map(Number);
    return { x, y };
  });
}

export function isBlighted(mapId: string, x: number, y: number): boolean {
  return tileSet(mapId).has(key(x, y));
}

export function isBlightedPx(mapId: string, px: number, py: number): boolean {
  return isBlighted(mapId, Math.floor(px / TILE_SIZE), Math.floor(py / TILE_SIZE));
}

export function getHearts(mapId: string): HeartWithMap[] {
  return allBlightHearts().filter((h) => h.mapId === mapId);
}

/** Everything on a map that keeps the blight away from the tiles around it. */
export function getWards(mapId: string): Ward[] {
  const wards: Ward[] = [];
  for (const piece of getPieces(mapId)) {
    const radius = content.buildables.find(piece.id)?.wardRadius;
    if (radius) wards.push({ x: piece.x + 0.5, y: piece.y + 0.5, radius });
  }
  for (const bed of allPlantingBeds()) {
    if (bed.mapId !== mapId || !isBedMature(bed.id)) continue;
    wards.push({
      x: bed.rect.x + bed.rect.w / 2,
      y: bed.rect.y + bed.rect.h / 2,
      radius: PLANT_WARD_TILES + Math.max(bed.rect.w, bed.rect.h) / 4,
    });
  }
  return wards;
}

function isWarded(x: number, y: number, wards: Ward[]): boolean {
  return wards.some((w) => Math.hypot(x + 0.5 - w.x, y + 0.5 - w.y) <= w.radius);
}

/** A heart is sealed while a ward covers its own tile. */
export function isHeartSealed(heart: HeartWithMap, wards = getWards(heart.mapId)): boolean {
  return isWarded(heart.at.x, heart.at.y, wards);
}

/** Tiles a living heart can hold, nearest first: open, unbuilt, unwarded ground within its reach. */
function domain(heart: HeartWithMap, wards: Ward[]): string[] {
  if (isHeartSealed(heart, wards)) return [];
  const open = (x: number, y: number): boolean =>
    isTileWalkable(heart.mapId, x, y) && !getPieceAt(heart.mapId, x, y) && !isWarded(x, y, wards);
  if (!open(heart.at.x, heart.at.y)) return [];
  const order: string[] = [];
  const seen = new Set<string>([key(heart.at.x, heart.at.y)]);
  let frontier = [heart.at];
  for (let dist = 0; dist <= heart.reach && frontier.length > 0; dist++) {
    const next: { x: number; y: number }[] = [];
    for (const t of frontier) {
      order.push(key(t.x, t.y));
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const n = { x: t.x + dx, y: t.y + dy };
        if (seen.has(key(n.x, n.y)) || !open(n.x, n.y)) continue;
        seen.add(key(n.x, n.y));
        next.push(n);
      }
    }
    frontier = next;
  }
  return order;
}

/** Hearts seen sealed at the last refresh; only used to announce a fresh seal once. */
const sealedMemo = new Map<string, boolean>();

/**
 * Removes blight that is warded or no longer connected to a living heart. Returns how many
 * tiles dried up. Cheap enough to call whenever wards may have changed.
 */
export function refreshBlight(mapId: string): number {
  const hearts = getHearts(mapId);
  if (hearts.length === 0 || !isBlightAwake()) return 0;
  const wards = getWards(mapId);
  const alive = new Set<string>();
  for (const heart of hearts) {
    const sealed = isHeartSealed(heart, wards);
    if (sealed) gameState.setFlag('blight-heart-sealed');
    if (sealed && sealedMemo.get(heart.id) === false && mapId === gameState.data.player.mapId) {
      bus.emit('toast', { text: 'Der Welkenherd ist versiegelt. Die Welke um ihn verdorrt.' });
    }
    sealedMemo.set(heart.id, sealed);
    for (const k of domain(heart, wards)) alive.add(k);
  }
  const before = tileSet(mapId);
  const kept = [...before].filter((k) => alive.has(k));
  const dried = before.size - kept.length;
  if (dried > 0) {
    writeTiles(mapId, kept);
    gameState.setFlag('blight-pushed-back');
  }
  return dried;
}

/** One night: on every map, each living heart takes its next few tiles. Returns the growth on the player's map. */
export function blightNightfall(): number {
  if (!isBlightAwake()) return 0;
  let grownHere = 0;
  for (const mapId of new Set(allBlightHearts().map((h) => h.mapId))) {
    refreshBlight(mapId);
    const wards = getWards(mapId);
    const tiles = new Set(tileSet(mapId));
    const sizeBefore = tiles.size;
    for (const heart of getHearts(mapId)) {
      let budget = GROWTH_PER_NIGHT;
      for (const k of domain(heart, wards)) {
        if (budget === 0) break;
        if (tiles.has(k)) continue;
        tiles.add(k);
        budget--;
      }
    }
    if (tiles.size === sizeBefore) continue;
    writeTiles(mapId, [...tiles]);
    if (mapId === gameState.data.player.mapId) grownHere = tiles.size - sizeBefore;
  }
  gameState.save();
  return grownHere;
}

addPlacementBlocker((mapId, x, y) =>
  isBlighted(mapId, x, y) ? 'Auf der Welke hält nichts. Dränge sie erst zurück.' : null,
);

bus.on('build-changed', ({ mapId }) => refreshBlight(mapId));
bus.on('save-loaded', () => {
  tileSets.clear();
  sealedMemo.clear();
});

// ── Nights ───────────────────────────────────────────────────

/** True once this night's growth has happened; reset when the day comes. */
let nightDone = false;

function nightfallWithToast(): void {
  if (blightNightfall() > 0) bus.emit('toast', { text: 'Die Welke kriecht in der Dunkelheit näher.' });
}

/** A shelter's rest: the night passes (the blight grows as on any night) and it is morning. */
export function restUntilMorning(): void {
  if (!nightDone) nightfallWithToast();
  nightDone = false;
  setDayTimeHour(7);
}

let schedulerTimer: number | undefined;
/** Grows the blight once per in-game night and keeps the player's map in step with its wards. Call once at boot. */
export function startBlightScheduler(): void {
  if (schedulerTimer !== undefined) return;
  schedulerTimer = window.setInterval(() => {
    const { phase } = getDayTime();
    if (phase === 'night' && !nightDone) {
      nightDone = true;
      nightfallWithToast();
    } else if (phase === 'day') {
      nightDone = false;
    }
    // Plants mature on their own clock, so their wards appear without an event.
    if (MAPS[gameState.data.player.mapId]?.blightHearts) refreshBlight(gameState.data.player.mapId);
  }, 1000);
}
