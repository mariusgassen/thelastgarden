import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bus } from '../../src/systems/events';
import {
  clearSave,
  createDefaultSave,
  loadSave,
  parseSave,
  SAVE_KEY,
  SAVE_VERSION,
  writeSave,
} from '../../src/systems/save';
import { gameState } from '../../src/systems/state';

describe('save system', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates clean default saves', () => {
    const save = createDefaultSave();
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.player.mapId).toBe('garden');
    expect(save.world.unblockedPaths).toEqual([]);
    expect(save.world.visitedZones).toEqual([]);
    expect(save.world.flags).toEqual({});
    expect(save.inventory.items).toEqual({});
    expect(save.quests).toEqual({ active: [], completed: [], progress: {} });
    expect(save.ext).toEqual({});
  });

  it('returns null for malformed or non-object JSON', () => {
    expect(parseSave('not json')).toBeNull();
    expect(parseSave('123')).toBeNull();
    expect(parseSave('[]')).toBeNull();
    expect(parseSave('null')).toBeNull();
  });

  it('merges partial saves onto defaults while preserving unknown keys', () => {
    const parsed = parseSave(
      JSON.stringify({
        version: 1,
        player: { mapId: 'workshop', x: 100 },
        world: { flags: { 'crow-met': true } },
        inventory: { items: { 'seed-lavender': 2 } },
        ext: { custom: { ok: 1 } },
        futureKey: 'keep-me',
      }),
    ) as (ReturnType<typeof createDefaultSave> & { futureKey?: string }) | null;

    expect(parsed).not.toBeNull();
    expect(parsed!.player).toEqual({ mapId: 'workshop', x: 100, y: -1, facing: 'right' });
    expect(parsed!.world.unblockedPaths).toEqual([]);
    expect(parsed!.world.flags).toEqual({ 'crow-met': true });
    expect(parsed!.inventory.items).toEqual({ 'seed-lavender': 2 });
    expect(parsed!.ext).toEqual({ custom: { ok: 1 } });
    expect(parsed!.futureKey).toBe('keep-me');
  });

  it('falls back to defaults on mismatched field types and warns on newer versions', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const parsed = parseSave(
      JSON.stringify({
        version: SAVE_VERSION + 5,
        player: 'invalid',
        world: { unblockedPaths: 'not-an-array', flags: [] },
      }),
    );

    expect(warn).toHaveBeenCalledOnce();
    expect(parsed).not.toBeNull();
    expect(parsed!.version).toBe(SAVE_VERSION);
    expect(parsed!.player).toEqual(createDefaultSave().player);
    expect(parsed!.world.unblockedPaths).toEqual([]);
    expect(parsed!.world.flags).toEqual({});
  });

  it('writes, loads, and clears localStorage safely', () => {
    const save = createDefaultSave();
    save.player.x = 240;
    expect(writeSave(save)).toBe(true);
    expect(localStorage.getItem(SAVE_KEY)).toBeTruthy();

    const loaded = loadSave();
    expect(loaded?.player.x).toBe(240);

    clearSave();
    expect(loadSave()).toBeNull();
  });

  it('handles storage errors gracefully without throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(loadSave()).toBeNull();
    expect(writeSave(createDefaultSave())).toBe(false);
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe('gameState', () => {
  beforeEach(() => {
    localStorage.clear();
    gameState.reset();
  });

  it('manages flags and emits flag-changed only on transitions', () => {
    const events: { key: string; value: unknown }[] = [];
    const onFlag = (p: { key: string; value: unknown }) => events.push(p);
    bus.on('flag-changed', onFlag);

    expect(gameState.hasFlag('crow-met')).toBe(false);
    gameState.setFlag('crow-met');
    gameState.setFlag('crow-met'); // no-op duplicate
    gameState.setFlag('counter', 2);
    gameState.setFlag('crow-met', false);

    bus.off('flag-changed', onFlag);

    expect(gameState.getFlag('counter')).toBe(2);
    expect(gameState.hasFlag('crow-met')).toBe(false);
    expect(events).toEqual([
      { key: 'crow-met', value: true },
      { key: 'counter', value: 2 },
      { key: 'crow-met', value: false },
    ]);
  });

  it('manages inventory counts, clamps at zero, and emits inventory-changed', () => {
    const events: { itemId: string; count: number }[] = [];
    const onInv = (p: { itemId: string; count: number }) => events.push(p);
    bus.on('inventory-changed', onInv);

    gameState.addItem('seed-lavender', 2);
    expect(gameState.getItemCount('seed-lavender')).toBe(2);
    expect(gameState.removeItem('seed-lavender', 3)).toBe(false);
    expect(gameState.removeItem('seed-lavender', 2)).toBe(true);
    expect(gameState.getItemCount('seed-lavender')).toBe(0);
    expect('seed-lavender' in gameState.data.inventory.items).toBe(false);

    bus.off('inventory-changed', onInv);
    expect(events).toEqual([
      { itemId: 'seed-lavender', count: 2 },
      { itemId: 'seed-lavender', count: 0 },
    ]);
  });

  it('tracks zones, unblocked paths, quests, ext namespaces, save, init, and reset', () => {
    gameState.markZoneVisited('garden');
    gameState.markZoneVisited('garden');
    expect(gameState.data.world.visitedZones).toEqual(['garden']);
    expect(gameState.hasVisitedZone('garden')).toBe(true);

    gameState.markPathUnblocked('bramble-greenhouse-yard');
    expect(gameState.isPathUnblocked('bramble-greenhouse-yard')).toBe(true);

    gameState.markQuestActive('q-meet-crow');
    expect(gameState.isQuestActive('q-meet-crow')).toBe(true);
    gameState.markQuestCompleted('q-meet-crow');
    expect(gameState.isQuestActive('q-meet-crow')).toBe(false);
    expect(gameState.isQuestCompleted('q-meet-crow')).toBe(true);
    gameState.markQuestActive('q-meet-crow'); // completed quests cannot re-activate
    expect(gameState.isQuestActive('q-meet-crow')).toBe(false);

    gameState.setExt('custom', { level: 3 });
    expect(gameState.getExt('custom', { level: 0 })).toEqual({ level: 3 });

    gameState.save();
    gameState.data.world.flags['temp'] = true;
    gameState.init();
    expect(gameState.hasFlag('temp')).toBe(false);
    expect(gameState.isQuestCompleted('q-meet-crow')).toBe(true);

    gameState.reset();
    expect(gameState.isQuestCompleted('q-meet-crow')).toBe(false);
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });
});
