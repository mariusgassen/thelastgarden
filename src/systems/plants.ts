/**
 * Planting + growth + plant-ability logic. No Phaser dependency — rendering lives in
 * systems/plantLayer.ts (scene-bound), the same split as obstacles.ts / ObstacleLayer.
 *
 * State lives in `ext.plants` (see save.ts `ext`), keyed by bed id:
 *   { beds: { [bedId]: { bedId, plantId, plantedAt } } }
 * Growth is computed from `plantedAt` + STAGE_DURATION_MS, not stored as a stage number,
 * so it is always correct after a reload or a map change, with no per-frame bookkeeping.
 */
import type { ObstacleKind, PlantDef } from '../content/types';
import { content } from '../content';
import { findPlantingBed } from '../world';
import { bus } from './events';
import { addObstacleInteractHandler, unblockPath } from './obstacles';
import { gameState } from './state';

export interface PlantedBed {
  bedId: string;
  plantId: string;
  plantedAt: number;
}

interface PlantsExt {
  beds: Record<string, PlantedBed>;
}

/** Uniform stage length in ms. Total grow time for a species = growthStages * STAGE_DURATION_MS. */
export const STAGE_DURATION_MS = 15_000;

/** Species tried, in order, on a bed that accepts any plant (PlantingBedDef.plantId is omitted). */
const ANY_BED_SPECIES_ORDER = ['bramble-vine', 'glow-lily', 'lavender'];

function readState(): PlantsExt {
  return gameState.getExt<PlantsExt>('plants', { beds: {} });
}

function writeState(state: PlantsExt): void {
  gameState.setExt('plants', state);
}

export function getBedState(bedId: string): PlantedBed | undefined {
  return readState().beds[bedId];
}

export function isBedPlanted(bedId: string): boolean {
  return getBedState(bedId) !== undefined;
}

/** 0 = just planted, def.growthStages = fully grown. */
export function currentStage(bed: PlantedBed): number {
  const def = content.plants.get(bed.plantId);
  const elapsed = Date.now() - bed.plantedAt;
  return Math.min(def.growthStages, Math.floor(elapsed / STAGE_DURATION_MS));
}

export function isBedMature(bedId: string): boolean {
  const bed = getBedState(bedId);
  if (!bed) return false;
  return currentStage(bed) >= content.plants.get(bed.plantId).growthStages;
}

/** Plants a seed on an empty bed. False if already planted, unknown bed, or no matching seed owned. */
export function plantSeed(bedId: string): boolean {
  const bedDef = findPlantingBed(bedId);
  if (!bedDef || isBedPlanted(bedId)) return false;

  const candidates = bedDef.plantId ? [bedDef.plantId] : ANY_BED_SPECIES_ORDER;
  const plantId = candidates.find((id) => {
    const seedItemId = content.plants.get(id).seedItemId;
    return seedItemId !== undefined && gameState.getItemCount(seedItemId) > 0;
  });
  if (!plantId) return false;

  const seedItemId = content.plants.get(plantId).seedItemId as string;
  gameState.removeItem(seedItemId, 1);

  const state = readState();
  state.beds[bedId] = { bedId, plantId, plantedAt: Date.now() };
  writeState(state);
  gameState.setFlag(`bed-planted:${bedId}`);
  gameState.save();
  bus.emit('plant-planted', { bedId, plantId });
  return true;
}

/** A mature plant (on any map) whose PlantDef.clears includes `kind`, or undefined. */
export function getMatureClearingKind(kind: ObstacleKind): PlantDef | undefined {
  for (const bed of Object.values(readState().beds)) {
    if (!isBedMature(bed.bedId)) continue;
    const def = content.plants.get(bed.plantId);
    if (def.clears?.includes(kind)) return def;
  }
  return undefined;
}

/** True if any mature planted bed has this PlantDef.abilityId (Wave 3 query hook). */
export function hasAbility(abilityId: string): boolean {
  return Object.values(readState().beds).some(
    (bed) => isBedMature(bed.bedId) && content.plants.get(bed.plantId).abilityId === abilityId,
  );
}

/** Light sources from mature plants that declare PlantDef.lightRadius (Wave 4 atmosphere hook). */
export function getLightSources(): { bedId: string; mapId: string; lightRadius: number }[] {
  const out: { bedId: string; mapId: string; lightRadius: number }[] = [];
  for (const bed of Object.values(readState().beds)) {
    if (!isBedMature(bed.bedId)) continue;
    const def = content.plants.get(bed.plantId);
    const bedDef = findPlantingBed(bed.bedId);
    if (def.lightRadius && bedDef) out.push({ bedId: bed.bedId, mapId: bedDef.mapId, lightRadius: def.lightRadius });
  }
  return out;
}

function abilityFlavor(abilityId?: string): string {
  switch (abilityId) {
    case 'weave-through-brambles':
      return 'windet sich durchs Gestrüpp und öffnet einen Weg.';
    case 'calm-animals':
      return 'ihr Duft vertreibt die Zecken aus dem hohen Gras.';
    default:
      return 'öffnet den Weg.';
  }
}

/**
 * Registered once at module load (imported from BootScene): lets a mature plant's ability
 * clear a blocked obstacle on inspection. See ARCHITECTURE.md's obstacle API for the pattern.
 */
addObstacleInteractHandler((obstacle, ctx) => {
  const plant = getMatureClearingKind(obstacle.blockedBy);
  if (!plant) return false;
  unblockPath(obstacle.id);
  ctx.world.toast(`${plant.name} ${abilityFlavor(plant.abilityId)}`);
  return true;
});

let tickerStarted = false;
/** Flips `bed-restored:<bedId>` / `ability:<abilityId>` flags as beds mature, even off-screen. Call once at boot. */
export function startGrowthTicker(): void {
  if (tickerStarted) return;
  tickerStarted = true;
  window.setInterval(() => {
    const state = readState();
    let dirty = false;
    for (const bed of Object.values(state.beds)) {
      if (!isBedMature(bed.bedId) || gameState.hasFlag(`bed-restored:${bed.bedId}`)) continue;
      const def = content.plants.get(bed.plantId);
      gameState.setFlag(`bed-restored:${bed.bedId}`);
      if (def.abilityId) gameState.setFlag(`ability:${def.abilityId}`);
      bus.emit('plant-matured', { bedId: bed.bedId, plantId: bed.plantId });
      dirty = true;
    }
    if (dirty) gameState.save();
  }, 2000);
}

/** Dev-only: rewinds every planted bed's clock so growth advances immediately (see window.__tlg). */
export function debugRewindGrowth(ms: number): void {
  const state = readState();
  for (const bed of Object.values(state.beds)) bed.plantedAt -= ms;
  writeState(state);
  gameState.save();
}

/** All currently planted beds across all maps (dev/debug helper, also handy for a future quest HUD). */
export function getAllPlantedBeds(): PlantedBed[] {
  return Object.values(readState().beds);
}
