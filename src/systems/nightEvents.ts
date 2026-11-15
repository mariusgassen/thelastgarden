/**
 * Night events: short, episodic disturbances that are solved by garden design, not combat.
 * Logic (no Phaser) + `NightEventLayer` (scene-bound dusk overlay and remnants), the same
 * split as plants.ts / plantLayer.ts.
 *
 *   triggerNightEvent(kind?)      run one night now (kind omitted = next in the cycle).
 *                                 THIS is the hook Wave 4's day/night cycle calls at dusk.
 *   startNightScheduler()         Wave 3 stand-in for a day/night cycle: a timer that calls
 *                                 triggerNightEvent() every NIGHT_INTERVAL_MS of play, and
 *                                 once shortly after the first seed is planted.
 *   stopNightScheduler()          Wave 4 calls this once the real cycle drives the nights.
 *   isNightActive()
 *
 * Sequence per night: `night-begins` → (DUSK_MS) resolve + `night-resolved` → (DAWN_MS)
 * `night-ends`. The layer dims the world on begins, drops remnants on resolved and shows the
 * outcome dialogue on ends. Harm is always mild (one growth stage) and never touches a
 * mature bed, so there is no fail state.
 */
import Phaser from 'phaser';
import { content } from '../content';
import { allPlantingBeds } from '../world';
import { TILE_SIZE } from '../world/tiles';
import { bus, type NightEventKind, type NightOutcome } from './events';
import { inputState } from './input';
import type { WorldApi } from './interaction';
import { getBedState, getLightSources, isBedMature, isBedPlanted, shiftGrowth, STAGE_DURATION_MS } from './plants';
import { gameState } from './state';

export const NIGHT_INTERVAL_MS = 180_000;
const FIRST_NIGHT_AFTER_PLANTING_MS = 25_000;
const DUSK_MS = 1600;
const DAWN_MS = 1400;
/** Lavender scent reaches this far (px) — covers the whole main garden; future, larger gardens get locality. */
const SCENT_RADIUS_PX = 18 * TILE_SIZE;
/** Voles keep this many light radii away from a glowing lily. */
const LIGHT_SCARE_FACTOR = 3;
const RAIN_BOOST_MS = 6_000;

const KIND_CYCLE: NightEventKind[] = ['snails', 'voles', 'crows', 'rain'];

interface NightExt {
  count: number;
}

function readExt(): NightExt {
  return gameState.getExt<NightExt>('nightEvents', { count: 0 });
}

let nightActive = false;
let lastNightAt = Date.now();
let scheduledAt: number | null = null;
let schedulerTimer: number | undefined;

export function isNightActive(): boolean {
  return nightActive;
}

interface BedPx {
  id: string;
  mapId: string;
  x: number;
  y: number;
}

function bedsOnMap(mapId: string): BedPx[] {
  return allPlantingBeds()
    .filter((b) => b.mapId === mapId)
    .map((b) => ({ id: b.id, mapId, x: (b.rect.x + b.rect.w / 2) * TILE_SIZE, y: (b.rect.y + b.rect.h) * TILE_SIZE }));
}

const tenderBeds = (mapId: string): BedPx[] => bedsOnMap(mapId).filter((b) => isBedPlanted(b.id) && !isBedMature(b.id));

function matureBedsWithAbility(mapId: string, abilityId: string): BedPx[] {
  return bedsOnMap(mapId).filter((b) => {
    const state = getBedState(b.id);
    return state && isBedMature(b.id) && content.plants.get(state.plantId).abilityId === abilityId;
  });
}

function protectedByLavender(bed: BedPx): boolean {
  return matureBedsWithAbility(bed.mapId, 'calm-animals').some((l) => Math.hypot(l.x - bed.x, l.y - bed.y) <= SCENT_RADIUS_PX);
}

