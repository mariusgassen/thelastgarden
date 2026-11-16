import { beforeEach, describe, expect, it } from 'vitest';
import { content } from '../../src/content';
import { BLIGHT_FLAG, blightNightfall, getBlightTiles, pushBackBlight } from '../../src/systems/blight';
import { placePiece, planterBedId, setBuildMode } from '../../src/systems/building';
import { craft, getUnlockedRecipes } from '../../src/systems/crafting';
import {
  debugRewindGrowth,
  getBedState,
  isBedMature,
  isBedPlanted,
  isProduceReady,
  plantSeed,
  STAGE_DURATION_MS,
} from '../../src/systems/plants';
import { parseSave } from '../../src/systems/save';
import { gameState } from '../../src/systems/state';
import {
  cycleSeed,
  equipTool,
  getCarriedLight,
  getCarriedPlant,
  getEquippedTool,
  getOwnedTools,
  getSowSeed,
  getToolMode,
  isToolActing,
  setToolMode,
  useTool,
} from '../../src/systems/tools';
import { allPlantingBeds } from '../../src/world';
import { ITEM_ICON_IDS } from '../../src/world/textures';
import { TILE_SIZE } from '../../src/world/tiles';

const give = (items: Record<string, number>): void => {
  for (const [id, n] of Object.entries(items)) gameState.addItem(id, n);
};

/** Open grass in the main garden, away from beds, props and the spawn (the building tests use it too). */
const SPOT = { x: 22, y: 37 };
const planter = (dx: number): string => planterBedId('garden', SPOT.x + dx, SPOT.y);
const feet = (dx = 0): { x: number; y: number } => ({ x: (SPOT.x + dx + 0.5) * TILE_SIZE, y: (SPOT.y + 1) * TILE_SIZE });

/** Builds planters in a row on the spot, from dx = 0. */
function buildPlanters(n: number): void {
  give({ 'mat-wood': 2 * n, 'mat-stone': n });
  for (let i = 0; i < n; i++) expect(placePiece('garden', 'planter', SPOT.x + i, SPOT.y)).toBeNull();
}

