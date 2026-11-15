import Phaser from 'phaser';
import { content } from '../content';
import type { PlantDef } from '../content/types';
import { allPlantingBeds } from '../world';
import { TILE_SIZE } from '../world/tiles';
import { bus } from './events';
import type { InteractionSystem } from './interaction';
import { currentStage, getBedState, isBedMature, isBedPlanted, plantSeed } from './plants';

function labelFor(bedId: string): string {
  if (!isBedPlanted(bedId)) return 'Pflanzen';
  return isBedMature(bedId) ? 'Ansehen' : 'Wächst…';
}

function textureFor(plantId: string, stage: 'sprout' | 'growing' | 'mature'): string {
  return `plant-${plantId}-${stage}`;
}

interface LiveBed {
  cx: number;
  cy: number;
  sprite?: Phaser.GameObjects.Image;
  glow?: Phaser.GameObjects.Image;
  fireflies?: Phaser.GameObjects.Particles.ParticleEmitter;
  scent?: Phaser.GameObjects.Particles.ParticleEmitter;
  lastRenderedStage: number;
  plantId?: string;
}

/**
 * Scene-bound renderer + interactable for the current map's planting beds. Growth itself is
 * computed in systems/plants.ts from timestamps; this layer only redraws in response to it.
 */
export class PlantLayer {
  private readonly live = new Map<string, LiveBed>();

  constructor(
    private readonly scene: Phaser.Scene,
    mapId: string,
    private readonly interaction: InteractionSystem,
  ) {
    for (const bed of allPlantingBeds().filter((b) => b.mapId === mapId)) {
      const cx = (bed.rect.x + bed.rect.w / 2) * TILE_SIZE;
      const cy = (bed.rect.y + bed.rect.h) * TILE_SIZE;
      this.live.set(bed.id, { cx, cy, lastRenderedStage: -1 });
      this.registerInteractable(bed.id, cx, cy);
      this.render(bed.id);
    }
    bus.onScene(scene, 'plant-planted', ({ bedId }) => this.render(bedId));
    bus.onScene(scene, 'plant-matured', ({ bedId }) => this.render(bedId));
    scene.time.addEvent({ delay: 1000, loop: true, callback: () => this.pollAll() });
  }

  private registerInteractable(bedId: string, cx: number, cy: number): void {
    this.interaction.register({
      id: `bed:${bedId}`,
      label: labelFor(bedId),
      radius: 54,
      markerOffset: 46,
      getPosition: () => ({ x: cx, y: cy }),
      onInteract: (ctx) => {
        if (!isBedPlanted(bedId)) {
          if (plantSeed(bedId)) ctx.world.toast('Samen gepflanzt.');
          else ctx.world.toast('Dafür fehlen noch die passenden Samen.');
          this.render(bedId);
          return;
        }
        const bed = getBedState(bedId)!;
        const def = content.plants.get(bed.plantId);
        if (isBedMature(bedId)) ctx.world.showLines(`bed:${bedId}`, [{ speaker: def.name, text: def.description }]);
        else ctx.world.toast(`${def.name} wächst noch.`);
      },
    });
  }

  private pollAll(): void {
    for (const bedId of this.live.keys()) this.render(bedId);
  }

  private render(bedId: string): void {
    const entry = this.live.get(bedId);
    if (!entry) return;
    const item = this.interaction.get(`bed:${bedId}`);
    if (item) item.label = labelFor(bedId);

    const bed = getBedState(bedId);
    if (!bed) return;
    const def = content.plants.get(bed.plantId);
    const stage = currentStage(bed);
    const mature = stage >= def.growthStages;

    if (stage !== entry.lastRenderedStage || entry.plantId !== bed.plantId) {
      const tex = textureFor(bed.plantId, stage === 0 ? 'sprout' : mature ? 'mature' : 'growing');
      let sprite = entry.sprite;
      if (!sprite || entry.plantId !== bed.plantId) {
        sprite?.destroy();
        sprite = this.scene.add.image(entry.cx, entry.cy, tex).setOrigin(0.5, 1).setDepth(entry.cy);
        entry.sprite = sprite;
      } else {
        sprite.setTexture(tex);
      }
      sprite.setScale(0.001);
      this.scene.tweens.add({ targets: sprite, scale: 1, duration: 320, ease: 'Back.easeOut' });
      if (entry.lastRenderedStage >= 0 && stage > entry.lastRenderedStage) this.burst(entry.cx, entry.cy);
      entry.lastRenderedStage = stage;
      entry.plantId = bed.plantId;
    }

    this.updateAmbient(entry, def, mature);
  }

  private burst(x: number, y: number): void {
    const emitter = this.scene.add.particles(x, y - 10, 'sparkle', {
      angle: { min: 0, max: 360 },
      speed: { min: 20, max: 60 },
      lifespan: 500,
      scale: { start: 1, end: 0 },
      quantity: 10,
      emitting: false,
    });
    emitter.explode(10);
    this.scene.time.delayedCall(600, () => emitter.destroy());
  }

  private updateAmbient(entry: LiveBed, def: PlantDef, mature: boolean): void {
    // Glow-lily's light (hook for Wave 4's day/night layer, see PlantDef.lightRadius).
    if (mature && def.lightRadius) {
      if (!entry.glow) {
        entry.glow = this.scene.add
          .image(entry.cx, entry.cy - 16, 'light-halo')
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.45)
          .setTint(def.color)
          .setDisplaySize(def.lightRadius * 2, def.lightRadius * 2)
          .setDepth(entry.cy - 1);
        this.scene.tweens.add({ targets: entry.glow, alpha: 0.25, duration: 1400, yoyo: true, repeat: -1 });
      }
      if (!entry.fireflies) {
        entry.fireflies = this.scene.add
          .particles(entry.cx, entry.cy - 16, 'firefly', {
            angle: { min: 0, max: 360 },
            speed: { min: 4, max: 14 },
            lifespan: 2200,
            alpha: { start: 0.9, end: 0 },
            scale: { start: 0.8, end: 0.2 },
            frequency: 450,
          })
          .setDepth(entry.cy);
      }
    } else {
      entry.glow?.destroy();
      entry.glow = undefined;
      entry.fireflies?.destroy();
      entry.fireflies = undefined;
    }

    // Lavender calms the tick-ridden tall grass; a gentle scent drifting up sells the effect.
    if (mature && def.abilityId === 'calm-animals') {
      if (!entry.scent) {
        entry.scent = this.scene.add
          .particles(entry.cx, entry.cy - 10, 'sparkle', {
            tint: def.color,
            angle: { min: 250, max: 290 },
            speed: { min: 6, max: 16 },
            lifespan: 1800,
            alpha: { start: 0.6, end: 0 },
            scale: { start: 0.6, end: 0.1 },
            frequency: 700,
          })
          .setDepth(entry.cy);
      }
    } else {
      entry.scent?.destroy();
      entry.scent = undefined;
    }
  }
}
