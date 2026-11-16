import Phaser from 'phaser';
import { content } from '../content';
import { MAPS, allResourceNodes } from '../world';
import { seededRandom } from '../world/grid';
import { TILE_SIZE, TILES } from '../world/tiles';
import type { ResourceNodeDef } from '../world/types';
import { isBlighted } from './blight';
import { BUILD_UNLOCK_FLAG, addPlacementBlocker, baseTileAt, getPieceAt, isKeepClearTile } from './building';
import { bus } from './events';
import type { InteractionSystem } from './interaction';
import { isBlocked } from './obstacles';
import { gameState } from './state';

/*
 * Public resource API (scene-independent; safe to call from anywhere):
 *
 *   collectNode(id)         -> boolean   adds the item, marks the node consumed/respawning
 *   isNodeAvailable(def)     -> boolean
 *   getResourceNodes(mapId?) -> node defs incl. mapId and current position
 *
 * Renewable nodes (those with `respawnMs`) do not regrow in the same spot: when one is
 * collected, its next spot is drawn from a seeded RNG (`ext.resources.seed`) among open grass
 * within ROAM_TILES of its home in the map data. One-time finds and seeds never move.
 */

/** How far (tiles) a renewable pickup may wander from the spot written in the map data. */
export const ROAM_TILES = 8;
/** A new spot is at least this far from the old one, so the move is noticeable. */
const MIN_MOVE_TILES = 3;
const ROAM_GROUND = new Set<string>(['grass', 'wildGrass', 'orchardGrass']);

export type ResourceNodeWithMap = ResourceNodeDef & { mapId: string };

export function getResourceNodes(mapId?: string): ResourceNodeWithMap[] {
  const state = readState();
  const all = allResourceNodes().map((n) => place(n, state));
  return mapId ? all.filter((n) => n.mapId === mapId) : all;
}

interface ResourceExt {
  /** Ids of one-time nodes (no respawnMs) already collected. */
  collected: string[];
  /** nodeId -> epoch ms of last collection, for respawnable nodes. */
  lastCollectedAt: Record<string, number>;
  /** Seed of the spawn RNG; drawn once per save (absent in old saves). */
  seed?: number;
  /** nodeId -> how often it has been re-rolled; with the seed it fixes the next spot. */
  rolls?: Record<string, number>;
  /** nodeId -> whole tile it currently sits on (absent = the spot in the map data). */
  spots?: Record<string, { x: number; y: number }>;
}

function readState(): ResourceExt {
  const state = gameState.getExt<ResourceExt>('resources', { collected: [], lastCollectedAt: {} });
  if (state.seed === undefined) {
    state.seed = Math.floor(Math.random() * 0x7fffffff);
    gameState.setExt('resources', state);
  }
  return state;
}

/** Pins the spawn RNG (tests, debugging). Does not move nodes that already sit somewhere. */
export function setSpawnSeed(seed: number): void {
  const state = readState();
  state.seed = seed >>> 0;
  writeState(state);
}

/** The node with its current spot applied. */
function place(def: ResourceNodeWithMap, state: ResourceExt): ResourceNodeWithMap {
  const spot = state.spots?.[def.id];
  return spot ? { ...def, at: { x: spot.x + 0.5, y: spot.y + 0.5 } } : def;
}

function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

const tileKey = (x: number, y: number): string => `${x},${y}`;

function blockedObstacleTiles(mapId: string): Set<string> {
  const out = new Set<string>();
  for (const o of MAPS[mapId]?.obstacles ?? []) {
    if (!isBlocked(o.id)) continue;
    for (let y = Math.floor(o.rect.y); y < Math.ceil(o.rect.y + o.rect.h); y++)
      for (let x = Math.floor(o.rect.x); x < Math.ceil(o.rect.x + o.rect.w); x++) out.add(tileKey(x, y));
  }
  return out;
}

/** Open grass the player can walk to from the node's home, within roaming range and free of everything else. */
function candidateSpots(def: ResourceNodeWithMap, state: ResourceExt): { x: number; y: number }[] {
  const base = allResourceNodes().find((n) => n.id === def.id) ?? def;
  const home = { x: Math.floor(base.at.x), y: Math.floor(base.at.y) };
  const walls = blockedObstacleTiles(def.mapId);
  const taken = new Set<string>();
  for (const other of allResourceNodes()) {
    if (other.mapId !== def.mapId || other.id === def.id) continue;
    const at = place(other, state).at;
    taken.add(tileKey(Math.floor(at.x), Math.floor(at.y)));
  }
  const from = { x: Math.floor(def.at.x), y: Math.floor(def.at.y) };
  const seen = new Set([tileKey(home.x, home.y)]);
  const queue = [home];
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < queue.length; i++) {
    const { x, y } = queue[i];
    const tile = baseTileAt(def.mapId, x, y);
    if (
      tile !== undefined &&
      ROAM_GROUND.has(tile) &&
      !isKeepClearTile(def.mapId, x, y) &&
      !taken.has(tileKey(x, y)) &&
      !getPieceAt(def.mapId, x, y) &&
      !isBlighted(def.mapId, x, y) &&
      Math.hypot(x - from.x, y - from.y) >= MIN_MOVE_TILES
    ) {
      out.push({ x, y });
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const k = tileKey(nx, ny);
      if (seen.has(k) || walls.has(k) || Math.hypot(nx - home.x, ny - home.y) > ROAM_TILES) continue;
      const t = baseTileAt(def.mapId, nx, ny);
      if (t === undefined || TILES[t].solid) continue;
      seen.add(k);
      queue.push({ x: nx, y: ny });
    }
  }
  return out;
}

