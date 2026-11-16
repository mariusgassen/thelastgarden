/**
 * Free building on the map grid. No Phaser dependency — rendering lives in
 * systems/buildLayer.ts (scene-bound), the same split as plants.ts / plantLayer.ts.
 *
 * Pieces are content (content/buildables.ts). Placed pieces live in `ext.building`:
 *   { pieces: { [mapId]: { id, x, y }[] } }        x/y = whole tile coordinates
 *
 *   isBuildUnlocked()                 true once the first raw material was gathered
 *   getPieces(mapId) / getPieceAt()
 *   whyNotPlace(mapId, pieceId, x, y, player?)   German reason, or null if it fits
 *   placePiece(...) / removePiece(...)           spend / refund the cost; emit `build-changed`
 *   isTileWalkable(mapId, x, y)       map tiles plus bridges, minus solid pieces
 *   getBuildMode() / setBuildMode() / selectBuildPiece()   runtime only, emits `build-mode-changed`
 *   addPlacementBlocker(fn)           lets another system veto a tile (the blight does)
 *
 * Roden (`on: 'forest'`) is no piece: it moves tiles of the map's `clearable` forest into
 * `ext.building.cleared` ({ [mapId]: "x,y"[] }), which every ground query below then treats as open grass.
 */
import { content } from '../content';
import type { BuildableDef } from '../content/types';
import { MAPS, setDynamicBedProvider } from '../world';
import { buildTileGrid } from '../world/grid';
import { TILE_SIZE, TILES, type TileId } from '../world/tiles';
import type { PlantingBedDef, TileRect } from '../world/types';
import { bus } from './events';
import { isBlocked } from './obstacles';
import { clearBed } from './plants';
import { gameState } from './state';

export interface PlacedPiece {
  id: string;
  x: number;
  y: number;
}

interface BuildingExt {
  pieces: Record<string, PlacedPiece[]>;
  /** Forest tiles cut back by the player, per map. Missing in older saves. */
  cleared?: Record<string, string[]>;
}

/** What a cleared forest tile turns into. */
export const CLEARED_TILE: TileId = 'wildGrass';
/** Roden works on a square of this many tiles around the one the player picks. */
export const CLEAR_SIZE = 3;

/** Set by the first gathered raw material (systems/resources.ts); unlocks build mode. */
export const BUILD_UNLOCK_FLAG = 'gathered-material';
/** How far from the player's feet a tile may be built on or cleared, in tiles. */
export const BUILD_REACH_TILES = 3.5;
/** Tiles this close to a door, sign, pickup, NPC or arrival point stay free. */
const KEEP_CLEAR_TILES = 1.2;

function readState(): BuildingExt {
  return gameState.getExt<BuildingExt>('building', { pieces: {} });
}

export function isBuildUnlocked(): boolean {
  return gameState.hasFlag(BUILD_UNLOCK_FLAG);
}

export function getPieces(mapId: string): PlacedPiece[] {
  return readState().pieces[mapId] ?? [];
}

const clearedCache = new Map<string, { src: string[]; set: Set<string> }>();

function clearedSet(mapId: string): Set<string> {
  const src = readState().cleared?.[mapId];
  if (!src) return new Set();
  const hit = clearedCache.get(mapId);
  if (hit && hit.src === src && hit.set.size === src.length) return hit.set;
  const set = new Set(src);
  clearedCache.set(mapId, { src, set });
  return set;
}

/** Tiles of `mapId` the player has cut free so far, as [x, y]. */
export function getClearedTiles(mapId: string): [number, number][] {
  return (readState().cleared?.[mapId] ?? []).map((k) => k.split(',').map(Number) as [number, number]);
}

export function isCleared(mapId: string, x: number, y: number): boolean {
  return clearedSet(mapId).has(key(x, y));
}

export function getPieceAt(mapId: string, x: number, y: number): PlacedPiece | undefined {
  return getPieces(mapId).find((p) => p.x === x && p.y === y);
}

export function planterBedId(mapId: string, x: number, y: number): string {
  return `planter:${mapId}:${x}:${y}`;
}

// Built planters and floating beds become planting beds like the ones in map data (see world/index.ts).
setDynamicBedProvider(() => {
  const beds: (PlantingBedDef & { mapId: string })[] = [];
  for (const [mapId, pieces] of Object.entries(readState().pieces)) {
    for (const p of pieces) {
      const def = content.buildables.find(p.id);
      const slots = def?.planter;
      if (!slots) continue;
      beds.push({
        id: planterBedId(mapId, p.x, p.y),
        mapId,
        rect: { x: p.x, y: p.y - 0.1, w: 1, h: 1 },
        slots,
        plantScale: 0.78,
        floating: def?.on === 'water',
      });
    }
  }
  return beds;
});