function protectedByLight(bed: BedPx): boolean {
  return getLightSources().some((light) => {
    if (light.mapId !== bed.mapId) return false;
    const src = bedsOnMap(bed.mapId).find((b) => b.id === light.bedId);
    return src !== undefined && Math.hypot(src.x - bed.x, src.y - bed.y) <= light.lightRadius * LIGHT_SCARE_FACTOR;
  });
}

type Resolver = (mapId: string) => NightOutcome | null;

const resolvers: Record<NightEventKind, Resolver> = {
  snails: (mapId) => {
    const tender = tenderBeds(mapId);
    if (tender.length === 0) return null;
    const harmed = tender.filter((b) => !protectedByLavender(b));
    for (const bed of harmed) shiftGrowth(bed.id, STAGE_DURATION_MS);
    if (harmed.length === 0) {
      return { kind: 'snails', dialogueId: 'night-snails-safe', affectedBedIds: [], remnants: [], protectedBy: 'lavender' };
    }
    return {
      kind: 'snails',
      dialogueId: 'night-snails-hit',
      affectedBedIds: harmed.map((b) => b.id),
      remnants: harmed.flatMap((b) => [
        { texture: 'snail', x: b.x - 26, y: b.y + 6 },
        { texture: 'snail', x: b.x + 22, y: b.y + 12 },
      ]),
    };
  },
  voles: (mapId) => {
    const tender = tenderBeds(mapId);
    if (tender.length === 0) return null;
    const harmed = tender.filter((b) => !protectedByLight(b));
    for (const bed of harmed) shiftGrowth(bed.id, STAGE_DURATION_MS);
    if (harmed.length === 0) {
      return { kind: 'voles', dialogueId: 'night-voles-safe', affectedBedIds: [], remnants: [], protectedBy: 'glow-lily' };
    }
    return {
      kind: 'voles',
      dialogueId: 'night-voles-hit',
      affectedBedIds: harmed.map((b) => b.id),
      remnants: harmed.map((b) => ({ texture: 'mole-mound', x: b.x + 30, y: b.y + 10 })),
    };
  },
  crows: (mapId) => {
    const player = gameState.data.player;
    const feather = { texture: 'feather' as const, x: player.x + 18, y: player.y + 8 };
    if (gameState.hasFlag('crow-met')) {
      gameState.addItem('resource-curio', 1);
      return { kind: 'crows', dialogueId: 'night-crows-friend', affectedBedIds: [], remnants: [feather], protectedBy: 'crow' };
    }
    if (matureBedsWithAbility(mapId, 'emit-light').length > 0) {
      gameState.addItem('resource-curio', 1);
      return { kind: 'crows', dialogueId: 'night-crows-lily', affectedBedIds: [], remnants: [feather], protectedBy: 'glow-lily' };
    }
    if (gameState.getItemCount('resource-curio') > 0) {
      gameState.removeItem('resource-curio', 1);
      return { kind: 'crows', dialogueId: 'night-crows-hit', affectedBedIds: [], remnants: [feather] };
    }
    return { kind: 'crows', dialogueId: 'night-crows-nothing', affectedBedIds: [], remnants: [] };
  },
  rain: (mapId) => {
    const tender = tenderBeds(mapId);
    for (const bed of tender) shiftGrowth(bed.id, -RAIN_BOOST_MS);
    const puddles = bedsOnMap(mapId).map((b) => ({ texture: 'puddle' as const, x: b.x - 40, y: b.y + 14 }));
    return {
      kind: 'rain',
      dialogueId: tender.length > 0 ? 'night-rain' : 'night-rain-empty',
      affectedBedIds: tender.map((b) => b.id),
      remnants: puddles,
    };
  },
};

function pickKind(mapId: string): NightEventKind {
  const start = readExt().count % KIND_CYCLE.length;
  for (let i = 0; i < KIND_CYCLE.length; i++) {
    const kind = KIND_CYCLE[(start + i) % KIND_CYCLE.length];
    if (kind === 'rain' || kind === 'crows' || tenderBeds(mapId).length > 0) return kind;
  }
  return 'rain';
}

