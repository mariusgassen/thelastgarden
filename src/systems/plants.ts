/**
 * Planting + growth + plant-ability logic. No Phaser dependency — rendering lives in
 * systems/plantLayer.ts (scene-bound), the same split as obstacles.ts / ObstacleLayer.
 *
 * State lives in `ext.plants` (see save.ts `ext`), keyed by bed id:
 *   { beds: { [bedId]: { bedId, plantId, plantedAt, harvestedAt?, harvests?, wateredStage? } } }
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
  /** Epoch ms of the last harvest; unset = never harvested (produce is ready as soon as the bed matures). */
  harvestedAt?: number;
  /** Harvests so far; drives the seed-drop rhythm (see SEED_DROP_EVERY). */
  harvests?: number;
  /** Growth stage last watered with dew; each stage can be watered once. */
  wateredStage?: number;
}

interface PlantsExt {
  beds: Record<string, PlantedBed>;
}

/** Uniform stage length in ms. Total grow time for a species = growthStages * STAGE_DURATION_MS. */
export const STAGE_DURATION_MS = 15_000;

/** How long a harvested plant needs to regrow its produce. */
export const HARVEST_REGROW_MS = 60_000;
/** The 1st, 4th, 7th … harvest of a bed also yields one seed of its species. */
export const SEED_DROP_EVERY = 3;
/** Watering a growing bed spends one dew and skips this much growth time. Never required. */
export const DEW_BOOST_MS = STAGE_DURATION_MS;
const DEW_ITEM_ID = 'resource-dew';

/** Species tried, in order, on a bed that accepts any plant (PlantingBedDef.plantId is omitted). */
const ANY_BED_SPECIES_ORDER = [
  'bramble-vine',
  'glow-lily',
  'lavender',
  'night-violet',
  'moon-fern',
  'hollyhock',
  'glowcap',
  'thornroot',
  'reed',
  'willow',
  'honeyberry',
  'gold-turnip',
];

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

/** Species this bed accepts that the player owns a seed for, in planting-priority order. */
export function getPlantableSpecies(bedId: string): string[] {
  const bedDef = findPlantingBed(bedId);
  if (!bedDef) return [];
  const candidates = bedDef.plantId ? [bedDef.plantId] : ANY_BED_SPECIES_ORDER;
  return candidates.filter((id) => {
    const seedItemId = content.plants.get(id).seedItemId;
    return seedItemId !== undefined && gameState.getItemCount(seedItemId) > 0;
  });
}

/**
 * Plants a seed on an empty bed. `plantId` picks the species (open beds); omitted = the first
 * plantable one. False if already planted, unknown bed, or no matching seed owned.
 */
