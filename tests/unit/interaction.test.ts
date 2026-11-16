import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bus } from '../../src/systems/events';
import { createSpecInteractable, type WorldApi } from '../../src/systems/interaction';
import { gameState } from '../../src/systems/state';
import { getMap } from '../../src/world';
import type { InteractableSpec } from '../../src/world/types';

function makeWorld(mapId: string, overrides?: Partial<WorldApi>) {
  const shown: string[] = [];
  const toasts: string[] = [];
  const rested: string[] = [];
  const world: WorldApi = {
    mapId,
    changeMap: vi.fn(),
    showDialogue: (id) => shown.push(id),
    showLines: vi.fn(),
    toast: (msg) => toasts.push(msg),
    rest: (msg) => rested.push(msg),
    ...overrides,
  };
  return { world, shown, toasts, rested };
}

function trigger(mapId: string, specId: string, world: WorldApi): void {
  const spec = getMap(mapId).interactables.find((i) => i.id === specId);
  if (!spec) throw new Error(`Missing spec ${specId} on ${mapId}`);
  const item = createSpecInteractable(spec);
  expect(item.canInteract?.({ world, playerX: 0, playerY: 0 }) ?? true).toBe(true);
  item.onInteract({ world, playerX: 0, playerY: 0 });
}

describe('Tier 1 interactables & variants', () => {
  beforeEach(() => {
    localStorage.clear();
    gameState.reset();
  });

  it('routes rest benches to world.rest with fallback to toast', () => {
    const a = makeWorld('garden');
    trigger('garden', 'bench-garden-west', a.world);
    expect(a.rested).toHaveLength(1);
    expect(a.rested[0]).toContain('Morgen');

    const b = makeWorld('garden', { rest: undefined });
    const spec: InteractableSpec = {
      id: 'bench-custom',
      type: 'rest',
      at: { x: 1, y: 1 },
      label: 'Ausruhen',
      message: 'Kurze Pause.',
    };
    createSpecInteractable(spec).onInteract({ world: b.world, playerX: 0, playerY: 0 });
    expect(b.toasts).toEqual(['Kurze Pause.']);
  });

  it('draws dew from wells once per cooldown and falls back during cooldown', () => {
    const { world, shown, toasts } = makeWorld('garden');
    trigger('garden', 'old-well', world);
    expect(shown).toEqual(['old-well-draw']);

    bus.emit('dialogue-closed', { id: 'old-well-draw' });
    expect(gameState.getItemCount('resource-dew')).toBe(1);
    expect(toasts).toContain('+1 Tau');

    trigger('garden', 'old-well', world);
    expect(shown).toEqual(['old-well-draw', 'old-well']);
  });

  it('grinds produce into flour at the repaired millstone and sets collected-flour', () => {
    const { world, shown } = makeWorld('mill-interior');

    // Before mill wheel repair -> dry stone
    trigger('mill-interior', 'mill-interior-stone', world);
    expect(shown).toEqual(['mill-interior-stone']);

    // Repaired without produce -> running hint
    gameState.setFlag('mill-wheel-repaired');
    trigger('mill-interior', 'mill-interior-stone', world);
    expect(shown[1]).toBe('mill-interior-stone-running');

    // Repaired with 2 produce -> grinds 1 craft-flour + sets collected-flour + starts cooldown
    gameState.addItem('produce-tendril', 2);
    trigger('mill-interior', 'mill-interior-stone', world);
    expect(shown[2]).toBe('mill-interior-stone-grind');

    bus.emit('dialogue-closed', { id: 'mill-interior-stone-grind' });
    expect(gameState.getItemCount('produce-tendril')).toBe(0);
    expect(gameState.getItemCount('craft-flour')).toBe(1);
    expect(gameState.hasFlag('collected-flour')).toBe(true);

    // Cooldown falls back to running hint even with produce carried
    gameState.addItem('produce-honeyberry', 2);
    trigger('mill-interior', 'mill-interior-stone', world);
    expect(shown[3]).toBe('mill-interior-stone-running');
  });

  it('presses honeyberries and dew into berry mash at the orchard cider press', () => {
    const { world, shown } = makeWorld('orchard');

    trigger('orchard', 'orchard-cider-press', world);
    expect(shown).toEqual(['orchard-cider-press']);

    gameState.addItem('produce-honeyberry', 2);
    gameState.addItem('resource-dew', 1);
    trigger('orchard', 'orchard-cider-press', world);
    expect(shown[1]).toBe('orchard-cider-press-use');

    bus.emit('dialogue-closed', { id: 'orchard-cider-press-use' });
    expect(gameState.getItemCount('produce-honeyberry')).toBe(0);
    expect(gameState.getItemCount('resource-dew')).toBe(0);
    expect(gameState.getItemCount('meal-berry-mash')).toBe(1);
  });

  it('filters cottage-stove to cooking recipes only', () => {
    const { world, shown } = makeWorld('orchard-cottage');
    const opened: ({ recipeIds?: string[]; title?: string } | undefined)[] = [];
    const onOpen = (p: { recipeIds?: string[]; title?: string } | undefined) => opened.push(p);
    bus.on('crafting-open', onOpen);

    try {
      // Non-cooking recipe alone should still show the empty stove dialogue
      gameState.setFlag('journal-read:page-bramble');
      trigger('orchard-cottage', 'cottage-stove', world);
      expect(shown).toEqual(['cottage-stove']);
      expect(opened).toEqual([]);

      // Unlocking flour cooking recipe opens the filtered Herd panel
      gameState.setFlag('collected-flour');
      trigger('orchard-cottage', 'cottage-stove', world);
      expect(opened).toEqual([
        {
          recipeIds: ['berry-mash', 'turnip-stew', 'honey-cake', 'turnip-bread'],
          title: 'Herd',
        },
      ]);
    } finally {
      bus.off('crafting-open', onOpen);
    }
  });
});
