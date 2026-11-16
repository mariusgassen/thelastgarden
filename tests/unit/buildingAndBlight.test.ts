import { beforeEach, describe, expect, it } from 'vitest';
import { content } from '../../src/content';
import {
  BLIGHT_FLAG,
  blightNightfall,
  getBlightTiles,
  getHearts,
  GROWTH_PER_NIGHT,
  isBlighted,
  isHeartSealed,
  refreshBlight,
} from '../../src/systems/blight';
import {
  baseTileAt,
  getPieceAt,
  getPieces,
  isBuildUnlocked,
  isTileWalkable,
  placePiece,
  planterBedId,
  removePiece,
  whyNotPlace,
} from '../../src/systems/building';
import { debugRewindGrowth, isBedMature, isBedPlanted, plantSeed } from '../../src/systems/plants';
import { collectNode, isNodeBlighted, getResourceNodes } from '../../src/systems/resources';
import { parseSave } from '../../src/systems/save';
import { gameState } from '../../src/systems/state';
import { allBlightHearts, allPlantingBeds, MAPS } from '../../src/world';
import { TILE_SIZE, TILES } from '../../src/world/tiles';

const give = (items: Record<string, number>): void => {
  for (const [id, n] of Object.entries(items)) gameState.addItem(id, n);
};

/** Open grass in the main garden, away from beds, props and the spawn. */
const SPOT = { x: 22, y: 37 };
const PLAZA_HEART = { x: 7, y: 62 };

