/**
 * Rowboats and open-water travel. No Phaser dependency — tile collisions and sprites are
 * handled by WorldScene, BuildLayer and PlayerController.
 *
 * State: `ext.boat = { boating?: boolean }`. Missing in older saves (= not boating).
 * Two ways onto the water:
 *   1. Fixed moored boats (`InteractableSpec` with `type: 'boat'`, e.g. at river piers) that
 *      also offer a direct ferry crossing to a partner pier.
 *   2. Player-built `boat-dock` pieces on any pond, canal or river.
 */
import { content } from '../content';
import type { BoatInteractableSpec } from '../world/types';
import { MAPS } from '../world';
import { TILE_SIZE } from '../world/tiles';
import { baseTileAt, getPieceAt, isTileWalkable } from './building';
import { bus } from './events';
import { isRiding, setRiding } from './horse';
import { setSpecHandler } from './interaction';
import { isBlocked } from './obstacles';
import { gameState } from './state';

export interface BoatTile {
  x: number;
  y: number;
}

interface BoatExt {
  boating?: boolean;
  /** Water tile per map where the player last disembarked away from a pier/dock. */
  parked?: Record<string, BoatTile>;
}

function readState(): BoatExt {
  return gameState.getExt<BoatExt>('boat', {});
}

function saveBoatState(next: BoatExt): void {
  const clean: BoatExt = {};
  if (next.boating) clean.boating = true;
  if (next.parked && Object.keys(next.parked).length > 0) clean.parked = next.parked;
  gameState.setExt<BoatExt>('boat', clean);
}

function writeBoating(boating: boolean): void {
  const cur = readState();
  saveBoatState({ ...cur, boating: boating || undefined });
}

export function isBoating(): boolean {
  return Boolean(readState().boating);
}

export function isBoatingHere(mapId = gameState.data.player.mapId): boolean {
  return isBoating() && !MAPS[mapId]?.indoor;
}

/** Water tile where the player last left their boat on `mapId`, or null when none is parked. */
export function getParkedBoat(mapId = gameState.data.player.mapId): BoatTile | null {
  if (MAPS[mapId]?.indoor) return null;
  const p = readState().parked?.[mapId];
  if (!p) return null;
  if (isOpenWaterTile(mapId, p.x, p.y)) return p;
  return findWaterSpawn(mapId, p);
}

/** True when tile (x, y) is open water usable by a rowboat. */
export function isOpenWaterTile(mapId: string, x: number, y: number): boolean {
  if (baseTileAt(mapId, x, y) !== 'water') return false;
  const piece = getPieceAt(mapId, x, y);
  if (!piece) return true;
  return Boolean(content.buildables.find(piece.id)?.boat);
}

function findWaterSpawn(mapId: string, around: { x: number; y: number }): BoatTile | null {
  const cx = Math.floor(around.x);
  const cy = Math.floor(around.y);
  const offsets: [number, number][] = [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
    [2, 0],
    [-2, 0],
    [0, 2],
    [0, -2],
  ];
  // Prefer completely unobstructed water tiles beside a moored dock before using the dock tile itself.
  for (const [dx, dy] of offsets) {
    const tx = cx + dx;
    const ty = cy + dy;
    if (baseTileAt(mapId, tx, ty) === 'water' && !getPieceAt(mapId, tx, ty)) return { x: tx, y: ty };
  }
  if (isOpenWaterTile(mapId, cx, cy)) return { x: cx, y: cy };
  return null;
}

/** Puts the player into a rowboat on connected water. */
export function boardBoat(mapId: string, waterAt: { x: number; y: number }): boolean {
  if (MAPS[mapId]?.indoor) return false;
  const tile = findWaterSpawn(mapId, waterAt);
  if (!tile) {
    bus.emit('toast', { text: 'Hier ist kein freies Wasser für das Boot.' });
    return false;
  }
  if (isRiding()) setRiding(false);
  gameState.data.player.mapId = mapId;
  gameState.data.player.x = (tile.x + 0.5) * TILE_SIZE;
  gameState.data.player.y = (tile.y + 0.5) * TILE_SIZE;
  const cur = readState();
  const parked = cur.parked ? { ...cur.parked } : undefined;
  if (parked) delete parked[mapId];
  saveBoatState({ boating: true, parked });
  gameState.setFlag('boated-once');
  gameState.save();
  bus.emit('boat-changed', { boating: true });
  return true;
}

function overlapsTile(r: { x: number; y: number; w: number; h: number }, tx: number, ty: number): boolean {
  return tx + 1 > r.x && tx < r.x + r.w && ty + 1 > r.y && ty < r.y + r.h;
}

function isBlockedByWorld(mapId: string, tx: number, ty: number): boolean {
  const map = MAPS[mapId];
  if (!map) return true;
  if (map.obstacles.some((o) => isBlocked(o.id) && overlapsTile(o.rect, tx, ty))) {
    return true;
  }
  if (map.props.some((p) => p.solid && overlapsTile(p.solid, tx, ty))) {
    return true;
  }
  return false;
}

