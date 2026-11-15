import Phaser from 'phaser';
import { content } from '../content';
import { allResourceNodes, findResourceNode } from '../world';
import { TILE_SIZE } from '../world/tiles';
import type { ResourceNodeDef } from '../world/types';
import { bus } from './events';
import type { InteractionSystem } from './interaction';
import { gameState } from './state';

/*
 * Public resource API (scene-independent; safe to call from anywhere):
 *
 *   collectNode(id)         -> boolean   adds the item, marks the node consumed/respawning
 *   isNodeAvailable(def)     -> boolean
 *   getResourceNodes(mapId?) -> node defs incl. mapId
 */

export type ResourceNodeWithMap = ResourceNodeDef & { mapId: string };

export function getResourceNodes(mapId?: string): ResourceNodeWithMap[] {
  const all = allResourceNodes();
  return mapId ? all.filter((n) => n.mapId === mapId) : all;
}

interface ResourceExt {
  /** Ids of one-time nodes (no respawnMs) already collected. */
  collected: string[];
  /** nodeId -> epoch ms of last collection, for respawnable nodes. */
  lastCollectedAt: Record<string, number>;
}

function readState(): ResourceExt {
  return gameState.getExt<ResourceExt>('resources', { collected: [], lastCollectedAt: {} });
}

function writeState(state: ResourceExt): void {
  gameState.setExt('resources', state);
}

export function isNodeAvailable(def: ResourceNodeWithMap): boolean {
  const state = readState();
  if (def.respawnMs === undefined) return !state.collected.includes(def.id);
  const last = state.lastCollectedAt[def.id];
  return last === undefined || Date.now() - last >= def.respawnMs;
}

/** Adds the node's item to the inventory and persists its consumed/respawn state. */
export function collectNode(id: string): boolean {
  const def = findResourceNode(id);
  if (!def || !isNodeAvailable(def)) return false;
  const state = readState();
  if (def.respawnMs === undefined) state.collected.push(id);
  else state.lastCollectedAt[id] = Date.now();
  writeState(state);
  gameState.addItem(def.itemId, 1);
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
    scene.time.addEvent({ delay: 1000, loop: true, callback: () => this.pollRespawns() });
  }

  private trySpawn(def: ResourceNodeWithMap): void {
    if (this.live.has(def.id) || !isNodeAvailable(def)) return;
    const x = def.at.x * TILE_SIZE;
    const y = def.at.y * TILE_SIZE;
    const item = content.items.get(def.itemId);
    const sprite = this.scene.add.image(x, y, 'pickup-orb').setTint(item.color).setDepth(y).setScale(0.001);
    this.scene.tweens.add({ targets: sprite, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: sprite, y: y - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.interaction.register({
      id: `resource:${def.id}`,
      label: def.label,
      radius: 48,
      getPosition: () => ({ x, y }),
      onInteract: (ctx) => {
        if (!collectNode(def.id)) return;
        ctx.world.toast(`+1 ${item.name}`);
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
