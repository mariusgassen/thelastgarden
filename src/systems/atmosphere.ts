import Phaser from 'phaser';
import { findPlantingBed } from '../world';
import type { MapDef } from '../world/types';
import { TILE_SIZE } from '../world/tiles';
import { advanceDayClock, getDayTime } from './dayClock';
import { getLightSources } from './plants';

/**
 * Scene-bound ambience for the open world. Time itself lives in `dayClock.ts` so map
 * transitions keep the current hour; plants remain the persistent light source via `plants.ts`.
 */
export class AtmosphereLayer {
  private readonly shade: Phaser.GameObjects.RenderTexture;
  private readonly haloWidth: number;
  private readonly haloHeight: number;
  private readonly motes: Phaser.GameObjects.Particles.ParticleEmitter;
  private lastAlpha = -1;
  private lastSourcesKey = '';

  constructor(
    scene: Phaser.Scene,
    private readonly map: MapDef,
  ) {
    const width = map.width * TILE_SIZE;
    const height = map.height * TILE_SIZE;
    this.shade = scene.add.renderTexture(0, 0, width, height).setOrigin(0, 0).setDepth(90_000).setVisible(false);
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

    this.update(0);
  }

  update(delta: number): void {
    advanceDayClock(delta);
    const { shadeAlpha } = getDayTime();
    const nightFactor = Phaser.Math.Clamp(shadeAlpha / 0.52, 0, 1);
    const effectiveAlpha = this.map.baseTile === 'woodWall' ? shadeAlpha * 0.42 : shadeAlpha;
    this.motes.setAlpha(0.24 + nightFactor * 0.72);
    this.drawShade(effectiveAlpha);
  }

  private drawShade(alpha: number): void {
    if (alpha <= 0.004) {
      if (this.lastAlpha !== 0) {
        this.lastAlpha = 0;
        this.shade.setVisible(false);
      }
      return;
    }

    this.shade.setVisible(true);
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