/** Runs one night. Returns false if a night is already running. Safe to call from Wave 4's cycle. */
export function triggerNightEvent(kind?: NightEventKind): boolean {
  if (nightActive) return false;
  nightActive = true;
  scheduledAt = null;
  const mapId = gameState.data.player.mapId;
  const chosen = kind ?? pickKind(mapId);
  bus.emit('night-begins', { kind: chosen });
  window.setTimeout(() => {
    const outcome = resolvers[chosen](mapId) ?? resolvers.rain(mapId)!;
    gameState.setExt('nightEvents', { count: readExt().count + 1 });
    gameState.save();
    bus.emit('night-resolved', { outcome });
    window.setTimeout(() => {
      nightActive = false;
      lastNightAt = Date.now();
      bus.emit('night-ends', { outcome });
    }, DAWN_MS);
  }, DUSK_MS);
  return true;
}

function dueForNight(): boolean {
  if (nightActive || inputState.modal) return false;
  if (gameState.data.player.mapId !== 'garden') return false;
  if (!allPlantingBeds().some((b) => isBedPlanted(b.id))) return false;
  const now = Date.now();
  if (scheduledAt !== null) return now >= scheduledAt;
  return now - lastNightAt >= NIGHT_INTERVAL_MS;
}

/** Wave 3 stand-in for a day/night cycle. Wave 4: call stopNightScheduler() and trigger nights at dusk instead. */
export function startNightScheduler(): void {
  if (schedulerTimer !== undefined) return;
  lastNightAt = Date.now();
  schedulerTimer = window.setInterval(() => {
    if (dueForNight()) triggerNightEvent();
  }, 1000);
  bus.on('plant-planted', () => {
    if (readExt().count === 0 && scheduledAt === null) scheduledAt = Date.now() + FIRST_NIGHT_AFTER_PLANTING_MS;
  });
}

export function stopNightScheduler(): void {
  if (schedulerTimer === undefined) return;
  window.clearInterval(schedulerTimer);
  schedulerTimer = undefined;
}

const REMNANT_LIFETIME_MS = 45_000;

/** Dusk overlay + remnants for the current map. Created by WorldScene. */
export class NightEventLayer {
  private readonly overlay: Phaser.GameObjects.Rectangle;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: WorldApi,
  ) {
    this.overlay = scene.add.rectangle(-2000, -2000, 6000, 6000, 0x0b1430).setOrigin(0).setScrollFactor(0).setDepth(80_000).setAlpha(0);
    if (nightActive) this.overlay.setAlpha(0.55);
    bus.onScene(scene, 'night-begins', () => {
      scene.tweens.add({ targets: this.overlay, alpha: 0.55, duration: 1200, ease: 'Sine.easeInOut' });
      this.world.toast('Die Nacht senkt sich über den Garten …');
    });
    bus.onScene(scene, 'night-resolved', ({ outcome }) => {
      for (const r of outcome.remnants) this.dropRemnant(r.texture, r.x, r.y);
      scene.tweens.add({ targets: this.overlay, alpha: 0, duration: 1200, ease: 'Sine.easeInOut' });
    });
    bus.onScene(scene, 'night-ends', ({ outcome }) => this.world.showDialogue(outcome.dialogueId));
  }

  private dropRemnant(texture: string, x: number, y: number): void {
    const img = this.scene.add.image(x, y, texture).setOrigin(0.5, 1).setDepth(y).setAlpha(0);
    this.scene.tweens.add({ targets: img, alpha: 1, duration: 500 });
    this.scene.time.delayedCall(REMNANT_LIFETIME_MS, () =>
      this.scene.tweens.add({ targets: img, alpha: 0, duration: 1500, onComplete: () => img.destroy() }),
    );
  }
}
