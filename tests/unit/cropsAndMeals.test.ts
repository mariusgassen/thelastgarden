import { beforeEach, describe, expect, it } from 'vitest';
import { content } from '../../src/content';
import { BLIGHT_FLAG, getWards } from '../../src/systems/blight';
import { getPieceAt, placePiece, planterBedId, whyNotPlace } from '../../src/systems/building';
import { craft } from '../../src/systems/crafting';
import { eatMeal, getActiveMeal, getMealSpeedFactor, isBlightproof, SWIFT_SPEED_FACTOR } from '../../src/systems/meals';
import { debugRewindGrowth, getLightSources, harvestBed, plantSeed } from '../../src/systems/plants';
import { gameState } from '../../src/systems/state';
import { getInventoryGroups } from '../../src/systems/inventory';
import { getResourceNodes } from '../../src/systems/resources';

const give = (items: Record<string, number>): void => {
  for (const [id, n] of Object.entries(items)) gameState.addItem(id, n);
};
const SPOT = { x: 22, y: 37 };

describe('new plants', () => {
  beforeEach(() => {
    localStorage.clear();
    gameState.reset();
  });

  it('gives every new species a seed to find in the world', () => {
    const found = new Set(getResourceNodes().map((n) => n.itemId));
    for (const id of ['glowcap', 'thornroot', 'reed', 'willow', 'honeyberry', 'gold-turnip']) {
      expect(found.has(content.plants.get(id).seedItemId as string), id).toBe(true);
    }
  });

  it('wards wider around a mature thornroot than around lavender, and glowcap lights the night', () => {
    give({ 'mat-wood': 4, 'mat-stone': 2, 'seed-thornroot': 1, 'seed-glowcap': 1 });
    placePiece('garden', 'planter', SPOT.x, SPOT.y);
    placePiece('garden', 'planter', SPOT.x + 3, SPOT.y);
    expect(plantSeed(planterBedId('garden', SPOT.x, SPOT.y), 'thornroot')).toBe(true);
    expect(plantSeed(planterBedId('garden', SPOT.x + 3, SPOT.y), 'glowcap')).toBe(true);
    debugRewindGrowth(10 * 60_000);

    const radii = getWards('garden').map((w) => w.radius);
    expect(radii).toContain(4.5 + 0.25);
    expect(radii).toContain(5 + 0.25);
    expect(getLightSources().some((l) => l.lightRadius === 140)).toBe(true);
  });

  it('builds with reed, willow and thorn canes from a harvest', () => {
    for (const [id, produce] of [
      ['thorn-hedge', 'produce-thorn-cane'],
      ['wattle', 'produce-willow-switch'],
      ['reed-bridge', 'produce-reed-bundle'],
    ]) {
      expect(content.buildables.get(id).cost.every((c) => c.itemId === produce), id).toBe(true);
    }
    give({ 'produce-thorn-cane': 2 });
    expect(whyNotPlace('garden', 'thorn-hedge', SPOT.x, SPOT.y)).toBeNull();
    placePiece('garden', 'thorn-hedge', SPOT.x, SPOT.y);
    expect(getPieceAt('garden', SPOT.x, SPOT.y)?.id).toBe('thorn-hedge');
    expect(gameState.getItemCount('produce-thorn-cane')).toBe(0);
  });

  it('teaches cooking with the first harvest of a food crop', () => {
    give({ 'mat-wood': 2, 'mat-stone': 1, 'seed-honeyberry': 1, 'resource-sunlight': 1 });
    placePiece('garden', 'planter', SPOT.x, SPOT.y);
    const bedId = planterBedId('garden', SPOT.x, SPOT.y);
    plantSeed(bedId);
    debugRewindGrowth(10 * 60_000);
    expect(craft('berry-mash')).toBe(false);
    expect(harvestBed(bedId)?.itemId).toBe('produce-honeyberry');
    expect(gameState.hasFlag('harvested:produce-honeyberry')).toBe(true);
    gameState.addItem('produce-honeyberry', 1);
    expect(craft('berry-mash')).toBe(true);
    expect(gameState.getItemCount('meal-berry-mash')).toBe(1);
    expect(getInventoryGroups().some((g) => g.title === 'Speisen')).toBe(true);
  });
});

describe('meals', () => {
  beforeEach(() => {
    localStorage.clear();
    gameState.reset();
  });

  it('speeds the player up for a while and wears off', () => {
    expect(eatMeal('meal-berry-mash')).toBe(false);
    give({ 'meal-berry-mash': 1 });
    expect(eatMeal('meal-berry-mash')).toBe(true);
    expect(gameState.getItemCount('meal-berry-mash')).toBe(0);
    expect(getMealSpeedFactor()).toBe(SWIFT_SPEED_FACTOR);
    expect(isBlightproof()).toBe(false);
    const meal = getActiveMeal()!;
    meal.until = Date.now() - 1;
    gameState.setExt('meal', meal);
    expect(getMealSpeedFactor()).toBe(1);
  });

  it('lets a stew carry the player through the blight, and a later meal replaces it', () => {
    gameState.setFlag(BLIGHT_FLAG);
    give({ 'meal-turnip-stew': 1, 'meal-berry-mash': 1 });
    eatMeal('meal-turnip-stew');
    expect(isBlightproof()).toBe(true);
    eatMeal('meal-berry-mash');
    expect(isBlightproof()).toBe(false);
  });
});
