import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bus } from '../../src/systems/events';
import {
  addObstacleInteractHandler,
  getObstacles,
  getObstaclesBlockedBy,
  isBlocked,
  unblockPath,
} from '../../src/systems/obstacles';
import {
  canWaterBed,
  currentStage,
  debugRewindGrowth,
  getAllPlantedBeds,
  getBedState,
  getLightSources,
  getMatureClearingKind,
  getPlantableSpecies,
  HARVEST_REGROW_MS,
  harvestBed,
  hasAbility,
  isBedMature,
  isBedPlanted,
  isProduceReady,
  plantSeed,
  SEED_DROP_EVERY,
  shiftGrowth,
  STAGE_DURATION_MS,
  startGrowthTicker,
  waterBed,
} from '../../src/systems/plants';
import { gameState } from '../../src/systems/state';
import { findObstacle } from '../../src/world';

describe('plants and obstacles systems', () => {
  beforeEach(() => {
    localStorage.clear();
    gameState.reset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('plants species-locked and open beds, consumes seeds, and prevents double planting', () => {
    expect(plantSeed('unknown-bed')).toBe(false);
    expect(plantSeed('bed-bramble')).toBe(false); // no seed owned yet

    gameState.addItem('seed-lavender', 1);
    // bed-bramble only accepts bramble-vine
    expect(plantSeed('bed-bramble')).toBe(false);
    expect(gameState.getItemCount('seed-lavender')).toBe(1);

    // bed-extra accepts any owned seed in priority order (bramble-vine -> glow-lily -> lavender)
    gameState.addItem('seed-glow-lily', 1);
    const plantedEvents: { bedId: string; plantId: string }[] = [];
    const onPlant = (p: { bedId: string; plantId: string }) => plantedEvents.push(p);
    bus.on('plant-planted', onPlant);

    expect(plantSeed('bed-extra')).toBe(true);
    expect(getBedState('bed-extra')?.plantId).toBe('glow-lily');
    expect(gameState.getItemCount('seed-glow-lily')).toBe(0);
    expect(gameState.getItemCount('seed-lavender')).toBe(1);
    expect(gameState.hasFlag('bed-planted:bed-extra')).toBe(true);
    expect(isBedPlanted('bed-extra')).toBe(true);
    expect(plantSeed('bed-extra')).toBe(false); // already planted
    expect(getAllPlantedBeds()).toHaveLength(1);

    bus.off('plant-planted', onPlant);
    expect(plantedEvents).toEqual([{ bedId: 'bed-extra', plantId: 'glow-lily' }]);
  });

  it('tracks growth stages, shiftGrowth clamping, maturity flags, and light sources', () => {
    gameState.addItem('seed-glow-lily', 1);
    expect(plantSeed('bed-lily')).toBe(true);

    const bed = getBedState('bed-lily')!;
    expect(currentStage(bed)).toBe(0);
    expect(isBedMature('bed-lily')).toBe(false);
    expect(hasAbility('emit-light')).toBe(false);
    expect(getLightSources()).toEqual([]);

    vi.advanceTimersByTime(STAGE_DURATION_MS * 2);
    expect(currentStage(getBedState('bed-lily')!)).toBe(2);
    expect(isBedMature('bed-lily')).toBe(false);

    // Setback cannot push plantedAt into the future (below stage 0)
    expect(shiftGrowth('bed-lily', STAGE_DURATION_MS * 10)).toBe(true);
    expect(currentStage(getBedState('bed-lily')!)).toBe(0);
    expect(shiftGrowth('bed-lily', 1000)).toBe(false); // already clamped to now

    // Advance via negative shift + growth ticker
    startGrowthTicker();
    expect(shiftGrowth('bed-lily', -STAGE_DURATION_MS * 3)).toBe(true);
    expect(isBedMature('bed-lily')).toBe(true);
    expect(shiftGrowth('bed-lily', STAGE_DURATION_MS)).toBe(false); // mature bed is never harmed

    const maturedEvents: { bedId: string; plantId: string }[] = [];
    const onMature = (p: { bedId: string; plantId: string }) => maturedEvents.push(p);
    bus.on('plant-matured', onMature);
    vi.advanceTimersByTime(2000);
    bus.off('plant-matured', onMature);

    expect(maturedEvents).toEqual([{ bedId: 'bed-lily', plantId: 'glow-lily' }]);
    expect(gameState.hasFlag('bed-restored:bed-lily')).toBe(true);
    expect(gameState.hasFlag('ability:emit-light')).toBe(true);
    expect(hasAbility('emit-light')).toBe(true);
    expect(getLightSources()).toEqual([{ bedId: 'bed-lily', mapId: 'garden', lightRadius: 150 }]);
  });

  it('lets the player pick the species for an open bed', () => {
    expect(getPlantableSpecies('unknown-bed')).toEqual([]);
    gameState.addItem('seed-glow-lily', 1);
    gameState.addItem('seed-lavender', 1);
    expect(getPlantableSpecies('bed-extra')).toEqual(['glow-lily', 'lavender']);
    expect(getPlantableSpecies('bed-lavender')).toEqual(['lavender']); // species-locked bed

    expect(plantSeed('bed-extra', 'bramble-vine')).toBe(false); // no such seed owned
    expect(plantSeed('bed-lavender', 'glow-lily')).toBe(false); // bed does not accept it
    expect(plantSeed('bed-extra', 'lavender')).toBe(true);
    expect(getBedState('bed-extra')?.plantId).toBe('lavender');
    expect(gameState.getItemCount('seed-lavender')).toBe(0);
    expect(gameState.getItemCount('seed-glow-lily')).toBe(1);
  });

  it('waters a growing bed with dew once per stage, and never needs dew to mature', () => {
    gameState.addItem('seed-glow-lily', 1);
    expect(plantSeed('bed-lily')).toBe(true);
    expect(canWaterBed('bed-lily')).toBe(false); // no dew
    expect(waterBed('bed-lily')).toBe(false);

    gameState.addItem('resource-dew', 3);
    expect(waterBed('bed-lily')).toBe(true);
    expect(gameState.getItemCount('resource-dew')).toBe(2);
    expect(currentStage(getBedState('bed-lily')!)).toBe(1);
    expect(waterBed('bed-lily')).toBe(false); // this stage is already watered
    expect(gameState.getItemCount('resource-dew')).toBe(2);

    vi.advanceTimersByTime(STAGE_DURATION_MS);
    expect(waterBed('bed-lily')).toBe(true);
    expect(isBedMature('bed-lily')).toBe(true);
    expect(waterBed('bed-lily')).toBe(false); // mature beds are not watered
    expect(gameState.getItemCount('resource-dew')).toBe(1);

    // Without dew the same species still matures on its own
    gameState.addItem('seed-glow-lily', 1);
    expect(plantSeed('bed-tower-lily')).toBe(true);
    vi.advanceTimersByTime(STAGE_DURATION_MS * 3);
    expect(isBedMature('bed-tower-lily')).toBe(true);
  });

  it('harvests regrowing produce from mature beds and drops a seed on every third harvest', () => {
    gameState.addItem('seed-bramble-vine', 1);
    expect(plantSeed('bed-bramble')).toBe(true);
    expect(isProduceReady('bed-bramble')).toBe(false);
    expect(harvestBed('bed-bramble')).toBeNull(); // not mature yet
    expect(harvestBed('unknown-bed')).toBeNull();

    vi.advanceTimersByTime(STAGE_DURATION_MS * 3);
    expect(isProduceReady('bed-bramble')).toBe(true);

    const harvested: string[] = [];
    const onHarvest = (p: { itemId: string }) => harvested.push(p.itemId);
    bus.on('plant-harvested', onHarvest);

    // First harvest: produce plus a seed, so the species is never lost
    expect(harvestBed('bed-bramble')).toEqual({ itemId: 'produce-tendril', seedItemId: 'seed-bramble-vine' });
    expect(gameState.getItemCount('produce-tendril')).toBe(1);
    expect(gameState.getItemCount('seed-bramble-vine')).toBe(1);
    expect(gameState.hasFlag('harvested-once')).toBe(true);
    expect(isBedMature('bed-bramble')).toBe(true); // the plant stays

    // Produce has to regrow first
    expect(harvestBed('bed-bramble')).toBeNull();
    vi.advanceTimersByTime(HARVEST_REGROW_MS - 1);
    expect(isProduceReady('bed-bramble')).toBe(false);
    vi.advanceTimersByTime(1);

    for (let i = 1; i < SEED_DROP_EVERY; i++) {
      expect(harvestBed('bed-bramble')).toEqual({ itemId: 'produce-tendril', seedItemId: undefined });
      vi.advanceTimersByTime(HARVEST_REGROW_MS);
    }
    expect(harvestBed('bed-bramble')).toEqual({ itemId: 'produce-tendril', seedItemId: 'seed-bramble-vine' });
    expect(gameState.getItemCount('produce-tendril')).toBe(SEED_DROP_EVERY + 1);
    expect(gameState.getItemCount('seed-bramble-vine')).toBe(2);

    // debugRewindGrowth also fast-forwards regrowth
    expect(isProduceReady('bed-bramble')).toBe(false);
    debugRewindGrowth(HARVEST_REGROW_MS);
    expect(isProduceReady('bed-bramble')).toBe(true);

    bus.off('plant-harvested', onHarvest);
    expect(harvested).toHaveLength(SEED_DROP_EVERY + 1);

    // A plant without produce (moon fern) is never harvestable
    gameState.addItem('seed-moon-fern', 1);
    expect(plantSeed('bed-heart-fern')).toBe(true);
    vi.advanceTimersByTime(STAGE_DURATION_MS * 3);
    expect(isBedMature('bed-heart-fern')).toBe(true);
    expect(isProduceReady('bed-heart-fern')).toBe(false);
  });

  it('manages obstacles and lets mature plant abilities clear matching obstacles', () => {
    expect(getObstacles('garden')).toHaveLength(3);
    expect(getObstacles('workshop')).toHaveLength(0);
    expect(isBlocked('bramble-greenhouse-yard')).toBe(true);
    expect(isBlocked('non-existent')).toBe(false);
    expect(getObstaclesBlockedBy('bramble').map((o) => o.id)).toEqual([
      'bramble-greenhouse-yard',
      'bramble-tram-switch',
      'bramble-orchard-terrace',
      'bramble-farm-gate',
    ]);

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(unblockPath('non-existent')).toBe(false);
    expect(warn).toHaveBeenCalledOnce();

    // Mature bramble-vine clears bramble, not fallenTree
    gameState.addItem('seed-bramble-vine', 1);
    expect(plantSeed('bed-bramble')).toBe(true);
    expect(getMatureClearingKind('bramble')).toBeUndefined();

    debugRewindGrowth(STAGE_DURATION_MS * 3);
    expect(getMatureClearingKind('bramble')?.id).toBe('bramble-vine');
    expect(getMatureClearingKind('fallenTree')).toBeUndefined();

    // Exercise the obstacle interact handler registered by plants.ts via addObstacleInteractHandler precedence
    const brambleObstacle = findObstacle('bramble-greenhouse-yard')!;
    const fallenTree = findObstacle('fallen-tree-canal')!;
    expect(brambleObstacle).toBeDefined();
    expect(fallenTree).toBeDefined();

    // Test custom handler LIFO order + remover
    const calls: string[] = [];
    const removeHandler = addObstacleInteractHandler((obs, ctx) => {
      calls.push(obs.id);
      if (obs.id === 'bramble-greenhouse-yard') {
        unblockPath(obs.id);
        ctx.world.toast('cleared');
        return true;
      }
      return false;
    });

    try {
      const unblockedEvents: string[] = [];
      const onUnblock = (p: { obstacleId: string }) => unblockedEvents.push(p.obstacleId);
      bus.on('path-unblocked', onUnblock);

      expect(unblockPath('tallgrass-hut-trail')).toBe(true);
      expect(unblockPath('tallgrass-hut-trail')).toBe(false);
      expect(isBlocked('tallgrass-hut-trail')).toBe(false);
      expect(getObstaclesBlockedBy('tallGrass').map((o) => o.id)).toEqual(['tallgrass-hill-nook']);

      removeHandler();
      expect(calls).toEqual([]);
      expect(unblockedEvents).toEqual(['tallgrass-hut-trail']);
      bus.off('path-unblocked', onUnblock);
    } finally {
      removeHandler();
    }
  });
});