export function plantSeed(bedId: string, plantId?: string): boolean {
  if (isBedPlanted(bedId)) return false;
  const plantable = getPlantableSpecies(bedId);
  plantId ??= plantable[0];
  if (!plantId || !plantable.includes(plantId)) return false;

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

/** True if the bed is growing, has not been watered in its current stage, and the player carries dew. */
export function canWaterBed(bedId: string): boolean {
  const bed = getBedState(bedId);
  if (!bed || isBedMature(bedId)) return false;
  return currentStage(bed) !== bed.wateredStage && gameState.getItemCount(DEW_ITEM_ID) > 0;
}

/** Spends one dew to push a growing bed forward by DEW_BOOST_MS. Optional help, never a requirement. */
export function waterBed(bedId: string): boolean {
  if (!canWaterBed(bedId)) return false;
  gameState.removeItem(DEW_ITEM_ID, 1);
  const state = readState();
  const bed = state.beds[bedId];
  bed.plantedAt -= DEW_BOOST_MS;
  bed.wateredStage = currentStage(bed);
  writeState(state);
  gameState.save();
  return true;
}

/** True if the bed is mature and its produce has (re)grown. */
export function isProduceReady(bedId: string): boolean {
  const bed = getBedState(bedId);
  if (!bed || !isBedMature(bedId) || !content.plants.get(bed.plantId).produceItemId) return false;
  return bed.harvestedAt === undefined || Date.now() - bed.harvestedAt >= HARVEST_REGROW_MS;
}

/**
 * Harvests a mature bed: one produce item, plus a seed of the species on every
 * SEED_DROP_EVERY-th harvest (starting with the first). The plant stays and regrows.
 * Returns what was gained, or null if nothing is ready.
 */
export function harvestBed(bedId: string): { itemId: string; seedItemId?: string } | null {
  if (!isProduceReady(bedId)) return null;
  const state = readState();
  const bed = state.beds[bedId];
  const def = content.plants.get(bed.plantId);
  const itemId = def.produceItemId as string;
  const harvests = bed.harvests ?? 0;
  const seedItemId = harvests % SEED_DROP_EVERY === 0 ? def.seedItemId : undefined;
  bed.harvestedAt = Date.now();
  bed.harvests = harvests + 1;
  writeState(state);
  gameState.addItem(itemId, 1);
  if (seedItemId) gameState.addItem(seedItemId, 1);
  gameState.setFlag('harvested-once');
  gameState.setFlag(`harvested:${itemId}`);
  gameState.save();
  bus.emit('plant-harvested', { bedId, plantId: bed.plantId, itemId });
  return { itemId, seedItemId };
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
    case 'calm-animals':
      return 'ihr Duft vertreibt die Zecken aus dem hohen Gras.';
    case 'awaken-heart':
      return 'schickt ein silbernes Leuchten aus, das den dichten Nebel teilt.';
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

addObstacleInteractHandler((obstacle, ctx) => {
  if (obstacle.blockedBy !== 'fallenTree' || gameState.getItemCount('garden-saw') <= 0) return false;
  unblockPath(obstacle.id);
  ctx.world.toast('Mit der Astsäge räumst du den umgestürzten Stamm Stück für Stück aus dem Weg.');
  return true;
});

/** A bramble is opened on the spot by one crafted cutting; a mature vine alone no longer clears them all. */
const BRAMBLE_CUTTING_ITEM_ID = 'craft-bramble-cutting';
addObstacleInteractHandler((obstacle, ctx) => {
  if (obstacle.blockedBy !== 'bramble' || !gameState.removeItem(BRAMBLE_CUTTING_ITEM_ID, 1)) return false;
  unblockPath(obstacle.id);
  ctx.world.toast('Du setzt den Steckling. Er windet sich durchs Gestrüpp und öffnet einen Weg.');
  return true;
});

/** Empties a bed (a planter being taken down). Returns the species that grew there, if any. */
export function clearBed(bedId: string): string | undefined {
  const state = readState();
  const bed = state.beds[bedId];
  if (!bed) return undefined;
  delete state.beds[bedId];
  writeState(state);
  gameState.setFlag(`bed-restored:${bedId}`, false);
  return bed.plantId;
}

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

/**
 * Moves one bed's growth clock: negative ms = growth advances (rain), positive = setback
 * (pests). A setback never goes below "just planted", and a mature bed is never touched
 * (its `bed-restored` flag stays truthful). Returns false if nothing changed.
 */
export function shiftGrowth(bedId: string, ms: number): boolean {
  const state = readState();
  const bed = state.beds[bedId];
  if (!bed || isBedMature(bedId)) return false;
  const next = Math.min(Date.now(), bed.plantedAt + ms);
  if (next === bed.plantedAt) return false;
  bed.plantedAt = next;
  writeState(state);
  gameState.save();
  return true;
}

/** Dev-only: rewinds every planted bed's clock so growth and regrowth advance immediately (see window.__tlg). */
export function debugRewindGrowth(ms: number): void {
  const state = readState();
  for (const bed of Object.values(state.beds)) {
    bed.plantedAt -= ms;
    if (bed.harvestedAt !== undefined) bed.harvestedAt -= ms;
  }
  writeState(state);
  gameState.save();
}

/** All currently planted beds across all maps (dev/debug helper, also handy for a future quest HUD). */
export function getAllPlantedBeds(): PlantedBed[] {
  return Object.values(readState().beds);
}
