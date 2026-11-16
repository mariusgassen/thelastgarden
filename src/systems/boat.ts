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

interface BoatExt {
  boating?: boolean;
}

function readState(): BoatExt {
  return gameState.getExt<BoatExt>('boat', {});
}

function writeBoating(boating: boolean): void {
  gameState.setExt<BoatExt>('boat', boating ? { boating: true } : {});
}

export function isBoating(): boolean {
  return Boolean(readState().boating);
}

export function isBoatingHere(mapId = gameState.data.player.mapId): boolean {
  return isBoating() && !MAPS[mapId]?.indoor;
}

/** True when tile (x, y) is open water usable by a rowboat. */
export function isOpenWaterTile(mapId: string, x: number, y: number): boolean {
  if (baseTileAt(mapId, x, y) !== 'water') return false;
  const piece = getPieceAt(mapId, x, y);
  if (!piece) return true;
  return Boolean(content.buildables.find(piece.id)?.boat);
}

function findWaterSpawn(mapId: string, around: { x: number; y: number }): { x: number; y: number } | null {
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
  writeBoating(true);
  gameState.setFlag('boated-once');
  gameState.save();
  bus.emit('boat-changed', { boating: true });
  return true;
}

function isBlockedByWorld(mapId: string, tx: number, ty: number): boolean {
  const map = MAPS[mapId];
  if (!map) return true;
  if (map.obstacles.some((o) => isBlocked(o.id) && tx >= o.rect.x && tx < o.rect.x + o.rect.w && ty >= o.rect.y && ty < o.rect.y + o.rect.h)) {
    return true;
  }
  if (map.props.some((p) => p.solid && tx >= p.solid.x && tx < p.solid.x + p.solid.w && ty >= p.solid.y && ty < p.solid.y + p.solid.h)) {
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

/** Steps out of the boat onto the nearest shore or bridge tile. Returns false if none is within reach. */
export function disembarkBoat(mapId: string, px: number, py: number): boolean {
  if (!isBoating()) return false;
  const landing = findLandingTile(mapId, px, py);
  if (!landing) {
    bus.emit('toast', { text: 'Fahr ans Ufer oder an einen Steg, um anzulegen.' });
    return false;
  }
  gameState.data.player.x = landing.x;
  gameState.data.player.y = landing.y;
  writeBoating(false);
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
