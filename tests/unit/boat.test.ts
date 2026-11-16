import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  boardBoat,
  clearBoating,
  disembarkBoat,
  ferryBoatTo,
  findLandingTile,
  getParkedBoat,
  isBoating,
  isBoatingHere,
  isOpenWaterTile,
} from '../../src/systems/boat';
import { placePiece, planterBedId } from '../../src/systems/building';
import { bus, type NightOutcome } from '../../src/systems/events';
import { isRiding, isRidingHere, setRiding, shouldShowFollowerHorse } from '../../src/systems/horse';
import { triggerNightEvent } from '../../src/systems/nightEvents';
import { getBedState, plantSeed } from '../../src/systems/plants';
import { gameState } from '../../src/systems/state';
import { TILE_SIZE } from '../../src/world/tiles';

describe('rowboats and water gameplay', () => {
  beforeEach(() => {
    localStorage.clear();
    gameState.reset();
    gameState.data.player.mapId = 'garden';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('boards onto open water, stops horse riding, and finds shore landings', () => {
    gameState.setFlag('horse-tamed');
    setRiding(true);
    expect(isRiding()).toBe(true);

    const boatEvents: boolean[] = [];
    const onBoat = (p: { boating: boolean }) => boatEvents.push(p.boating);
    bus.on('boat-changed', onBoat);

    expect(isOpenWaterTile('garden', 40, 36)).toBe(true);
    expect(isOpenWaterTile('garden', 22, 37)).toBe(false);

    // Board pond water in garden
    expect(boardBoat('garden', { x: 40, y: 36 })).toBe(true);
    expect(isBoating()).toBe(true);
    expect(isBoatingHere('garden')).toBe(true);
    expect(isRiding()).toBe(false); // dismounted Mohn when entering the boat
    expect(isRidingHere('garden')).toBe(false);
    expect(shouldShowFollowerHorse('garden')).toBe(false);
    expect(setRiding(true)).toBe(false); // cannot mount Mohn on the water
    expect(gameState.hasFlag('boated-once')).toBe(true);

    // Move near eastern bank / pond bank -> finds a landing tile and disembarks
    expect(findLandingTile('garden', 39 * TILE_SIZE, 36 * TILE_SIZE)).not.toBeNull();
    expect(disembarkBoat('garden', 39 * TILE_SIZE, 36 * TILE_SIZE)).toBe(true);
    expect(isBoating()).toBe(false);
    expect(getParkedBoat('garden')).toEqual({ x: 39, y: 36 });
    expect(boatEvents).toEqual([true, false]);
    bus.off('boat-changed', onBoat);
  });

  it('parks a boat beside isolated islands so players can always board back across the water', () => {
    gameState.data.player.mapId = 'river-farms';
    expect(boardBoat('river-farms', { x: 37, y: 17 })).toBe(true);
    expect(getParkedBoat('river-farms')).toBeNull();

    // Disembark onto the secluded east river island (x=40..43) from water tile (39, 12)
    expect(disembarkBoat('river-farms', 39.4 * TILE_SIZE, 12.5 * TILE_SIZE)).toBe(true);
    expect(isBoating()).toBe(false);
    expect(Math.floor(gameState.data.player.x / TILE_SIZE)).toBe(40);
    expect(getParkedBoat('river-farms')).toEqual({ x: 39, y: 12 });

    // Re-board from the parked boat on the island
    const parked = getParkedBoat('river-farms')!;
    expect(boardBoat('river-farms', parked)).toBe(true);
    expect(isBoating()).toBe(true);
    expect(getParkedBoat('river-farms')).toBeNull();

    // Landing back at the moored pier clears parked state (no duplicate boat needed)
    expect(disembarkBoat('river-farms', 37.2 * TILE_SIZE, 16.0 * TILE_SIZE)).toBe(true);
    expect(isBoating()).toBe(false);
    expect(getParkedBoat('river-farms')).toBeNull();
  });

  it('refuses boarding indoors and clears boating when ferrying across river maps', () => {
    expect(boardBoat('workshop', { x: 4, y: 4 })).toBe(false);
    expect(isBoating()).toBe(false);

    expect(boardBoat('old-mill', { x: 21, y: 4 })).toBe(true);
    expect(isBoating()).toBe(true);

    const travels: { mapId: string; spawn: string }[] = [];
    const onTravel = (p: { mapId: string; spawn: string }) => travels.push(p);
    bus.on('fast-travel', onTravel);
    ferryBoatTo('river-farms', 'pier');
    bus.off('fast-travel', onTravel);

    expect(isBoating()).toBe(false);
    expect(travels).toEqual([{ mapId: 'river-farms', spawn: 'pier' }]);

    expect(boardBoat('garden', { x: 40, y: 36 })).toBe(true);
    clearBoating();
    expect(isBoating()).toBe(false);
  });

  it('lets player-built boat docks spawn rowboats cleanly', () => {
    gameState.addItem('mat-wood', 10);
    gameState.addItem('mat-scrap', 5);
    expect(placePiece('garden', 'boat-dock', 38, 36)).toBeNull();
    expect(isOpenWaterTile('garden', 38, 36)).toBe(true);
    expect(boardBoat('garden', { x: 38, y: 36 })).toBe(true);
    // Prefers adjacent free water tile over dock tile
    expect(Math.floor(gameState.data.player.x / TILE_SIZE)).toBe(39);
  });

  it('shields floating beds from nocturnal snails and voles while land beds stay vulnerable', () => {
    vi.useFakeTimers();
    vi.setSystemTime(4_000_000);
    gameState.addItem('produce-reed-bundle', 2);
    gameState.addItem('mat-wood', 1);
    gameState.addItem('seed-lavender', 2);

    expect(placePiece('garden', 'floating-bed', 38, 36)).toBeNull();
    expect(placePiece('garden', 'planter', 22, 37)).toBeNull();
    const floatBedId = planterBedId('garden', 38, 36);
    const landBedId = planterBedId('garden', 22, 37);
    expect(plantSeed(floatBedId)).toBe(true);
    expect(plantSeed(landBedId)).toBe(true);
    const floatPlantedBefore = getBedState(floatBedId)!.plantedAt;

    let outcome: NightOutcome | undefined;
    const onResolved = (p: { outcome: NightOutcome }) => {
      outcome = p.outcome;
    };
    bus.on('night-resolved', onResolved);
    expect(triggerNightEvent('snails')).toBe(true);
    vi.advanceTimersByTime(3100);
    bus.off('night-resolved', onResolved);

    expect(outcome?.dialogueId).toBe('night-snails-hit');
    expect(outcome?.affectedBedIds).toEqual([landBedId]); // floating bed spared
    expect(getBedState(floatBedId)!.plantedAt).toBe(floatPlantedBefore);
  });
});