describe('tools', () => {
  beforeEach(() => {
    localStorage.clear();
    gameState.reset();
    setToolMode(false);
    setBuildMode(false);
  });

  it('are made at the workbench once playing has unlocked them, and only once', () => {
    expect(getUnlockedRecipes()).toEqual([]);
    gameState.setFlag('harvested-once');
    gameState.setFlag('gathered-material');
    gameState.setFlag('built:lantern');
    expect(getUnlockedRecipes().map((r) => r.id)).toEqual(['tool-sickle', 'tool-shovel', 'tool-satchel', 'tool-pole-lantern']);

    give({ 'mat-wood': 2, 'mat-scrap': 1 });
    expect(craft('tool-sickle')).toBe(true);
    expect(gameState.getItemCount('tool-sickle')).toBe(1);
    expect(getEquippedTool()?.id).toBe('tool-sickle'); // the first one goes into the hand
    give({ 'mat-wood': 2, 'mat-scrap': 1 });
    expect(craft('tool-sickle')).toBe(false); // nothing left to make
    expect(getUnlockedRecipes().map((r) => r.id)).not.toContain('tool-sickle');
  });

  it('has an item, a recipe and an icon for every tool', () => {
    for (const tool of content.tools.all()) {
      expect(content.items.get(tool.id).category).toBe('tool');
      expect(content.items.get(tool.id).stackable).toBe(false);
      expect(content.recipes.get(tool.id).result).toEqual([{ itemId: tool.id, count: 1 }]);
      expect(ITEM_ICON_IDS).toContain(tool.id);
    }
  });

  it('opens a tool mode only with a tool, and not together with build mode', () => {
    setToolMode(true);
    expect(getToolMode().open).toBe(false);
    give({ 'tool-sickle': 1, 'mat-wood': 1 });
    equipTool('tool-sickle');
    setToolMode(true);
    expect(getToolMode().open).toBe(true);
    expect(isToolActing()).toBe(true);
    gameState.setFlag('gathered-material');
    setBuildMode(true);
    expect(getToolMode().open).toBe(false);
    expect(isToolActing()).toBe(false);
  });

  it('puts a lantern on a pole in the hand without taking over E and taps', () => {
    give({ 'tool-sickle': 1, 'tool-pole-lantern': 1 });
    equipTool('tool-sickle');
    setToolMode(true);
    equipTool('tool-pole-lantern');
    expect(getCarriedLight()).toEqual({ lightRadius: 130, pushBackTiles: 2.4 });
    expect(getToolMode().open).toBe(false);
    expect(isToolActing()).toBe(false);
    equipTool('tool-sickle');
    expect(getCarriedLight()).toBeNull();
    expect(equipTool('tool-shovel')).toBe(false); // not made yet
  });

  it('lets the sickle harvest every ripe bed around the player at once', () => {
    buildPlanters(2);
    give({ 'seed-lavender': 2, 'tool-sickle': 1 });
    equipTool('tool-sickle');
    expect(plantSeed(planter(0))).toBe(true);
    expect(plantSeed(planter(1))).toBe(true);
    expect(useTool('garden', feet(0)).text).toMatch(/noch nichts reif/);

    debugRewindGrowth(10 * STAGE_DURATION_MS);
    expect(isBedMature(planter(0)) && isBedMature(planter(1))).toBe(true);
    const far = useTool('garden', { x: 3 * TILE_SIZE, y: 3 * TILE_SIZE });
    expect(far.ok).toBe(false);
    const result = useTool('garden', feet(0.5));
    expect(result.ok).toBe(true);
    expect(result.spots).toHaveLength(2);
    expect(gameState.getItemCount('produce-scent-bundle')).toBe(2);
    expect(gameState.getItemCount('seed-lavender')).toBe(2); // each bed's first harvest also drops a seed
    expect(isProduceReady(planter(0))).toBe(false);
    expect(useTool('garden', feet(0.5)).ok).toBe(false);
    expect(gameState.hasFlag('used-tool:sickle')).toBe(true);
  });

  it('lets the shovel move a plant without losing its growth', () => {
    buildPlanters(2);
    give({ 'seed-lavender': 1, 'tool-shovel': 1 });
    equipTool('tool-shovel');
    plantSeed(planter(0));
    debugRewindGrowth(STAGE_DURATION_MS); // lavender: 2 stages, one done
    const before = getBedState(planter(0))!;
    const grown = Date.now() - before.plantedAt;

    const dug = useTool('garden', feet(0));
    expect(dug.ok).toBe(true);
    expect(isBedPlanted(planter(0))).toBe(false);
    expect(getCarriedPlant()?.plantId).toBe('lavender');
    expect(gameState.hasFlag('moved-plant')).toBe(true);
    expect(gameState.getItemCount('seed-lavender')).toBe(0); // carried, not turned back into a seed

    // The plant is in the shovel: it only goes into a free bed.
    const placed = useTool('garden', feet(1));
    expect(placed.ok).toBe(true);
    expect(isBedPlanted(planter(1))).toBe(true);
    expect(getCarriedPlant()).toBeUndefined();
    const after = getBedState(planter(1))!;
    expect(Date.now() - after.plantedAt).toBeGreaterThanOrEqual(grown);
    debugRewindGrowth(STAGE_DURATION_MS);
    expect(isBedMature(planter(1))).toBe(true);
  });

  it('keeps a carried plant out of beds that only take another species', () => {
    buildPlanters(1);
    give({ 'seed-lavender': 1, 'tool-shovel': 1 });
    equipTool('tool-shovel');
    plantSeed(planter(0));
    expect(useTool('garden', feet(0)).ok).toBe(true);
    // Stand at the bramble bed, which takes only brambles.
    const bramble = allPlantingBeds().find((b) => b.id === 'bed-bramble')!;
    const at = { x: (bramble.rect.x + bramble.rect.w / 2) * TILE_SIZE, y: (bramble.rect.y + bramble.rect.h) * TILE_SIZE };
    const refused = useTool('garden', at);
    expect(refused.ok).toBe(false);
    expect(refused.text).toMatch(/nur eine andere Sorte/);
    expect(getCarriedPlant()?.plantId).toBe('lavender');
    // Nothing is lost: the plant also survives a save.
    const loaded = parseSave(JSON.stringify(gameState.data))!;
    expect((loaded.ext.tools as { carried?: { plantId: string } }).carried?.plantId).toBe('lavender');
  });

  it('lets the satchel sow the chosen seed into every free bed in reach', () => {
    buildPlanters(3);
    give({ 'seed-lavender': 2, 'seed-glow-lily': 5, 'tool-satchel': 1 });
    equipTool('tool-satchel');
    expect(getSowSeed()).toBe('glow-lily'); // the first kind in the pocket
    expect(cycleSeed()).toBe('lavender');

    const result = useTool('garden', feet(1));
    expect(result.ok).toBe(true);
    expect(result.spots).toHaveLength(2); // only two seeds
    expect(gameState.getItemCount('seed-lavender')).toBe(0);
    expect([0, 1, 2].filter((i) => isBedPlanted(planter(i)))).toHaveLength(2);
    expect(getSowSeed()).toBe('glow-lily'); // the picked kind ran out
    expect(useTool('garden', feet(1)).ok).toBe(true);
    expect([0, 1, 2].every((i) => isBedPlanted(planter(i)))).toBe(true);
    expect(useTool('garden', feet(1)).text).toMatch(/kein freies Beet/);
  });

  it('only sows what a bed accepts', () => {
    give({ 'seed-lavender': 1, 'tool-satchel': 1 });
    equipTool('tool-satchel');
    const bramble = allPlantingBeds().find((b) => b.id === 'bed-bramble')!;
    const at = { x: (bramble.rect.x + bramble.rect.w / 2) * TILE_SIZE, y: (bramble.rect.y + bramble.rect.h) * TILE_SIZE };
    expect(useTool('garden', at).ok).toBe(false);
    expect(gameState.getItemCount('seed-lavender')).toBe(1);
  });

  it('dries up the blight around a carried light, and only there', () => {
    gameState.setFlag(BLIGHT_FLAG);
    for (let i = 0; i < 4; i++) blightNightfall();
    const tiles = getBlightTiles('garden');
    expect(tiles.length).toBeGreaterThan(6);
    const centre = tiles[0];
    const px = (centre.x + 0.5) * TILE_SIZE;
    const py = (centre.y + 0.5) * TILE_SIZE;
    const dried = pushBackBlight('garden', px, py, 2.4);
    expect(dried).toBeGreaterThan(0);
    const left = getBlightTiles('garden');
    expect(left.length).toBe(tiles.length - dried);
    for (const t of left) expect(Math.hypot(t.x - centre.x, t.y - centre.y)).toBeGreaterThan(2.3);
    expect(gameState.hasFlag('blight-pushed-back')).toBe(true);
    expect(pushBackBlight('garden', px, py, 2.4)).toBe(0);
  });

  it('keeps old saves working: no tools, nothing equipped', () => {
    const save = parseSave(JSON.stringify({ version: 1, inventory: { items: { 'seed-lavender': 1 } }, ext: { plants: { beds: {} } } }))!;
    gameState.data = save;
    expect(getOwnedTools()).toEqual([]);
    expect(getEquippedTool()).toBeUndefined();
    expect(useTool('garden', feet()).ok).toBe(false);
  });
});
