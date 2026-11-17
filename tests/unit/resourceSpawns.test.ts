import { beforeEach, describe, expect, it } from 'vitest';
import { baseTileAt, isKeepClearTile, placePiece, whyNotPlace } from '../../src/systems/building';
import { collectNode, getNodeSpot, getResourceNodes, ROAM_TILES, setSpawnSeed } from '../../src/systems/resources';
import { parseSave } from '../../src/systems/save';
import { gameState } from '../../src/systems/state';
import { findResourceNode } from '../../src/world';
import { TILES } from '../../src/world/tiles';

const spotOf = (id: string): string => {
  const n = getResourceNodes().find((r) => r.id === id)!;
  return `${n.at.x},${n.at.y}`;
};

/** Collects `id` and pretends its regrow timer has run out. */
const harvestAndRegrow = (id: string): void => {
  expect(collectNode(id)).toBe(true);
  const state = gameState.getExt<{ lastCollectedAt: Record<string, number> }>('resources', { lastCollectedAt: {} });
  state.lastCollectedAt[id] = 0;
};

describe('random pickup spawns', () => {
  beforeEach(() => {
    localStorage.clear();
    gameState.reset();
    setSpawnSeed(1234);
  });

  it('starts every pickup where the map data puts it', () => {
    for (const n of getResourceNodes()) expect(n.at).toEqual(findResourceNode(n.id)!.at);
  });

  it('regrows renewable piles on a different open grass tile near home, and is deterministic', () => {
    const home = findResourceNode('wood-garden-1')!.at;
    const seen = new Set<string>();
    for (let i = 0; i < 6; i++) {
      harvestAndRegrow('wood-garden-1');
      const n = getResourceNodes('garden').find((r) => r.id === 'wood-garden-1')!;
      const [tx, ty] = [Math.floor(n.at.x), Math.floor(n.at.y)];
      const tile = baseTileAt('garden', tx, ty)!;
      expect(TILES[tile].solid).toBe(false);
      expect(['grass', 'wildGrass', 'orchardGrass']).toContain(tile);
      expect(isKeepClearTile('garden', tx, ty)).toBe(false);
      expect(Math.hypot(tx - Math.floor(home.x), ty - Math.floor(home.y))).toBeLessThanOrEqual(ROAM_TILES);
      seen.add(`${tx},${ty}`);
    }
    expect(seen.size).toBeGreaterThan(2);

    const first: string[] = [];
    for (const seed of [1234, 1234]) {
      gameState.reset();
      setSpawnSeed(seed);
      harvestAndRegrow('wood-garden-1');
      first.push(spotOf('wood-garden-1'));
    }
    expect(first[0]).toBe(first[1]);
  });

  it('never moves one-time finds and seeds', () => {
    expect(collectNode('curio-1')).toBe(true);
    expect(collectNode('seed-bramble-1')).toBe(true);
    expect(spotOf('curio-1')).toBe(`${findResourceNode('curio-1')!.at.x},${findResourceNode('curio-1')!.at.y}`);
  });

  it('keeps spots across a save and loads old saves without a seed', () => {
    harvestAndRegrow('stone-garden-1');
    const spot = spotOf('stone-garden-1');
    gameState.save();
    const reloaded = parseSave(localStorage.getItem('the-last-garden:save')!)!;
    expect((reloaded.ext.resources as { spots: Record<string, unknown> }).spots['stone-garden-1']).toBeDefined();
    gameState.reset();
    const old = parseSave(JSON.stringify({ version: 1, ext: { resources: { collected: [], lastCollectedAt: {} } } }))!;
    expect(old.ext.resources).toEqual({ collected: [], lastCollectedAt: {} });
    expect(spot).not.toBe('');
  });

  it('blocks building on visible pickups, allows building on collected/pending spots, and relocates pending respawns', () => {
    gameState.addItem('mat-wood', 5);
    const home = findResourceNode('sun-2')!.at;
    expect(whyNotPlace('garden', 'fence', Math.floor(home.x), Math.floor(home.y))).toBe('Hier liegt etwas.');

    expect(collectNode('sun-2')).toBe(true);
    const pending = getNodeSpot('sun-2')!;
    const px = Math.floor(pending.x);
    const py = Math.floor(pending.y);
    expect(placePiece('garden', 'fence', px, py)).toBeNull();

    const moved = getNodeSpot('sun-2')!;
    expect([Math.floor(moved.x), Math.floor(moved.y)]).not.toEqual([px, py]);
  });
});