// ── Static map knowledge (cached; maps never change at runtime) ──────────────

interface MapInfo {
  grid: TileId[][];
  keepClear: Set<string>;
}

const mapInfoCache = new Map<string, MapInfo>();
const key = (x: number, y: number): string => `${x},${y}`;

function tilesOf(rect: TileRect): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = Math.floor(rect.y); y < Math.ceil(rect.y + rect.h); y++)
    for (let x = Math.floor(rect.x); x < Math.ceil(rect.x + rect.w); x++) out.push({ x, y });
  return out;
}

function mapInfo(mapId: string): MapInfo | undefined {
  const cached = mapInfoCache.get(mapId);
  if (cached) return cached;
  const map = MAPS[mapId];
  if (!map) return undefined;
  const keepClear = new Set<string>();
  for (const bed of map.plantingBeds ?? []) for (const t of tilesOf(bed.rect)) keepClear.add(key(t.x, t.y));
  for (const prop of map.props) if (prop.solid) for (const t of tilesOf(prop.solid)) keepClear.add(key(t.x, t.y));
  for (const heart of map.blightHearts ?? []) keepClear.add(key(heart.at.x, heart.at.y));
  const points = [
    ...map.interactables.map((i) => i.at),
    ...(map.npcs ?? []).map((n) => n.at),
    ...(map.journalPages ?? []).map((p) => p.at),
    ...Object.values(map.spawns),
  ];
  for (const pt of points) {
    for (let y = Math.floor(pt.y - KEEP_CLEAR_TILES); y <= Math.floor(pt.y + KEEP_CLEAR_TILES); y++)
      for (let x = Math.floor(pt.x - KEEP_CLEAR_TILES); x <= Math.floor(pt.x + KEEP_CLEAR_TILES); x++)
        if (Math.hypot(x + 0.5 - pt.x, y + 0.5 - pt.y) <= KEEP_CLEAR_TILES) keepClear.add(key(x, y));
  }
  const info = { grid: buildTileGrid(map), keepClear };
  mapInfoCache.set(mapId, info);
  return info;
}

/** True for a tile that doors, NPCs, beds, solid props and arrival points keep free (pickups roam, so they are not part of it). */
export function isKeepClearTile(mapId: string, x: number, y: number): boolean {
  return mapInfo(mapId)?.keepClear.has(key(x, y)) ?? false;
}

/** The ground at (x, y), ignoring anything built: the map's own tile, or grass where forest was cleared. */
export function baseTileAt(mapId: string, x: number, y: number): TileId | undefined {
  const tile = mapInfo(mapId)?.grid[y]?.[x];
  return tile !== undefined && isCleared(mapId, x, y) ? CLEARED_TILE : tile;
}

/** The map's own tile with cleared forest applied, as a full grid (what the scene draws). */
export function groundGrid(mapId: string): TileId[][] | undefined {
  const info = mapInfo(mapId);
  if (!info) return undefined;
  const grid = info.grid.map((row) => [...row]);
  for (const [x, y] of getClearedTiles(mapId)) if (grid[y]?.[x] !== undefined) grid[y][x] = CLEARED_TILE;
  return grid;
}

function isOpenGround(mapId: string, x: number, y: number): boolean {
  const tile = baseTileAt(mapId, x, y);
  return tile !== undefined && !TILES[tile].solid;
}

/** Walkable for followers and for the blight's spread: open ground or a bridge, with no solid piece on it. */
export function isTileWalkable(mapId: string, x: number, y: number): boolean {
  const piece = getPieceAt(mapId, x, y);
  if (!piece) return isOpenGround(mapId, x, y);
  return content.buildables.get(piece.id).solid === undefined;
}

// ── Placing and removing ─────────────────────────────────────

/** Feet position in px; lets the rules check reach and keep the player from walling themself in. */
export interface BuilderPosition {
  x: number;
  y: number;
}

type PlacementBlocker = (mapId: string, x: number, y: number) => string | null;
const placementBlockers: PlacementBlocker[] = [];

/** Another system may veto building on a tile by returning a (German) reason. */
export function addPlacementBlocker(blocker: PlacementBlocker): void {
  placementBlockers.push(blocker);
}

