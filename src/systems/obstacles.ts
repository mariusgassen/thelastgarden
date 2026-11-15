import Phaser from 'phaser';
import type { ObstacleKind } from '../content/types';
import { allObstacles, findObstacle } from '../world';
import { TILE_SIZE } from '../world/tiles';
import type { MapDef, ObstacleDef } from '../world/types';
import { bus } from './events';
import type { InteractionContext, InteractionSystem } from './interaction';
import { gameState } from './state';

/*
 * Public obstacle API (scene-independent; safe to call from anywhere):
 *
 *   unblockPath(id)            -> boolean   remove a removable obstacle permanently (persisted)
 *   isBlocked(id)              -> boolean
 *   getObstacles(mapId?)       -> obstacle defs incl. mapId
 *   getObstaclesBlockedBy(kind)-> obstacle defs that a given ability could clear
 *   addObstacleInteractHandler(fn) -> remove()   hook into "player inspects obstacle"
 */

export type ObstacleWithMap = ObstacleDef & { mapId: string };

export function getObstacles(mapId?: string): ObstacleWithMap[] {
  const all = allObstacles();
  return mapId ? all.filter((o) => o.mapId === mapId) : all;
}

export function getObstaclesBlockedBy(kind: ObstacleKind): ObstacleWithMap[] {
  return allObstacles().filter((o) => o.blockedBy === kind && isBlocked(o.id));
}

export function isBlocked(id: string): boolean {
  const def = findObstacle(id);
  if (!def) return false;
  return !def.removable || !gameState.isPathUnblocked(id);
}

/**
 * Permanently removes an obstacle. Returns false if the id is unknown, the obstacle is
 * not removable, or it is already cleared. Persists immediately and emits 'path-unblocked'.
 */
export function unblockPath(id: string): boolean {
  const def = findObstacle(id);
  if (!def) {
    console.warn(`[obstacles] unknown obstacle "${id}"`);
    return false;
  }
  if (!def.removable) {
    console.warn(`[obstacles] obstacle "${id}" is not removable`);
    return false;
  }
  if (gameState.isPathUnblocked(id)) return false;
  gameState.markPathUnblocked(id);
  bus.emit('path-unblocked', { obstacleId: id, mapId: def.mapId });
  gameState.save();
  return true;
}

/** Return true if handled; otherwise the next handler (finally: show the hint) runs. */
export type ObstacleInteractHandler = (obstacle: ObstacleWithMap, ctx: InteractionContext) => boolean;

const interactHandlers: ObstacleInteractHandler[] = [];

/** Later handlers take precedence. Returns a remover. */
export function addObstacleInteractHandler(handler: ObstacleInteractHandler): () => void {
  interactHandlers.unshift(handler);
  return () => {
    const i = interactHandlers.indexOf(handler);
    if (i >= 0) interactHandlers.splice(i, 1);
  };
}

interface LiveObstacle {
  def: ObstacleWithMap;
  sprite: Phaser.GameObjects.Image;
  body: Phaser.GameObjects.Zone;
}

/** Scene-bound renderer/collider for the current map's obstacles. Created by WorldScene. */
export class ObstacleLayer {
  private readonly live = new Map<string, LiveObstacle>();

  constructor(
    private readonly scene: Phaser.Scene,
    map: MapDef,
    private readonly solids: Phaser.Physics.Arcade.StaticGroup,
    private readonly interaction: InteractionSystem,
  ) {
    for (const def of getObstacles(map.id)) {
      if (isBlocked(def.id)) this.spawn(def);
    }
    bus.onScene(scene, 'path-unblocked', ({ obstacleId }) => this.remove(obstacleId, true));
  }

  getSprite(id: string): Phaser.GameObjects.Image | undefined {
    return this.live.get(id)?.sprite;
  }

  private spawn(def: ObstacleWithMap): void {
    const px = {
      x: def.rect.x * TILE_SIZE,
      y: def.rect.y * TILE_SIZE,
      w: def.rect.w * TILE_SIZE,
      h: def.rect.h * TILE_SIZE,
    };
    const cx = px.x + px.w / 2;
    const bottom = px.y + px.h;
    const sprite = this.scene.add
      .image(cx, bottom + 6, `obstacle-${def.blockedBy}`)
      .setOrigin(0.5, 1)
      .setDisplaySize(px.w * 1.25, px.h * 1.25)
      .setDepth(bottom);

    const body = this.scene.add.zone(cx, px.y + px.h / 2, px.w, px.h);
    this.solids.add(body);

    this.interaction.register({
      id: `obstacle:${def.id}`,
      label: 'Untersuchen',
      radius: Math.max(px.w, px.h) / 2 + 44,
      getPosition: () => ({ x: cx, y: px.y + px.h / 2 }),
      markerOffset: px.h / 2 + 30,
      onInteract: (ctx) => {
        for (const handler of interactHandlers) if (handler(def, ctx)) return;
        ctx.world.showLines(`obstacle:${def.id}`, [{ speaker: def.name, text: def.hint }]);
      },
    });

    this.live.set(def.id, { def, sprite, body });
  }

  private remove(id: string, animate: boolean): void {
    const entry = this.live.get(id);
    if (!entry) return;
    this.live.delete(id);
    this.interaction.unregister(`obstacle:${id}`);
    this.solids.remove(entry.body, true, true);
    if (!animate) {
      entry.sprite.destroy();
      return;
    }
    this.scene.tweens.add({
      targets: entry.sprite,
      alpha: 0,
      scaleY: entry.sprite.scaleY * 0.4,
      duration: 700,
      ease: 'Sine.easeIn',
      onComplete: () => entry.sprite.destroy(),
    });
  }
}
