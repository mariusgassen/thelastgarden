import Phaser from 'phaser';
import { findPlantingBed } from '../world';
import type { MapDef } from '../world/types';
import { TILE_SIZE } from '../world/tiles';
import { getLightSources } from './plants';

/** A complete in-game day. Kept short enough that a casual session sees a change of mood. */
const DAY_LENGTH_MS = 4 * 60_000;

/**
 * Scene-bound ambience for the open world. It deliberately owns no game state: time advances
 * while the app is open and plants remain the source of persistent light through `plants.ts`.
 */
export class AtmosphereLayer {
  private readonly shade: Phaser.GameObjects.RenderTexture;
  private readonly haloWidth: number;
  private readonly haloHeight: number;
  private readonly motes: Phaser.GameObjects.Particles.ParticleEmitter;
  private elapsed = 0;
  private lastAlpha = -1;
  private lastSourcesKey = '';

  constructor(
    scene: Phaser.Scene,
    private readonly map: MapDef,
  ) {
    const width = map.width * TILE_SIZE;
    const height = map.height * TILE_SIZE;
    this.shade = scene.add.renderTexture(0, 0, width, height).setOrigin(0, 0).setDepth(90_000);
    const haloFrame = scene.textures.getFrame('light-halo');
    this.haloWidth = haloFrame?.width || 128;
    this.haloHeight = haloFrame?.height || 128;
    this.motes = scene.add
      .particles(0, 0, 'sparkle', {
        x: { min: 0, max: width },
        y: { min: 0, max: height },
        angle: { min: 165, max: 195 },
        speed: { min: 5, max: 13 },
        lifespan: { min: 2600, max: 4600 },
        scale: { start: 0.38, end: 0.05 },
        alpha: { start: 0.23, end: 0 },
        tint: [0xf9e8a3, 0xc9dcff],
        frequency: 520,
        quantity: 1,
      })
      .setDepth(89_000);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.shade.destroy();
      this.motes.destroy();
    });
  }

  update(delta: number): void {
    this.elapsed = (this.elapsed + delta) % DAY_LENGTH_MS;
    // Noon = 0.5. The cosine gives long, gentle transitions at dawn and dusk.
    const daylight = (Math.cos((this.elapsed / DAY_LENGTH_MS) * Math.PI * 2 - Math.PI) + 1) / 2;
    const night = Phaser.Math.Clamp((0.58 - daylight) / 0.58, 0, 1);
    this.motes.setAlpha(0.32 + night * 0.68);
    this.drawShade(0.05 + night * 0.56);
  }

  private drawShade(alpha: number): void {
    const sources = getLightSources().filter((source) => source.mapId === this.map.id);
    const sourcesKey = sources.map((s) => s.bedId).join(',');
    if (Math.abs(alpha - this.lastAlpha) < 0.01 && sourcesKey === this.lastSourcesKey) return;
    this.lastAlpha = alpha;
    this.lastSourcesKey = sourcesKey;

    this.shade.clear();
    this.shade.fill(0x101936, alpha);

    // Mature light plants punch soft-edged clear halos into the night veil.
    for (const source of sources) {
      const bed = findPlantingBed(source.bedId);
      if (!bed) continue;
      const x = (bed.rect.x + bed.rect.w / 2) * TILE_SIZE;
      const y = (bed.rect.y + bed.rect.h / 2) * TILE_SIZE - 16;
      const diameter = source.lightRadius * 2;
      this.shade.stamp('light-halo', undefined, x, y, {
        scaleX: diameter / this.haloWidth,
        scaleY: diameter / this.haloHeight,
        blendMode: Phaser.BlendModes.ERASE,
      });
    }
    this.shade.render();
  }
}