describe('free building', () => {
  beforeEach(() => {
    localStorage.clear();
    gameState.reset();
  });

  it('unlocks with the first gathered material and yields two wood per pile', () => {
    expect(isBuildUnlocked()).toBe(false);
    expect(collectNode('wood-garden-1')).toBe(true);
    expect(gameState.getItemCount('mat-wood')).toBe(2);
    expect(isBuildUnlocked()).toBe(true);
    expect(collectNode('wood-garden-1')).toBe(false); // regrows later
  });

  it('places a piece for its cost and hands the materials back on removal', () => {
    give({ 'mat-wood': 1 });
    expect(placePiece('garden', 'fence', SPOT.x, SPOT.y)).toBeNull();
    expect(gameState.getItemCount('mat-wood')).toBe(0);
    expect(getPieceAt('garden', SPOT.x, SPOT.y)?.id).toBe('fence');
    expect(isTileWalkable('garden', SPOT.x, SPOT.y)).toBe(false);
    expect(gameState.hasFlag('built-once')).toBe(true);

    expect(removePiece('garden', SPOT.x, SPOT.y)).toBeNull();
    expect(gameState.getItemCount('mat-wood')).toBe(1);
    expect(getPieces('garden')).toEqual([]);
    expect(isTileWalkable('garden', SPOT.x, SPOT.y)).toBe(true);
  });

  it('refuses tiles that are taken, solid, reserved, out of reach or unaffordable', () => {
    expect(whyNotPlace('garden', 'fence', SPOT.x, SPOT.y)).toMatch(/fehlt noch: 1 Holz/);
    give({ 'mat-wood': 10 });
    expect(whyNotPlace('garden', 'fence', SPOT.x, SPOT.y)).toBeNull();
    expect(whyNotPlace('garden', 'fence', 0, 0)).toMatch(/kein freier Boden/);
    expect(whyNotPlace('garden', 'fence', 17, 29)).toMatch(/frei bleiben/); // a planting bed
    expect(whyNotPlace('garden', 'fence', 25, 31)).toMatch(/frei bleiben/); // the arrival point
    expect(whyNotPlace('garden', 'fence', 7, 32)).toMatch(/frei bleiben/); // in front of the hut door
    expect(whyNotPlace('garden', 'fence', 35, 15)).toMatch(/versperrt/); // inside the bramble
    expect(whyNotPlace('workshop', 'fence', 4, 4)).toMatch(/Drinnen/);
    expect(whyNotPlace('garden', 'fence', SPOT.x, SPOT.y, { x: 2 * TILE_SIZE, y: 30 * TILE_SIZE })).toMatch(/zu weit/);
    const feet = { x: (SPOT.x + 0.5) * TILE_SIZE, y: (SPOT.y + 0.5) * TILE_SIZE };
    expect(whyNotPlace('garden', 'fence', SPOT.x, SPOT.y, feet)).toMatch(/selbst im Weg/);
    expect(whyNotPlace('garden', 'fence', SPOT.x + 1, SPOT.y, feet)).toBeNull();

    placePiece('garden', 'fence', SPOT.x, SPOT.y);
    expect(whyNotPlace('garden', 'hedge', SPOT.x, SPOT.y)).toMatch(/steht schon/);
  });

  it('builds bridges out from the bank, one tile at a time', () => {
    give({ 'mat-wood': 10 });
    expect(baseTileAt('garden', 38, 36)).toBe('water');
    expect(whyNotPlace('garden', 'bridge', SPOT.x, SPOT.y)).toMatch(/aufs Wasser/);
    expect(whyNotPlace('garden', 'bridge', 42, 36)).toMatch(/Anschluss/);
    expect(isTileWalkable('garden', 38, 36)).toBe(false);
    expect(placePiece('garden', 'bridge', 38, 36)).toBeNull();
    expect(isTileWalkable('garden', 38, 36)).toBe(true);
    expect(placePiece('garden', 'bridge', 39, 36)).toBeNull();
    // Nobody pulls the plank out from under their own feet.
    expect(removePiece('garden', 39, 36, { x: 39.5 * TILE_SIZE, y: 36.5 * TILE_SIZE })).toMatch(/stehst gerade darauf/);
  });

  it('turns a planter into a planting bed and returns the seed when it is taken down', () => {
    give({ 'mat-wood': 2, 'mat-stone': 1, 'seed-lavender': 1 });
    placePiece('garden', 'planter', SPOT.x, SPOT.y);
    const bedId = planterBedId('garden', SPOT.x, SPOT.y);
    expect(allPlantingBeds().some((b) => b.id === bedId && b.mapId === 'garden')).toBe(true);
    expect(plantSeed(bedId)).toBe(true);
    expect(gameState.getItemCount('seed-lavender')).toBe(0);

    expect(removePiece('garden', SPOT.x, SPOT.y)).toBeNull();
    expect(isBedPlanted(bedId)).toBe(false);
    expect(allPlantingBeds().some((b) => b.id === bedId)).toBe(false);
    expect(gameState.getItemCount('seed-lavender')).toBe(1);
    expect(gameState.getItemCount('mat-wood')).toBe(2);
  });

  it('holds four plants per planter and gives every seed back when it is taken down', () => {
    give({ 'mat-wood': 2, 'mat-stone': 1, 'seed-lavender': 4 });
    placePiece('garden', 'planter', SPOT.x, SPOT.y);
    const base = planterBedId('garden', SPOT.x, SPOT.y);
    const ids = [base, `${base}#1`, `${base}#2`, `${base}#3`];
    for (const id of ids) {
      expect(allPlantingBeds().some((b) => b.id === id)).toBe(true);
      expect(plantSeed(id)).toBe(true);
    }
    expect(ids.every((id) => isBedPlanted(id))).toBe(true);
    expect(removePiece('garden', SPOT.x, SPOT.y)).toBeNull();
    expect(ids.some((id) => isBedPlanted(id) || allPlantingBeds().some((b) => b.id === id))).toBe(false);
    expect(gameState.getItemCount('seed-lavender')).toBe(4);
  });

  it('has an item for every cost and puts every pile on walkable ground', () => {
    for (const piece of content.buildables.all()) {
      for (const c of piece.cost) expect(content.items.has(c.itemId), `${piece.id}: ${c.itemId}`).toBe(true);
    }
    for (const node of getResourceNodes().filter((n) => n.texture)) {
      const tile = baseTileAt(node.mapId, Math.floor(node.at.x), Math.floor(node.at.y));
      expect(tile !== undefined && !TILES[tile].solid, `${node.id} on ${tile}`).toBe(true);
      expect(MAPS[node.mapId].indoor ?? false).toBe(false);
    }
  });

  it('loads a save from before building and the blight existed', () => {
    const save = parseSave(
      JSON.stringify({
        version: 1,
        player: { mapId: 'garden', x: 800, y: 1000, facing: 'left' },
        world: { unblockedPaths: [], visitedZones: [], flags: { 'episode-1-complete': true } },
        inventory: { items: { 'seed-lavender': 2 } },
        ext: { plants: { beds: {} } },
      }),
    );
    expect(save).not.toBeNull();
    gameState.data = save!;
    expect(getPieces('garden')).toEqual([]);
    expect(getBlightTiles('garden')).toEqual([]);
    expect(blightNightfall()).toBeGreaterThan(0);
  });
});

