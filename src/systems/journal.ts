import Phaser from 'phaser';
import { content } from '../content';
import { allJournalPages } from '../world';
import { TILE_SIZE } from '../world/tiles';
import type { JournalPageDef } from '../world/types';
import { bus } from './events';
import { onDialogueClosed, type InteractionSystem } from './interaction';
import { gameState } from './state';

export const journalReadFlag = (pageId: string): string => `journal-read:${pageId}`;

/** Marks a page as read: flag + note item. Safe to call twice. */
export function markPageRead(page: JournalPageDef): void {
  if (gameState.hasFlag(journalReadFlag(page.id))) return;
  if (page.itemId) gameState.addItem(page.itemId, 1);
  gameState.setFlag(journalReadFlag(page.id));
  gameState.save();
}

/**
 * Scene-bound journal pages for the current map (MapDef.journalPages). A page spawns once
 * its `appearsWhenFlag` is set — immediately on load, or with a sparkle when the flag flips
 * while the player is on the map — and stays readable afterwards.
 */
export class JournalLayer {
  private readonly live = new Map<string, Phaser.GameObjects.Image>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly mapId: string,
    private readonly interaction: InteractionSystem,
  ) {
    for (const page of this.pages()) {
      if (gameState.hasFlag(page.appearsWhenFlag)) this.spawn(page, false);
    }
    bus.onScene(scene, 'flag-changed', ({ key }) => {
      for (const page of this.pages()) {
        if (page.appearsWhenFlag === key && gameState.hasFlag(key)) this.spawn(page, true);
      }
    });
  }

  private pages(): JournalPageDef[] {
    return allJournalPages().filter((p) => p.mapId === this.mapId);
  }

  private spawn(page: JournalPageDef, announce: boolean): void {
    if (this.live.has(page.id)) return;
    const x = page.at.x * TILE_SIZE;
    const y = page.at.y * TILE_SIZE;
    const sprite = this.scene.add.image(x, y, 'journal-page').setOrigin(0.5, 1).setDepth(y);
    this.live.set(page.id, sprite);
    if (announce) {
      sprite.setScale(0.001);
      this.scene.tweens.add({ targets: sprite, scale: 1, duration: 380, ease: 'Back.easeOut' });
      const burst = this.scene.add.particles(x, y - 8, 'sparkle', {
        angle: { min: 0, max: 360 },
        speed: { min: 20, max: 70 },
        lifespan: 600,
        scale: { start: 1, end: 0 },
        emitting: false,
      });
      burst.explode(14);
      this.scene.time.delayedCall(700, () => burst.destroy());
      bus.emit('toast', { text: 'Zwischen den Blättern liegt eine Seite.' });
    }

    this.interaction.register({
      id: `journal:${page.id}`,
      label: gameState.hasFlag(journalReadFlag(page.id)) ? 'Nochmal lesen' : 'Lesen',
      radius: 52,
      markerOffset: 30,
      getPosition: () => ({ x, y: y - 6 }),
      onInteract: (ctx) => {
        const dialogue = content.dialogues.get(page.dialogueId);
        ctx.world.showDialogue(dialogue.id);
        onDialogueClosed(dialogue.id, () => {
          markPageRead(page);
          const item = this.interaction.get(`journal:${page.id}`);
          if (item) item.label = 'Nochmal lesen';
        });
      },
    });
  }
}
