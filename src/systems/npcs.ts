import Phaser from 'phaser';
import { content } from '../content';
import type { NpcDef, NpcDialogueRule } from '../content/types';
import { TILE_SIZE } from '../world/tiles';
import type { MapDef, NpcPlacementDef } from '../world/types';
import { bus } from './events';
import { onDialogueClosed, type InteractionSystem } from './interaction';
import { gameState } from './state';

/** First rule whose flag conditions hold, else undefined (caller falls back to `def.dialogueId`). */
export function pickNpcDialogue(def: NpcDef): NpcDialogueRule | undefined {
  return def.dialogues?.find(
    (rule) =>
      (!rule.mapId || rule.mapId === gameState.data.player.mapId) &&
      (rule.requires ?? []).every((flag) => gameState.hasFlag(flag)) &&
      !(rule.forbids ?? []).some((flag) => gameState.hasFlag(flag)) &&
      (rule.requiresItems ?? []).every((item) => gameState.getItemCount(item.itemId) >= item.count),
  );
}

interface LiveNpc {
  def: NpcDef;
  placement: NpcPlacementDef;
  sprite: Phaser.GameObjects.Image;
  x: number;
  y: number;
  radius: number;
  visible: boolean;
}

/**
 * Scene-bound NPCs for the current map (MapDef.npcs). Each is an interactable `npc:<id>`
 * that shows the first matching NpcDialogueRule and applies its effects when that
 * dialogue closes. Visual behavior is deliberately simple: face the player, hop now and then.
 */
export class NpcLayer {
  private readonly live: LiveNpc[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    map: MapDef,
    private readonly interaction: InteractionSystem,
    private readonly getPlayerX: () => number,
  ) {
    for (const placement of map.npcs ?? []) {
      const def = content.npcs.get(placement.npcId);
      const x = placement.at.x * TILE_SIZE;
      const y = placement.at.y * TILE_SIZE;
      const sprite = scene.add.image(x, y, def.id).setOrigin(0.5, 1).setDepth(y);
      const entry: LiveNpc = {
        def,
        placement,
        sprite,
        x,
        y,
        radius: placement.radius ?? 64,
        visible: false,
      };
      this.live.push(entry);
      this.scheduleHop(sprite, y);
      this.syncVisibility(entry);
    }
    bus.onScene(scene, 'flag-changed', () => {
      for (const entry of this.live) this.syncVisibility(entry);
    });
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
  }

  private isVisible(placement: NpcPlacementDef): boolean {
    return (
      (!placement.showWhenFlag || gameState.hasFlag(placement.showWhenFlag)) &&
      (!placement.hideWhenFlag || !gameState.hasFlag(placement.hideWhenFlag))
    );
  }

  private syncVisibility(entry: LiveNpc): void {
    const next = this.isVisible(entry.placement);
    entry.sprite.setVisible(next);
    if (next === entry.visible) return;
    entry.visible = next;
    if (next) this.register(entry.def, entry.radius, entry.x, entry.y);
    else this.interaction.unregister(`npc:${entry.def.id}`);
  }

  private register(def: NpcDef, radius: number, x: number, y: number): void {
    this.interaction.register({
      id: `npc:${def.id}`,
      label: def.interactLabel ?? 'Ansprechen',
      radius,
      markerOffset: 46,
      getPosition: () => ({ x, y: y - 10 }),
      onInteract: (ctx) => {
        const rule = pickNpcDialogue(def);
        const dialogueId = rule?.dialogueId ?? def.dialogueId;
        if (!dialogueId) return;
        ctx.world.showDialogue(dialogueId);
        if (!rule) return;
        onDialogueClosed(dialogueId, () => {
          for (const item of rule.takeItems ?? []) gameState.removeItem(item.itemId, item.count);
          for (const item of rule.giveItems ?? []) {
            gameState.addItem(item.itemId, item.count);
            ctx.world.toast(`+${item.count} ${content.items.get(item.itemId).name}`);
          }
          for (const flag of rule.setFlags ?? []) gameState.setFlag(flag);
          gameState.save();
        });
      },
    });
  }

  private scheduleHop(sprite: Phaser.GameObjects.Image, baseY: number): void {
    this.scene.time.delayedCall(1800 + Math.random() * 2600, () => {
      if (!sprite.active) return;
      this.scene.tweens.add({
        targets: sprite,
        y: baseY - 7,
        duration: 130,
        yoyo: true,
        ease: 'Quad.easeOut',
        onComplete: () => this.scheduleHop(sprite, baseY),
      });
    });
  }

  private update(): void {
    const px = this.getPlayerX();
    for (const npc of this.live) npc.sprite.setFlipX(px < npc.x - 4);
  }
}
