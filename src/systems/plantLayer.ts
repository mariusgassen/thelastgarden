import Phaser from 'phaser';
import { content } from '../content';
import type { PlantDef } from '../content/types';
import { allPlantingBeds } from '../world';
import { TILE_SIZE } from '../world/tiles';
import { bus } from './events';
import type { InteractionSystem } from './interaction';
import { gameState } from './state';
import {
  canWaterBed,
  currentStage,
  getBedState,
  getPlantableSpecies,
  harvestBed,
  isBedMature,
  isBedPlanted,
  isProduceReady,
  plantSeed,
  waterBed,
} from './plants';

const SEED_PICKER_PREFIX = 'seed-picker:';

function labelFor(bedId: string): string {
  if (!isBedPlanted(bedId)) return 'Pflanzen';
  if (isBedMature(bedId)) return isProduceReady(bedId) ? 'Ernten' : 'Ansehen';
  return canWaterBed(bedId) ? 'Gießen' : 'Wächst…';
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
  /** Bobbing marker shown while produce is ready to harvest. */
  produce?: Phaser.GameObjects.Image;
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
    private readonly mapId: string,
    private readonly interaction: InteractionSystem,
  ) {
    this.syncBeds();
    // Planters come and go with what the player builds (systems/building.ts).
    bus.onScene(scene, 'build-changed', () => this.syncBeds());
    bus.onScene(scene, 'plant-planted', ({ bedId }) => this.render(bedId));
    bus.onScene(scene, 'plant-matured', ({ bedId }) => this.render(bedId));
    bus.onScene(scene, 'plant-harvested', ({ bedId }) => this.render(bedId));
    bus.onScene(scene, 'plant-removed', ({ bedId }) => this.clearBed(bedId));
    bus.onScene(scene, 'dialogue-choice', ({ dialogueId, choiceId }) => {
      if (!dialogueId.startsWith(SEED_PICKER_PREFIX)) return;
      const bedId = dialogueId.slice(SEED_PICKER_PREFIX.length);
      if (plantSeed(bedId, choiceId)) bus.emit('toast', { text: `${content.plants.get(choiceId).name} gepflanzt.` });
      this.render(bedId);
    });
    scene.time.addEvent({ delay: 1000, loop: true, callback: () => this.pollAll() });
  }

  /** A plant was dug up (shovel): the bed stays, its sprite and effects go. */
  private clearBed(bedId: string): void {
    const entry = this.live.get(bedId);
    if (!entry) return;
    for (const part of [entry.sprite, entry.glow, entry.fireflies, entry.scent, entry.produce]) part?.destroy();
    entry.sprite = entry.glow = entry.fireflies = entry.scent = entry.produce = undefined;
    entry.lastRenderedStage = -1;
    entry.plantId = undefined;
    this.render(bedId);
  }

  private syncBeds(): void {
    const beds = allPlantingBeds().filter((b) => b.mapId === this.mapId);
    const wanted = new Set(beds.map((b) => b.id));
    for (const [bedId, entry] of this.live) {
      if (wanted.has(bedId)) continue;
      for (const part of [entry.sprite, entry.glow, entry.fireflies, entry.scent, entry.produce]) part?.destroy();
      this.interaction.unregister(`bed:${bedId}`);
      this.live.delete(bedId);
    }
    for (const bed of beds) {
      if (this.live.has(bed.id)) continue;
      const cx = (bed.rect.x + bed.rect.w / 2) * TILE_SIZE;
      const cy = (bed.rect.y + bed.rect.h) * TILE_SIZE;
      this.live.set(bed.id, { cx, cy, lastRenderedStage: -1 });
      this.registerInteractable(bed.id, cx, cy);
      this.render(bed.id);
    }
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
          const species = getPlantableSpecies(bedId);
          if (species.length > 1) {
            // Open bed and several kinds of seed in the pocket: let the player choose.
            ctx.world.showLines(`${SEED_PICKER_PREFIX}${bedId}`, [
              {
                text: 'Die Erde ist locker und bereit. Was soll hier wachsen?',
                choices: [
                  ...species.map((id) => {
                    const def = content.plants.get(id);
                    return { id, label: `${def.name} (${gameState.getItemCount(def.seedItemId as string)})` };
                  }),
                  { label: 'Noch nichts' },
                ],
              },
            ]);
            return;
          }
          if (plantSeed(bedId)) ctx.world.toast('Samen gepflanzt.');
          else ctx.world.toast('Dafür fehlen noch die passenden Samen.');
          this.render(bedId);
          return;
        }
        const bed = getBedState(bedId)!;
        const def = content.plants.get(bed.plantId);
        if (!isBedMature(bedId)) {
          if (waterBed(bedId)) ctx.world.toast(`Der Tau perlt in die Erde. ${def.name} streckt sich.`);
          else ctx.world.toast(`${def.name} wächst noch.`);
          this.render(bedId);
          return;
        }
        const harvest = harvestBed(bedId);
        if (!harvest) {
          ctx.world.showLines(`bed:${bedId}`, [{ speaker: def.name, text: def.description }]);
          return;
        }
        ctx.world.toast(`+1 ${content.items.get(harvest.itemId).name}`);
        if (harvest.seedItemId) ctx.world.toast(`+1 ${content.items.get(harvest.seedItemId).name}`);
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
    this.updateProduce(entry, bedId, def);
  }

  private updateProduce(entry: LiveBed, bedId: string, def: PlantDef): void {
    if (!isProduceReady(bedId)) {
      entry.produce?.destroy();
      entry.produce = undefined;
      return;
    }
    if (entry.produce) return;
    const y = entry.cy - 44;
    entry.produce = this.scene.add
      .image(entry.cx + 16, y, 'pickup-orb')
      .setTint(content.items.get(def.produceItemId as string).color)
      .setScale(0.6)
      .setDepth(entry.cy + 1);
    this.scene.tweens.add({ targets: entry.produce, y: y - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
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

    // Lavender, Night Violet and Hollyhock send up gentle scent / blossom motes when mature.
    if (mature && (def.abilityId === 'calm-animals' || def.abilityId === 'call-pollinators' || def.abilityId === 'tower-bloom')) {
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
