import Phaser from 'phaser';
import { TILE_SIZE } from '../world/tiles';
import { getBlightTiles, getHearts, isBlightAwake, isHeartSealed, type HeartWithMap } from './blight';
import { bus } from './events';
import type { InteractionSystem } from './interaction';
import { gameState } from './state';

const HEART_LINES = {
  alive:
    'Ein Knoten aus grauem, fauligem Wurzelwerk. Von hier kriecht die Welke jede Nacht ein Stück weiter. Licht und ausgewachsene Pflanzen erträgt sie nicht: Bring eine Laterne, einen Unterstand oder einen bepflanzten Kübel nah genug heran, und der Herd verstummt.',
  sealed: 'Der Herd liegt still. Solange Licht oder Grün über ihm wacht, wächst hier nichts Graues mehr.',
};

interface LiveHeart {
  def: HeartWithMap;
  sprite: Phaser.GameObjects.Image;
  sealed: boolean;
}

/**
 * Scene-bound renderer for the current map's blight: one soft grey patch per blighted tile,
 * drifting spores and the hearts it grows from. All rules live in systems/blight.ts.
 */
export class BlightLayer {
  private readonly patches = new Map<string, Phaser.GameObjects.Image>();
  private readonly hearts: LiveHeart[] = [];
  private readonly spores: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly mapId: string,
    private readonly interaction: InteractionSystem,
  ) {
    this.spores = scene.add
      .particles(0, 0, 'sparkle', {
        angle: { min: 250, max: 290 },
        speed: { min: 4, max: 12 },
        lifespan: 2400,
        scale: { start: 0.5, end: 0.1 },
        alpha: { start: 0.5, end: 0 },
        tint: 0x8d809c,
        emitting: false,
      })
      .setDepth(88_000);
    this.syncHearts();
    this.syncPatches(false);
    bus.onScene(scene, 'blight-changed', ({ mapId: changed }) => {
      if (changed === mapId) this.syncPatches(true);
    });
    bus.onScene(scene, 'flag-changed', () => this.syncHearts());
    scene.time.addEvent({ delay: 1000, loop: true, callback: () => this.syncHearts() });
    scene.time.addEvent({ delay: 380, loop: true, callback: () => this.drift() });
  }

  private syncPatches(animate: boolean): void {
    const tiles = getBlightTiles(this.mapId);
    const wanted = new Set(tiles.map((t) => `${t.x},${t.y}`));
    for (const [k, img] of this.patches) {
      if (wanted.has(k)) continue;
      this.patches.delete(k);
      this.scene.tweens.add({ targets: img, alpha: 0, scale: 0.6, duration: animate ? 700 : 0, onComplete: () => img.destroy() });
    }
    for (const t of tiles) {
      const k = `${t.x},${t.y}`;
      if (this.patches.has(k)) continue;
      // A stable pseudo-random turn per tile keeps neighbouring patches from looking stamped.
      const turn = (t.x * 7 + t.y * 13) % 4;
      const img = this.scene.add
        .image((t.x + 0.5) * TILE_SIZE, (t.y + 0.5) * TILE_SIZE, 'blight-tile')
        .setAngle(turn * 90)
        .setFlipX((t.x + t.y) % 2 === 0)
        .setDepth(-3)
        .setAlpha(animate ? 0 : 1);
      if (animate) this.scene.tweens.add({ targets: img, alpha: 1, duration: 900 });
      this.patches.set(k, img);
    }
  }

  private syncHearts(): void {
    if (!isBlightAwake()) return;
    if (this.hearts.length === 0) {
      for (const def of getHearts(this.mapId)) this.spawnHeart(def);
    }
    for (const heart of this.hearts) {
      const sealed = isHeartSealed(heart.def);
      if (sealed === heart.sealed) continue;
      heart.sealed = sealed;
      heart.sprite.setTexture(sealed ? 'blight-heart-sealed' : 'blight-heart');
    }
  }

  private spawnHeart(def: HeartWithMap): void {
    const x = (def.at.x + 0.5) * TILE_SIZE;
    const y = (def.at.y + 0.9) * TILE_SIZE;
    const sealed = isHeartSealed(def);
    const sprite = this.scene.add
      .image(x, y, sealed ? 'blight-heart-sealed' : 'blight-heart')
      .setOrigin(0.5, 1)
      .setDepth(y);
    const heart: LiveHeart = { def, sprite, sealed };
    this.hearts.push(heart);
    this.interaction.register({
      id: `blight-heart:${def.id}`,
      label: 'Untersuchen',
      radius: 58,
      markerOffset: 46,
      getPosition: () => ({ x, y: y - 10 }),
      onInteract: (ctx) => {
        gameState.setFlag('blight-seen');
        ctx.world.showLines(`blight-heart:${def.id}`, [
          { speaker: 'Welkenherd', text: heart.sealed ? HEART_LINES.sealed : HEART_LINES.alive },
        ]);
      },
    });
  }

  private drift(): void {
    if (this.patches.size === 0) return;
    const imgs = [...this.patches.values()];
    const img = imgs[Math.floor(Math.random() * imgs.length)];
    this.spores.emitParticleAt(img.x + (Math.random() - 0.5) * 20, img.y, 1);
  }
}