function inReach(x: number, y: number, player: BuilderPosition): boolean {
  return Math.hypot((x + 0.5) * TILE_SIZE - player.x, (y + 0.5) * TILE_SIZE - player.y) <= BUILD_REACH_TILES * TILE_SIZE;
}

function standsOn(x: number, y: number, player: BuilderPosition): boolean {
  return Math.floor(player.x / TILE_SIZE) === x && Math.floor(player.y / TILE_SIZE) === y;
}

export function getMissingCost(def: BuildableDef): { itemId: string; count: number }[] {
  return def.cost
    .map((c) => ({ itemId: c.itemId, count: c.count - gameState.getItemCount(c.itemId) }))
    .filter((c) => c.count > 0);
}

const itemList = (items: { itemId: string; count: number }[]): string =>
  items.map((i) => `${i.count} ${content.items.get(i.itemId).name}`).join(', ');

export function costLabel(def: BuildableDef): string {
  return def.cost.length === 0 ? 'kostenlos' : itemList(def.cost);
}

function waterSubject(def: BuildableDef): string {
  if (def.boat) return 'Das Ruderboot';
  if (def.planter) return 'Das Schwimmbeet';
  if (def.machine === 'drift-net') return 'Das Treibgut-Netz';
  if (def.home?.animal === 'ducks') return 'Das Entenhaus';
  return 'Der Steg';
}

/** Why `pieceId` cannot go on this tile right now, or null if it can. */
export function whyNotPlace(mapId: string, pieceId: string, x: number, y: number, player?: BuilderPosition): string | null {
  const def = content.buildables.find(pieceId);
  const map = MAPS[mapId];
  const info = mapInfo(mapId);
  if (!def || !map || !info) return 'Das lässt sich nicht bauen.';
  if (map.indoor) return 'Drinnen ist kein Platz zum Bauen.';
  if (player && !inReach(x, y, player)) return 'Das ist zu weit weg.';
  const tile = baseTileAt(mapId, x, y);
  if (tile === undefined) return 'Hier ist die Karte zu Ende.';
  if (def.on === 'forest') return whyNotClear(mapId, x, y) ?? missingCostReason(def);
  if (getPieceAt(mapId, x, y)) return 'Hier steht schon etwas.';
  if (def.on === 'water') {
    if (tile !== 'water') return `${waterSubject(def)} gehört aufs Wasser.`;
    const anchored = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].some(([dx, dy]) => {
      if (isOpenGround(mapId, x + dx, y + dy)) return true;
      const adj = getPieceAt(mapId, x + dx, y + dy);
      return adj !== undefined && content.buildables.find(adj.id)?.on === 'water';
    });
    if (!anchored) return `${waterSubject(def)} braucht Anschluss ans Ufer oder einen Steg.`;
  } else {
    if (TILES[tile].solid) return 'Hier ist kein freier Boden.';
    if (info.keepClear.has(key(x, y))) return 'Dieser Platz muss frei bleiben.';
    const inObstacle = map.obstacles.some(
      (o) => isBlocked(o.id) && tilesOf(o.rect).some((t) => t.x === x && t.y === y),
    );
    if (inObstacle) return 'Hier ist der Weg noch versperrt.';
    if (def.solid && player && standsOn(x, y, player)) return 'Du stehst selbst im Weg.';
  }
  for (const blocker of placementBlockers) {
    const reason = blocker(mapId, x, y);
    if (reason) return reason;
  }
  return missingCostReason(def);
}

function missingCostReason(def: BuildableDef): string | null {
  const missing = getMissingCost(def);
  return missing.length > 0 ? `Dafür fehlt noch: ${itemList(missing)}.` : null;
}

// ── Roden: cutting the forest back ───────────────────────────

/** Forest the map lets the player cut back, and that is still standing. */
export function isClearable(mapId: string, x: number, y: number): boolean {
  const map = MAPS[mapId];
  const raw = mapInfo(mapId)?.grid[y]?.[x];
  if (!map || raw === undefined || raw !== 'forest' || isCleared(mapId, x, y)) return false;
  return (map.clearable ?? []).some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
}

/** The tiles Roden would free when the player picks (x, y): the 3×3 square's standing, clearable forest. */
export function clearTilesAround(mapId: string, x: number, y: number): { x: number; y: number }[] {
  const half = Math.floor(CLEAR_SIZE / 2);
  const out: { x: number; y: number }[] = [];
  for (let dy = -half; dy <= half; dy++)
    for (let dx = -half; dx <= half; dx++) if (isClearable(mapId, x + dx, y + dy)) out.push({ x: x + dx, y: y + dy });
  return out;
}