/** Nearest walkable shore, bridge or dock tile within 1.65 tiles of the boat, or null. */
export function findLandingTile(mapId: string, px: number, py: number): { tx: number; ty: number; x: number; y: number } | null {
  const map = MAPS[mapId];
  if (!map) return null;
  const ptx = px / TILE_SIZE;
  const pty = py / TILE_SIZE;
  let best: { tx: number; ty: number; x: number; y: number; dist: number } | null = null;
  for (let ty = Math.floor(pty) - 2; ty <= Math.floor(pty) + 2; ty++) {
    for (let tx = Math.floor(ptx) - 2; tx <= Math.floor(ptx) + 2; tx++) {
      if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) continue;
      if (isBlockedByWorld(mapId, tx, ty)) continue;
      const piece = getPieceAt(mapId, tx, ty);
      const pieceDef = piece ? content.buildables.find(piece.id) : undefined;
      const base = baseTileAt(mapId, tx, ty);
      const isDockBridge = base === 'water' && pieceDef && pieceDef.solid === undefined && !pieceDef.planter;
      const isShoreGround = base !== 'water' && isTileWalkable(mapId, tx, ty);
      if (!isDockBridge && !isShoreGround) continue;
      const cx = (tx + 0.5) * TILE_SIZE;
      const cy = (ty + 0.5) * TILE_SIZE;
      const dist = Math.hypot(cx - px, cy - py);
      if (dist > 1.65 * TILE_SIZE) continue;
      if (!best || dist < best.dist) best = { tx, ty, x: cx, y: cy, dist };
    }
  }
  return best ? { tx: best.tx, ty: best.ty, x: best.x, y: best.y } : null;
}

function findParkWaterTile(mapId: string, px: number, py: number, landing: { tx: number; ty: number }): BoatTile | null {
  const cur = { x: Math.floor(px / TILE_SIZE), y: Math.floor(py / TILE_SIZE) };
  if (baseTileAt(mapId, cur.x, cur.y) === 'water' && !getPieceAt(mapId, cur.x, cur.y)) return cur;
  return (
    findWaterSpawn(mapId, { x: landing.tx, y: landing.ty }) ??
    (isOpenWaterTile(mapId, cur.x, cur.y) ? cur : findWaterSpawn(mapId, cur))
  );
}

/** Steps out of the boat onto the nearest shore or bridge tile, leaving the boat moored beside the landing spot. */
export function disembarkBoat(mapId: string, px: number, py: number): boolean {
  if (!isBoating()) return false;
  const landing = findLandingTile(mapId, px, py);
  if (!landing) {
    bus.emit('toast', { text: 'Fahr ans Ufer oder an einen Steg, um anzulegen.' });
    return false;
  }
  const waterTile = findParkWaterTile(mapId, px, py, landing);
  const pieceAtWater = waterTile ? getPieceAt(mapId, waterTile.x, waterTile.y) : undefined;
  const onBuiltDock = pieceAtWater !== undefined && Boolean(content.buildables.find(pieceAtWater.id)?.boat);
  const nearPierBoat = (MAPS[mapId]?.interactables ?? []).some(
    (i) => i.type === 'boat' && Math.hypot(i.at.x * TILE_SIZE - landing.x, i.at.y * TILE_SIZE - landing.y) <= 1.5 * TILE_SIZE,
  );
  const cur = readState();
  const parked = { ...(cur.parked ?? {}) };
  if (waterTile && !onBuiltDock && !nearPierBoat) parked[mapId] = waterTile;
  else delete parked[mapId];

  gameState.data.player.x = landing.x;
  gameState.data.player.y = landing.y;
  saveBoatState({ parked });
  gameState.save();
  bus.emit('boat-changed', { boating: false });
  return true;
}

/** Immediately rows across to a connected pier map and arrives on foot. */
export function ferryBoatTo(mapId: string, spawn: string): void {
  if (isBoating()) {
    writeBoating(false);
    gameState.save();
    bus.emit('boat-changed', { boating: false });
  }
  bus.emit('fast-travel', { mapId, spawn });
}

export function clearBoating(): void {
  if (!isBoating()) return;
  writeBoating(false);
  gameState.save();
  bus.emit('boat-changed', { boating: false });
}

// ── Boat interactable handler (registered once at boot) ──────────────────────

const pendingMenus = new Map<string, { mapId: string; spec: BoatInteractableSpec }>();

setSpecHandler('boat', (spec, ctx) => {
  const dialogueId = `boat-menu:${spec.id}`;
  pendingMenus.set(dialogueId, { mapId: ctx.world.mapId, spec });
  const choices = [
    { id: 'board', label: 'Ins Boot steigen' },
    ...(spec.ferry ? [{ id: 'ferry', label: spec.ferry.label }] : []),
    { label: 'Am Ufer bleiben' },
  ];
  ctx.world.showLines(dialogueId, [
    {
      text: spec.description ?? 'Ein robuster Holzkahn liegt am Steg vertäut. Wohin soll es gehen?',
      choices,
    },
  ]);
});

bus.on('dialogue-choice', ({ dialogueId, choiceId }) => {
  const pending = pendingMenus.get(dialogueId);
  if (!pending) return;
  pendingMenus.delete(dialogueId);
  if (choiceId === 'board') boardBoat(pending.mapId, pending.spec.waterAt);
  else if (choiceId === 'ferry' && pending.spec.ferry) ferryBoatTo(pending.spec.ferry.mapId, pending.spec.ferry.spawn);
});

bus.on('dialogue-closed', ({ id }) => {
  pendingMenus.delete(id);
});

bus.on('fast-travel', () => {
  if (isBoating()) {
    writeBoating(false);
    gameState.save();
  }
});

bus.on('map-changed', ({ mapId }) => {
  if (MAPS[mapId]?.indoor && isBoating()) clearBoating();
});

/** Explicit boot hook so Vite tree-shaking keeps the module-level boat handler alive. */
export function startBoats(): void {
  // Handlers are registered at module load above.
}
