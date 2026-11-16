import { beforeEach, describe, expect, it } from 'vitest';
import { content } from '../../src/content';
import { BLIGHT_FLAG, blightNightfall, getBlightTiles, pushBackBlight } from '../../src/systems/blight';
import { placePiece, planterBedId, setBuildMode } from '../../src/systems/building';
import { craft, getUnlockedRecipes } from '../../src/systems/crafting';
import {
  debugRewindGrowth,
  isBedMature,
  isBedPlanted,
  isProduceReady,
  plantSeed,
  STAGE_DURATION_MS,
} from '../../src/systems/plants';
import { parseSave, SAVE_KEY } from '../../src/systems/save';
import { gameState } from '../../src/systems/state';
import {
  AUTO_TOOL,
  cycleSeed,
  equipTool,
  getCarriedLight,
  getEquippedTool,
  getOwnedTools,
  getSowSeed,
  getToolMode,
  isAutoTool,
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
const plantedIn = (dx: number): string[] => (isBedPlanted(planter(dx)) ? [planter(dx)] : []);
const feet = (dx = 0): { x: number; y: number } => ({ x: (SPOT.x + dx + 0.5) * TILE_SIZE, y: (SPOT.y + 1) * TILE_SIZE });

/** Builds 1x1 soil planters in a row on the spot, from dx = 0. */
function buildPlanters(n: number): void {
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

  it('has an all-round hand that harvests what is ripe and sows the rest', () => {
    buildPlanters(2);
    give({ 'seed-lavender': 2, 'tool-sickle': 1, 'tool-satchel': 1 });
    expect(equipTool(AUTO_TOOL)).toBe(true);
    setToolMode(true);
    expect(isAutoTool() && isToolActing()).toBe(true);
    const sown = useTool('garden', feet(0.5));
    expect(sown.ok && sown.used).toBe('satchel');
    expect(plantedIn(0).length + plantedIn(1).length).toBe(2); // two seeds, the two nearest beds
    expect(useTool('garden', feet(0.5)).ok).toBe(false); // nothing ripe, no free bed
    debugRewindGrowth(10 * STAGE_DURATION_MS);
    const reaped = useTool('garden', feet(0.5));
    expect(reaped.ok && reaped.used).toBe('sickle');
  });

  it('opens the tool mode with the all-round hand when nothing is in hand yet', () => {
    give({ 'tool-sickle': 1 });
    setToolMode(true);
    expect(isAutoTool()).toBe(true);
  });

  it('lets the shovel dig plants directly into inventory, including ripe produce and targeted mixed-bed slots', () => {
    buildPlanters(1);
    give({ 'seed-lavender': 1, 'tool-shovel': 1 });
    equipTool('tool-shovel');
    plantSeed(planter(0));
    debugRewindGrowth(STAGE_DURATION_MS * 3); // mature + ripe produce
    expect(isProduceReady(planter(0))).toBe(true);

    const dug = useTool('garden', feet(0));
    expect(dug.ok).toBe(true);
    expect(dug.used).toBe('shovel');
    expect(isBedPlanted(planter(0))).toBe(false);
    expect(gameState.hasFlag('used-tool:shovel')).toBe(true);
    expect(gameState.getItemCount('seed-lavender')).toBe(1);
    expect(gameState.getItemCount('produce-scent-bundle')).toBe(1);

    // Mixed 4x2 bed: plant lavender in slot 0 and glow-lily in slot 3, then dig only the targeted slot 3
    give({ 'seed-lavender': 1, 'seed-glow-lily': 1 });
    expect(plantSeed('bed-extra', 'lavender')).toBe(true);
    expect(plantSeed('bed-extra#3', 'glow-lily')).toBe(true);
    const slot0 = allPlantingBeds().find((b) => b.id === 'bed-extra')!;
    const slot3 = allPlantingBeds().find((b) => b.id === 'bed-extra#3')!;
    const playerAt = { x: (slot0.rect.x + 1.5) * TILE_SIZE, y: (slot0.rect.y + 1) * TILE_SIZE };
    const tapSlot3 = { x: (slot3.rect.x + slot3.rect.w / 2) * TILE_SIZE, y: (slot3.rect.y + slot3.rect.h) * TILE_SIZE };

    const dugMixed = useTool('garden', tapSlot3, playerAt);
    expect(dugMixed.ok).toBe(true);
    expect(isBedPlanted('bed-extra')).toBe(true);
    expect(isBedPlanted('bed-extra#3')).toBe(false);
    expect(gameState.getItemCount('seed-glow-lily')).toBe(1);
    expect(gameState.getItemCount('seed-lavender')).toBe(1); // from earlier dig; slot 0 stays planted
  });

  it('migrates legacy carried plants from older saves back into inventory', () => {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        version: 1,
        inventory: { items: { 'tool-shovel': 1 } },
        ext: { plants: { beds: {} }, tools: { equipped: 'tool-shovel', carried: { plantId: 'lavender', plantedAt: 1000 } } },
      }),
    );
    gameState.init();
    expect(gameState.getItemCount('seed-lavender')).toBe(1);
    expect((gameState.data.ext.tools as { carried?: unknown }).carried).toBeUndefined();
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
    const planted = (): number => [0, 1, 2].reduce((n, dx) => n + plantedIn(dx).length, 0);
    expect(planted()).toBe(2);
    expect(getSowSeed()).toBe('glow-lily'); // the picked kind ran out
    expect(useTool('garden', feet(1)).ok).toBe(true);
    expect(planted()).toBe(3); // three 1x1 planters
    expect(useTool('garden', feet(1)).text).toMatch(/kein freies Beet/);
  });

  it('lets the satchel sow any seed into formerly crop-locked beds too', () => {
    give({ 'seed-lavender': 1, 'tool-satchel': 1 });
    equipTool('tool-satchel');
    const bramble = allPlantingBeds().find((b) => b.id === 'bed-bramble')!;
    const at = { x: (bramble.rect.x + bramble.rect.w / 2) * TILE_SIZE, y: (bramble.rect.y + bramble.rect.h) * TILE_SIZE };
    expect(useTool('garden', at).ok).toBe(true);
    expect(isBedPlanted('bed-bramble')).toBe(true);
    expect(gameState.getItemCount('seed-lavender')).toBe(0);
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
