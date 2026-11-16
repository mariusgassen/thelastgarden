import { describe, expect, it } from 'vitest';
import { content, Registry } from '../../src/content';
import {
  allJournalPages,
  allObstacles,
  allPlantingBeds,
  allResourceNodes,
  getMap,
  MAPS,
  START_MAP_ID,
} from '../../src/world';
import { buildTileGrid, seededRandom, toFrameGrid } from '../../src/world/grid';
import { TILES, TILESET_FRAME_COUNT } from '../../src/world/tiles';
import type { MapDef } from '../../src/world/types';

describe('content registries', () => {
  it('throws on duplicate ids and unknown lookups', () => {
    const reg = new Registry('test', [{ id: 'a' }]);
    expect(() => reg.add({ id: 'a' })).toThrow(/duplicate test id "a"/);
    expect(() => reg.get('missing')).toThrow(/unknown test id "missing"/);
    expect(reg.find('missing')).toBeUndefined();
    expect(reg.has('a')).toBe(true);
    expect(reg.all()).toEqual([{ id: 'a' }]);
  });

  it('links every plant seedItemId to a seed item', () => {
    for (const plant of content.plants.all()) {
      expect(plant.name.trim().length).toBeGreaterThan(0);
      expect(plant.growthStages).toBeGreaterThan(0);
      if (plant.seedItemId) {
        const item = content.items.get(plant.seedItemId);
        expect(item.category).toBe('seed');
      }
    }
  });

  it('validates all quest references, rewards, and markers', () => {
    const knownMarkerIds = new Set<string>();
    for (const map of Object.values(MAPS)) {
      for (const i of map.interactables) knownMarkerIds.add(i.id);
      for (const o of map.obstacles) knownMarkerIds.add(`obstacle:${o.id}`);
      for (const b of map.plantingBeds ?? []) knownMarkerIds.add(`bed:${b.id}`);
      for (const n of map.resourceNodes ?? []) knownMarkerIds.add(`resource:${n.id}`);
      for (const p of map.journalPages ?? []) knownMarkerIds.add(`journal:${p.id}`);
      for (const npc of map.npcs ?? []) knownMarkerIds.add(`npc:${npc.npcId}`);
    }

    const obstacleIds = new Set(allObstacles().map((o) => o.id));
    const zoneIds = new Set(Object.values(MAPS).flatMap((m) => m.zones.map((z) => z.id)));

    for (const quest of content.quests.all()) {
      expect(quest.title.trim().length).toBeGreaterThan(0);
      expect(quest.summary.trim().length).toBeGreaterThan(0);
      expect(quest.objectives.length).toBeGreaterThan(0);

      for (const reward of quest.rewardItems ?? []) {
        expect(content.items.has(reward.itemId)).toBe(true);
        expect(reward.count).toBeGreaterThan(0);
      }

      for (const obj of quest.objectives) {
        expect(obj.description.trim().length).toBeGreaterThan(0);
        if (obj.type === 'item') expect(content.items.has(obj.itemId)).toBe(true);
        if (obj.type === 'unblock') expect(obstacleIds.has(obj.obstacleId)).toBe(true);
        if (obj.type === 'visitZone') expect(zoneIds.has(obj.zoneId)).toBe(true);
        for (const marker of obj.markers ?? []) {
          expect(knownMarkerIds.has(marker)).toBe(true);
        }
      }
    }
  });

  it('validates dialogues, branching choices, and NPC dialogue rules', () => {
    for (const dlg of content.dialogues.all()) {
      expect(dlg.lines.length).toBeGreaterThan(0);
      for (const line of dlg.lines) {
        expect(line.text.trim().length).toBeGreaterThan(0);
        for (const choice of line.choices ?? []) {
          expect(choice.label.trim().length).toBeGreaterThan(0);
          if (choice.nextDialogueId) expect(content.dialogues.has(choice.nextDialogueId)).toBe(true);
          for (const gift of choice.giveItems ?? []) {
            expect(content.items.has(gift.itemId)).toBe(true);
            expect(gift.count).toBeGreaterThan(0);
          }
        }
      }
    }

    for (const npc of content.npcs.all()) {
      if (npc.dialogueId) expect(content.dialogues.has(npc.dialogueId)).toBe(true);
      for (const rule of npc.dialogues ?? []) {
        expect(content.dialogues.has(rule.dialogueId)).toBe(true);
        for (const gift of rule.giveItems ?? []) {
          expect(content.items.has(gift.itemId)).toBe(true);
          expect(gift.count).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('world maps and grid rasterizer', () => {
  it('resolves known maps and rejects unknown map ids', () => {
    expect(getMap(START_MAP_ID).id).toBe('garden');
    expect(() => getMap('non-existent-map')).toThrow(/unknown map/);
  });

  it('ensures all maps have valid spawns, bounds, doors, repairs, beds, nodes, NPCs, and journal pages', () => {
    for (const map of Object.values(MAPS)) {
      expect(map.spawns.default).toBeDefined();
      const grid = buildTileGrid(map);
      expect(grid).toHaveLength(map.height);
      expect(grid[0]).toHaveLength(map.width);

      // Every spawn must sit inside the map on a walkable (non-solid) tile.
      for (const [spawnName, pt] of Object.entries(map.spawns)) {
        const tx = Math.floor(pt.x);
        const ty = Math.floor(pt.y);
        expect(tx, `${map.id}.${spawnName}.x`).toBeGreaterThanOrEqual(0);
        expect(tx, `${map.id}.${spawnName}.x`).toBeLessThan(map.width);
        expect(ty, `${map.id}.${spawnName}.y`).toBeGreaterThanOrEqual(0);
        expect(ty, `${map.id}.${spawnName}.y`).toBeLessThan(map.height);
        expect(TILES[grid[ty][tx]].solid, `${map.id}.${spawnName} tile is solid`).toBe(false);
      }

      // Interactables must reference valid dialogues, items, repair costs, and door targets.
      for (const spec of map.interactables) {
        if (spec.type === 'dialogue') {
          expect(content.dialogues.has(spec.dialogueId)).toBe(true);
          for (const variant of spec.variants ?? []) {
            expect(content.dialogues.has(variant.dialogueId)).toBe(true);
            for (const gift of variant.giveItems ?? []) {
              expect(content.items.has(gift.itemId)).toBe(true);
              expect(gift.count).toBeGreaterThan(0);
            }
          }
        } else if (spec.type === 'door') {
          if (spec.lockedDialogueId) expect(content.dialogues.has(spec.lockedDialogueId)).toBe(true);
          if (spec.unlockedDialogueId) expect(content.dialogues.has(spec.unlockedDialogueId)).toBe(true);
          if (spec.keyItemId) expect(content.items.has(spec.keyItemId)).toBe(true);
          if (spec.target) {
            const targetMap = getMap(spec.target.mapId);
            expect(targetMap.spawns[spec.target.spawn]).toBeDefined();
          }
        } else if (spec.type === 'repair') {
          expect(content.dialogues.has(spec.missingDialogueId)).toBe(true);
          expect(content.dialogues.has(spec.repairedDialogueId)).toBe(true);
          expect(content.dialogues.has(spec.doneDialogueId)).toBe(true);
          for (const cost of spec.cost) {
            expect(content.items.has(cost.itemId)).toBe(true);
            expect(cost.count).toBeGreaterThan(0);
          }
          for (const gift of spec.giveItems ?? []) {
            expect(content.items.has(gift.itemId)).toBe(true);
            expect(gift.count).toBeGreaterThan(0);
          }
        }
      }

      for (const bed of map.plantingBeds ?? []) {
        if (bed.plantId) expect(content.plants.has(bed.plantId)).toBe(true);
        expect(bed.rect.x).toBeGreaterThanOrEqual(0);
        expect(bed.rect.y).toBeGreaterThanOrEqual(0);
        expect(bed.rect.x + bed.rect.w).toBeLessThanOrEqual(map.width);
        expect(bed.rect.y + bed.rect.h).toBeLessThanOrEqual(map.height);
      }

      for (const node of map.resourceNodes ?? []) {
        expect(content.items.has(node.itemId)).toBe(true);
        expect(node.at.x).toBeGreaterThanOrEqual(0);
        expect(node.at.x).toBeLessThan(map.width);
        expect(node.at.y).toBeGreaterThanOrEqual(0);
        expect(node.at.y).toBeLessThan(map.height);
      }

      for (const npc of map.npcs ?? []) {
        expect(content.npcs.has(npc.npcId)).toBe(true);
      }

      for (const page of map.journalPages ?? []) {
        expect(content.dialogues.has(page.dialogueId)).toBe(true);
        if (page.itemId) expect(content.items.has(page.itemId)).toBe(true);
      }
    }

    expect(allObstacles().length).toBeGreaterThanOrEqual(4);
    expect(allPlantingBeds().length).toBeGreaterThanOrEqual(7);
    expect(allResourceNodes().length).toBeGreaterThan(0);
    expect(allJournalPages().length).toBeGreaterThanOrEqual(5);
  });

  it('rasterizes rect, ellipse, and path ops deterministically and clips out-of-bounds', () => {
    const map: MapDef = {
      id: 'test-map',
      name: 'Test',
      width: 10,
      height: 8,
      baseTile: 'forest',
      backgroundColor: 0x000000,
      layout: [
        { op: 'rect', tile: 'grass', rect: { x: -1, y: 1, w: 4, h: 3 } },
        { op: 'ellipse', tile: 'water', cx: 6, cy: 4, rx: 1.5, ry: 1.5 },
        { op: 'path', tile: 'path', width: 2, points: [{ x: 1, y: 6 }, { x: 8, y: 6 }] },
      ],
      zones: [],
      obstacles: [],
      props: [],
      interactables: [],
      spawns: { default: { x: 2, y: 2 } },
    };

    const grid = buildTileGrid(map);
    expect(grid[0][0]).toBe('forest');
    expect(grid[1][0]).toBe('grass');
    expect(grid[1][2]).toBe('grass');
    expect(grid[4][6]).toBe('water');
    expect(grid[6][4]).toBe('path');

    const framesA = toFrameGrid(grid, 42);
    const framesB = toFrameGrid(grid, 42);
    expect(framesA).toEqual(framesB);
    for (const row of framesA) {
      for (const frame of row) {
        expect(frame).toBeGreaterThanOrEqual(0);
        expect(frame).toBeLessThan(TILESET_FRAME_COUNT);
      }
    }

    const r1 = seededRandom(123);
    const r2 = seededRandom(123);
    expect([r1(), r1(), r1()]).toEqual([r2(), r2(), r2()]);
  });
});
