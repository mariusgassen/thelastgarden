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
}

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

export function getPieceAt(mapId: string, x: number, y: number): PlacedPiece | undefined {
  return getPieces(mapId).find((p) => p.x === x && p.y === y);
}

export function planterBedId(mapId: string, x: number, y: number): string {
  return `planter:${mapId}:${x}:${y}`;
}

// Built planters are planting beds like the ones in the map data (see world/index.ts).
setDynamicBedProvider(() => {
  const beds: (PlantingBedDef & { mapId: string })[] = [];
  for (const [mapId, pieces] of Object.entries(readState().pieces)) {
    for (const p of pieces) {
      if (!content.buildables.find(p.id)?.planter) continue;
      // The plant stands on the soil in the box, a little above the tile's lower edge.
      beds.push({ id: planterBedId(mapId, p.x, p.y), mapId, rect: { x: p.x, y: p.y - 0.3, w: 1, h: 1 } });
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

/** The map's own tile at (x, y), ignoring anything built. */
export function baseTileAt(mapId: string, x: number, y: number): TileId | undefined {
  return mapInfo(mapId)?.grid[y]?.[x];
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
  return itemList(def.cost);
}

/** Why `pieceId` cannot go on this tile right now, or null if it can. */
export function whyNotPlace(mapId: string, pieceId: string, x: number, y: number, player?: BuilderPosition): string | null {
  const def = content.buildables.find(pieceId);
  const map = MAPS[mapId];
  const info = mapInfo(mapId);
  if (!def || !map || !info) return 'Das lässt sich nicht bauen.';
  if (map.indoor) return 'Drinnen ist kein Platz zum Bauen.';
  if (player && !inReach(x, y, player)) return 'Das ist zu weit weg.';
  const tile = info.grid[y]?.[x];
  if (tile === undefined) return 'Hier ist die Karte zu Ende.';
  if (getPieceAt(mapId, x, y)) return 'Hier steht schon etwas.';
  if (def.on === 'water') {
    if (tile !== 'water') return 'Der Steg gehört aufs Wasser.';
    const anchored = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].some(([dx, dy]) => isOpenGround(mapId, x + dx, y + dy) || getPieceAt(mapId, x + dx, y + dy)?.id === def.id);
    if (!anchored) return 'Der Steg braucht Anschluss ans Ufer.';
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
  const missing = getMissingCost(def);
  if (missing.length > 0) return `Dafür fehlt noch: ${itemList(missing)}.`;
  return null;
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
  writePieces(mapId, [...getPieces(mapId), { id: pieceId, x, y }]);
  gameState.setFlag('built-once');
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
    const plantId = clearBed(planterBedId(mapId, x, y));
    const seedItemId = plantId && content.plants.get(plantId).seedItemId;
    if (seedItemId) gameState.addItem(seedItemId, 1);
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