/** Draws the next spot for a renewable node. Keeps the current one if nothing else is free. */
function reroll(def: ResourceNodeWithMap, state: ResourceExt): void {
  const rolls = (state.rolls ??= {});
  const n = rolls[def.id] ?? 0;
  rolls[def.id] = n + 1;
  const spots = candidateSpots(def, state);
  if (spots.length === 0) return;
  const rnd = seededRandom((state.seed ?? 0) ^ hashId(def.id) ^ Math.imul(n + 1, 0x9e3779b1));
  (state.spots ??= {})[def.id] = spots[Math.floor(rnd() * spots.length)];
}

/** Where `id` stands right now (tile coordinates), or undefined for an unknown node. */
export function getNodeSpot(id: string): { x: number; y: number } | undefined {
  const def = allResourceNodes().find((n) => n.id === id);
  return def ? place(def, readState()).at : undefined;
}

// Nothing may be built on the tile a pickup currently occupies.
addPlacementBlocker((mapId, x, y) => {
  const state = readState();
  const hit = allResourceNodes().some((n) => {
    if (n.mapId !== mapId || (n.giftFlag && !gameState.hasFlag(n.giftFlag))) return false;
    const at = place(n, state).at;
    return Math.floor(at.x) === x && Math.floor(at.y) === y;
  });
  return hit ? 'Hier liegt etwas.' : null;
});

function writeState(state: ResourceExt): void {
  gameState.setExt('resources', state);
}

export function isNodeAvailable(def: ResourceNodeWithMap): boolean {
  if (def.giftFlag) return gameState.hasFlag(def.giftFlag);
  const state = readState();
  if (def.respawnMs === undefined) return !state.collected.includes(def.id);
  const last = state.lastCollectedAt[def.id];
  return last === undefined || Date.now() - last >= def.respawnMs;
}

/** Renewable pickups stay gone while the blight lies on their tile; one-time finds are never lost to it. */
export function isNodeBlighted(def: ResourceNodeWithMap): boolean {
  return def.respawnMs !== undefined && isBlighted(def.mapId, Math.floor(def.at.x), Math.floor(def.at.y));
}

/** Adds the node's item to the inventory and persists its consumed/respawn state. */
export function collectNode(id: string): boolean {
  const def = getResourceNodes().find((n) => n.id === id);
  if (!def || !isNodeAvailable(def) || isNodeBlighted(def)) return false;
  const state = readState();
  if (def.giftFlag) gameState.setFlag(def.giftFlag, false);
  else if (def.respawnMs === undefined) state.collected.push(id);
  else {
    state.lastCollectedAt[id] = Date.now();
    reroll(def, state);
  }
  writeState(state);
  gameState.addItem(def.itemId, def.count ?? 1);
  if (content.items.get(def.itemId).category === 'material') gameState.setFlag(BUILD_UNLOCK_FLAG);
  gameState.save();
  bus.emit('resource-collected', { nodeId: id, itemId: def.itemId });
  return true;
}

/** Scene-bound renderer for the current map's resource pickups. Created by WorldScene. */
export class ResourceLayer {
  private readonly live = new Map<string, Phaser.GameObjects.Image>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly mapId: string,
    private readonly interaction: InteractionSystem,
  ) {
    for (const def of getResourceNodes(mapId)) this.trySpawn(def);
    bus.onScene(scene, 'resource-collected', ({ nodeId }) => this.remove(nodeId));
    bus.onScene(scene, 'blight-changed', () => {
      for (const def of getResourceNodes(mapId)) if (isNodeBlighted(def)) this.remove(def.id);
    });
    scene.time.addEvent({ delay: 1000, loop: true, callback: () => this.pollRespawns() });
  }

  private trySpawn(def: ResourceNodeWithMap): void {
    if (this.live.has(def.id) || !isNodeAvailable(def) || isNodeBlighted(def)) return;
    const x = def.at.x * TILE_SIZE;
    const y = def.at.y * TILE_SIZE;
    const item = content.items.get(def.itemId);
    // A pile to chop, dig or salvage sits on the ground; everything else is a hovering orb of light.
    const sprite = def.texture
      ? this.scene.add.image(x, y + 10, def.texture).setOrigin(0.5, 1).setDepth(y + 10).setScale(0.001)
      : this.scene.add.image(x, y, 'pickup-orb').setTint(item.color).setDepth(y).setScale(0.001);
    this.scene.tweens.add({ targets: sprite, scale: 1, duration: 260, ease: 'Back.easeOut' });
    if (!def.texture) {
      this.scene.tweens.add({ targets: sprite, y: y - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    this.interaction.register({
      id: `resource:${def.id}`,
      label: def.label,
      radius: 48,
      getPosition: () => ({ x, y }),
      onInteract: (ctx) => {
        if (!collectNode(def.id)) return;
        ctx.world.toast(`+${def.count ?? 1} ${item.name}`);
      },
    });
    this.live.set(def.id, sprite);
  }

  private remove(id: string): void {
    const sprite = this.live.get(id);
    if (!sprite) return;
    this.live.delete(id);
    this.interaction.unregister(`resource:${id}`);
    this.scene.tweens.add({
      targets: sprite,
      scale: 0,
      alpha: 0,
      duration: 220,
      ease: 'Sine.easeIn',
      onComplete: () => sprite.destroy(),
    });
  }

  private pollRespawns(): void {
    for (const def of getResourceNodes(this.mapId)) this.trySpawn(def);
  }
}