describe('the blight', () => {
  beforeEach(() => {
    localStorage.clear();
    gameState.reset();
  });

  const wake = (): void => gameState.setFlag(BLIGHT_FLAG);
  const nights = (n: number): void => {
    for (let i = 0; i < n; i++) blightNightfall();
  };

  it('puts every heart on open ground, outside beds and away from arrival points', () => {
    for (const heart of allBlightHearts()) {
      const map = MAPS[heart.mapId];
      expect(map.indoor ?? false).toBe(false);
      expect(isTileWalkable(heart.mapId, heart.at.x, heart.at.y), heart.id).toBe(true);
      for (const spawn of Object.values(map.spawns)) {
        expect(Math.hypot(spawn.x - heart.at.x, spawn.y - heart.at.y), `${heart.id} vs spawn`).toBeGreaterThan(heart.reach + 1);
      }
      for (const bed of map.plantingBeds ?? []) {
        const d = Math.hypot(bed.rect.x + bed.rect.w / 2 - (heart.at.x + 0.5), bed.rect.y + bed.rect.h / 2 - (heart.at.y + 0.5));
        expect(d, `${heart.id} vs ${bed.id}`).toBeGreaterThan(4.5); // a mature bed must not seal it by itself
      }
    }
  });

  it('sleeps until Episode 1 is done', () => {
    expect(blightNightfall()).toBe(0);
    expect(getBlightTiles('garden')).toEqual([]);
  });

  it('grows a few tiles per heart each night, starting at the heart and never past its reach', () => {
    wake();
    const hearts = getHearts('garden');
    expect(blightNightfall()).toBe(hearts.length * GROWTH_PER_NIGHT);
    expect(isBlighted('garden', PLAZA_HEART.x, PLAZA_HEART.y)).toBe(true);
    expect(getBlightTiles('tramline').length).toBe(GROWTH_PER_NIGHT);

    nights(60);
    const size = getBlightTiles('garden').length;
    nights(3);
    expect(getBlightTiles('garden').length).toBe(size); // bounded
    for (const t of getBlightTiles('garden')) {
      const tile = baseTileAt('garden', t.x, t.y)!;
      expect(TILES[tile].solid).toBe(false);
      expect(hearts.some((h) => Math.abs(h.at.x - t.x) + Math.abs(h.at.y - t.y) <= h.reach)).toBe(true);
    }
  });

  it('never grows through a fence, and nothing can be built on it', () => {
    wake();
    give({ 'mat-wood': 40 });
    // Ring the plaza heart in before the first night.
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        if (dx !== 0 || dy !== 0) expect(placePiece('garden', 'fence', PLAZA_HEART.x + dx, PLAZA_HEART.y + dy)).toBeNull();
    nights(10);
    const nearPlaza = getBlightTiles('garden').filter((t) => Math.abs(t.x - PLAZA_HEART.x) + Math.abs(t.y - PLAZA_HEART.y) <= 6);
    expect(nearPlaza).toEqual([PLAZA_HEART]);
    expect(whyNotPlace('garden', 'fence', PLAZA_HEART.x, PLAZA_HEART.y)).toMatch(/frei bleiben/);

    const pond = getBlightTiles('garden').find((t) => t.x > 40 && t.y !== 43)!;
    expect(whyNotPlace('garden', 'fence', pond.x, pond.y)).toMatch(/Welke/);
  });

  it('dries up at once when a lantern seals its heart, and comes back when the light is gone', () => {
    wake();
    give({ 'mat-scrap': 1, 'produce-light-pollen': 1 });
    const heart = getHearts('garden').find((h) => h.id === 'heart-plaza')!;
    expect(isHeartSealed(heart)).toBe(false);
    // Too close to the heart is blighted after a night, so the lantern goes up beforehand.
    expect(placePiece('garden', 'lantern', PLAZA_HEART.x + 2, PLAZA_HEART.y)).toBeNull();
    expect(isHeartSealed(heart)).toBe(true);
    expect(gameState.hasFlag('blight-heart-sealed')).toBe(true);
    nights(5);
    expect(isBlighted('garden', PLAZA_HEART.x, PLAZA_HEART.y)).toBe(false);

    removePiece('garden', PLAZA_HEART.x + 2, PLAZA_HEART.y);
    nights(2);
    expect(isBlighted('garden', PLAZA_HEART.x, PLAZA_HEART.y)).toBe(true);
    const grown = getBlightTiles('garden').length;

    // Back at the edge: the light clears its circle and what it cuts off.
    const edge = { x: PLAZA_HEART.x + 3, y: PLAZA_HEART.y };
    expect(isBlighted('garden', edge.x, edge.y)).toBe(false);
    expect(placePiece('garden', 'lantern', edge.x, edge.y)).toBeNull();
    expect(getBlightTiles('garden').length).toBeLessThan(grown);
    expect(isBlighted('garden', edge.x - 2, edge.y)).toBe(false);
    expect(gameState.hasFlag('blight-pushed-back')).toBe(true);
  });

  it('gives way to a mature plant in a planter, not to a seedling', () => {
    wake();
    give({ 'mat-wood': 2, 'mat-stone': 1, 'seed-lavender': 1 });
    const at = { x: PLAZA_HEART.x + 3, y: PLAZA_HEART.y };
    placePiece('garden', 'planter', at.x, at.y);
    plantSeed(planterBedId('garden', at.x, at.y));
    nights(3);
    expect(isBlighted('garden', PLAZA_HEART.x, PLAZA_HEART.y)).toBe(true);

    debugRewindGrowth(10 * 60_000);
    expect(isBedMature(planterBedId('garden', at.x, at.y))).toBe(true);
    expect(refreshBlight('garden')).toBeGreaterThan(0);
    expect(isBlighted('garden', PLAZA_HEART.x, PLAZA_HEART.y)).toBe(false);
  });

  it('swallows renewable pickups but never one-time finds', () => {
    wake();
    const sun = getResourceNodes('garden').find((n) => n.id === 'sun-3')!;
    expect(isNodeBlighted(sun)).toBe(false);
    nights(20);
    expect(isBlighted('garden', Math.floor(sun.at.x), Math.floor(sun.at.y))).toBe(true);
    expect(isNodeBlighted(sun)).toBe(true);
    expect(collectNode('sun-3')).toBe(false);
    for (const node of getResourceNodes().filter((n) => n.respawnMs === undefined)) expect(isNodeBlighted(node)).toBe(false);
  });
});