/** Why Roden cannot start on (x, y), or null. Cost is checked by the caller. */
export function whyNotClear(mapId: string, x: number, y: number): string | null {
  const tiles = clearTilesAround(mapId, x, y);
  if (tiles.length === 0) {
    const tile = baseTileAt(mapId, x, y);
    if (tile !== undefined && !TILES[tile].solid) return 'Hier ist schon freier Boden.';
    return 'Hier lässt sich nichts roden.';
  }
  // Start at the edge of the open ground: some tile of the patch must touch it.
  const touchesOpen = tiles.some((t) =>
    [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].some(([dx, dy]) => isOpenGround(mapId, t.x + dx, t.y + dy)),
  );
  return touchesOpen ? null : 'Fang am Rand der freien Fläche an.';
}

function clearForest(mapId: string, x: number, y: number): void {
  const state = readState();
  const cleared = state.cleared ?? {};
  cleared[mapId] = [...(cleared[mapId] ?? []), ...clearTilesAround(mapId, x, y).map((t) => key(t.x, t.y))];
  state.cleared = cleared;
  gameState.setExt('building', state);
}

function writePieces(mapId: string, pieces: PlacedPiece[]): void {
  const state = readState();
  if (pieces.length > 0) state.pieces[mapId] = pieces;
  else delete state.pieces[mapId];
  gameState.setExt('building', state);
}

/** Places a piece and spends its cost. Returns the reason it failed, or null on success. */
export function placePiece(mapId: string, pieceId: string, x: number, y: number, player?: BuilderPosition): string | null {
  const reason = whyNotPlace(mapId, pieceId, x, y, player);
  if (reason) return reason;
  const def = content.buildables.get(pieceId);
  for (const c of def.cost) gameState.removeItem(c.itemId, c.count);
  if (def.on === 'forest') clearForest(mapId, x, y);
  else {
    writePieces(mapId, [...getPieces(mapId), { id: pieceId, x, y }]);
    gameState.setFlag('built-once');
  }
  gameState.setFlag(`built:${pieceId}`);
  gameState.save();
  bus.emit('build-changed', { mapId });
  return null;
}

/** Why the piece on this tile cannot be taken down right now, or null if it can. */
export function whyNotRemove(mapId: string, x: number, y: number, player?: BuilderPosition): string | null {
  const piece = getPieceAt(mapId, x, y);
  if (!piece) return 'Hier steht nichts von dir.';
  if (player && !inReach(x, y, player)) return 'Das ist zu weit weg.';
  if (player && content.buildables.get(piece.id).on === 'water' && standsOn(x, y, player)) return 'Du stehst gerade darauf.';
  return null;
}

/** Takes a piece down and hands its materials (and a planter's seed) back. */
export function removePiece(mapId: string, x: number, y: number, player?: BuilderPosition): string | null {
  const reason = whyNotRemove(mapId, x, y, player);
  if (reason) return reason;
  const piece = getPieceAt(mapId, x, y) as PlacedPiece;
  const def = content.buildables.get(piece.id);
  if (def.planter) {
    for (let n = 0; n < def.planter.cols * def.planter.rows; n++) {
      const plantId = clearBed(n === 0 ? planterBedId(mapId, x, y) : `${planterBedId(mapId, x, y)}#${n}`);
      const seedItemId = plantId && content.plants.get(plantId).seedItemId;
      if (seedItemId) gameState.addItem(seedItemId, 1);
    }
  }
  for (const c of def.cost) gameState.addItem(c.itemId, c.count);
  writePieces(
    mapId,
    getPieces(mapId).filter((p) => p !== piece),
  );
  gameState.save();
  bus.emit('build-changed', { mapId });
  return null;
}

// ── Build mode (runtime only) ────────────────────────────────

const mode = { active: false, pieceId: content.buildables.all()[0].id };

export function getBuildMode(): Readonly<typeof mode> {
  return mode;
}

export function setBuildMode(active: boolean): void {
  if (active && !isBuildUnlocked()) return;
  if (mode.active === active) return;
  mode.active = active;
  bus.emit('build-mode-changed', { ...mode });
}

export function selectBuildPiece(pieceId: string): void {
  if (!content.buildables.has(pieceId) || mode.pieceId === pieceId) return;
  mode.pieceId = pieceId;
  bus.emit('build-mode-changed', { ...mode });
}

bus.on('save-loaded', () => setBuildMode(false));
bus.on('map-changed', ({ mapId }) => {
  if (MAPS[mapId]?.indoor) setBuildMode(false);
});
