import Phaser from 'phaser';
import { THEME } from '../ui/theme';
import { bus } from './events';
import type { InteractionSystem } from './interaction';
import { getQuestMarkerIds } from './quests';

interface Pin {
  pin: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Arc;
}

/**
 * Scene-bound quest pins: a bobbing marker plus a soft ground glow over every registered
 * interactable that an open objective lists in `markers`. Positions are re-read every frame
 * (NPCs may move); the id set is refreshed on `quest-updated` and polled, because pages and
 * pickups register/unregister after the quest state changed.
 */
export class QuestMarkerLayer {
  private readonly pins = new Map<string, Pin>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly interaction: InteractionSystem,
  ) {
    bus.onScene(scene, 'quest-updated', () => this.refresh());
    scene.time.addEvent({ delay: 400, loop: true, callback: () => this.refresh() });
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
    this.refresh();
  }

  private refresh(): void {
    const wanted = getQuestMarkerIds();
    for (const [id, pin] of this.pins) {
      if (!wanted.has(id) || !this.interaction.get(id)) this.remove(id, pin);
    }
    for (const id of wanted) {
      if (this.pins.has(id) || !this.interaction.get(id)) continue;
      const pin = this.scene.add.image(0, 0, 'quest-pin').setOrigin(0.5, 1).setDepth(99_000).setAlpha(0);
      const glow = this.scene.add.circle(0, 0, 26, THEME.sun, 0.22).setDepth(-3);
      this.scene.tweens.add({ targets: pin, alpha: 1, duration: 250 });
      this.scene.tweens.add({ targets: glow, alpha: 0.08, scale: 1.25, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.pins.set(id, { pin, glow });
    }
  }

  private remove(id: string, pin: Pin): void {
    this.pins.delete(id);
    this.scene.tweens.killTweensOf([pin.pin, pin.glow]);
    this.scene.tweens.add({
      targets: [pin.pin, pin.glow],
      alpha: 0,
      duration: 250,
      onComplete: () => {
        pin.pin.destroy();
        pin.glow.destroy();
      },
    });
  }

  private update(time: number): void {
    const bob = Math.sin(time / 260) * 4;
    for (const [id, { pin, glow }] of this.pins) {
      const item = this.interaction.get(id);
      if (!item) continue;
      const p = item.getPosition();
      pin.setPosition(p.x, p.y - (item.markerOffset ?? 34) - 18 + bob);
      glow.setPosition(p.x, p.y + 4);
    }
  }
}
