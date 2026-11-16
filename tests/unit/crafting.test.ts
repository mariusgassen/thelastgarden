import { beforeEach, describe, expect, it } from 'vitest';
import {
  craft,
  CRAFTING_DIALOGUE_ID,
  craftingMenuLines,
  craftWithToast,
  getMissing,
  getUnlockedRecipes,
  hasPocketWorkbench,
} from '../../src/systems/crafting';
import { getInventoryGroups } from '../../src/systems/inventory';
import { content } from '../../src/content';
import { bus } from '../../src/systems/events';
import { gameState } from '../../src/systems/state';
import { ITEM_ICON_IDS } from '../../src/world/textures';

describe('crafting system', () => {
  let toasts: string[] = [];
  const onToast = (p: { text: string }) => toasts.push(p.text);

  beforeEach(() => {
    localStorage.clear();
    gameState.reset();
    toasts = [];
    bus.off('toast', onToast);
    bus.on('toast', onToast);
  });

  it('unlocks recipes through journal pages and announces them', () => {
    expect(getUnlockedRecipes()).toEqual([]);
    expect(craftingMenuLines()).toBeNull();
    gameState.addItem('produce-tendril', 2);
    gameState.addItem('resource-dew', 1);
    expect(craft('bramble-cutting')).toBe(false); // still locked

    gameState.setFlag('journal-read:page-bramble');
    expect(getUnlockedRecipes().map((r) => r.id)).toEqual(['bramble-cutting']);
    expect(toasts).toContain('Neues Rezept für die Werkbank: Brombeer-Steckling');
  });

  it('crafts from produce and resources and reports what is missing', () => {
    gameState.setFlag('journal-read:page-bramble');
    gameState.setFlag('journal-read:page-lily');
    const recipe = content.recipes.get('bramble-cutting');
    gameState.addItem('produce-tendril', 1);

    expect(getMissing(recipe)).toEqual([
      { itemId: 'produce-tendril', count: 1 },
      { itemId: 'resource-dew', count: 1 },
    ]);
    expect(craft('bramble-cutting')).toBe(false);
    expect(craft('unknown-recipe')).toBe(false);
    expect(gameState.getItemCount('produce-tendril')).toBe(1);

    const choices = craftingMenuLines()![0].choices!;
    expect(choices.map((c) => c.id)).toEqual(['bramble-cutting', 'lily-lantern', undefined]);
    expect(choices[0].label).toBe('Brombeer-Steckling · Brombeertrieb 1/2 · Tau 0/1');

    gameState.addItem('produce-tendril', 1);
    gameState.addItem('resource-dew', 2);
    const crafted: string[] = [];
    const onCrafted = (p: { recipeId: string }) => crafted.push(p.recipeId);
    bus.on('item-crafted', onCrafted);
    expect(craft('bramble-cutting')).toBe(true);
    bus.off('item-crafted', onCrafted);

    expect(crafted).toEqual(['bramble-cutting']);
    expect(gameState.hasFlag('crafted:bramble-cutting')).toBe(true);
    expect(gameState.getItemCount('craft-bramble-cutting')).toBe(1);
    expect(gameState.getItemCount('produce-tendril')).toBe(0);
    expect(gameState.getItemCount('resource-dew')).toBe(1);
  });

  it('groups the inventory for the bag view and knows the pocket workbench', () => {
    expect(getInventoryGroups()).toEqual([]);
    expect(hasPocketWorkbench()).toBe(false);

    gameState.addItem('resource-dew', 2);
    gameState.addItem('seed-lavender', 1);
    gameState.addItem('produce-tendril', 3);
    gameState.addItem('craft-valve-seal', 1);
    gameState.addItem('pocket-workbench', 1);
    gameState.addItem('journal-page-lily', 1);

    expect(hasPocketWorkbench()).toBe(true);
    expect(getInventoryGroups().map((g) => [g.title, g.entries.map((e) => `${e.count} ${e.item.id}`)])).toEqual([
      ['Samen', ['1 seed-lavender']],
      ['Ernte', ['3 produce-tendril']],
      ['Rohstoffe', ['2 resource-dew']],
      ['Werkzeug & Bauteile', ['1 pocket-workbench', '1 craft-valve-seal']],
      ['Notizen', ['1 journal-page-lily']],
    ]);

    gameState.removeItem('produce-tendril', 3);
    expect(getInventoryGroups().map((g) => g.title)).not.toContain('Ernte');
  });

  it('crafts the picked workbench choice and ignores other dialogues', () => {
    gameState.setFlag('journal-read:page-mill');
    toasts = [];

    bus.emit('dialogue-choice', { dialogueId: CRAFTING_DIALOGUE_ID, choiceId: 'seed-mix' });
    expect(toasts).toEqual(['Dafür fehlt noch: 2 Samenkapsel, 1 Tau.']);

    gameState.addItem('produce-seed-pod', 2);
    gameState.addItem('resource-dew', 1);
    bus.emit('dialogue-choice', { dialogueId: 'seed-picker:bed-extra', choiceId: 'seed-mix' });
    expect(gameState.getItemCount('produce-seed-pod')).toBe(2);

    toasts = [];
    bus.emit('dialogue-choice', { dialogueId: CRAFTING_DIALOGUE_ID, choiceId: 'seed-mix' });
    expect(toasts).toEqual(['+1 Brombeerranken-Samen, 1 Leuchtlilien-Zwiebel, 1 Lavendel-Samen']);
    expect(gameState.getItemCount('seed-bramble-vine')).toBe(1);
    expect(gameState.getItemCount('seed-glow-lily')).toBe(1);
    expect(gameState.getItemCount('seed-lavender')).toBe(1);
    expect(gameState.getItemCount('produce-seed-pod')).toBe(0);
  });

  it('crafts with toast feedback directly and ensures every item has a drawn icon', () => {
    gameState.setFlag('journal-read:page-bramble');
    toasts = [];

    expect(craftWithToast('unknown')).toBe(false);
    expect(craftWithToast('bramble-cutting')).toBe(false);
    expect(toasts).toEqual(['Dafür fehlt noch: 2 Brombeertrieb, 1 Tau.']);

    gameState.addItem('produce-tendril', 2);
    gameState.addItem('resource-dew', 1);
    toasts = [];
    expect(craftWithToast('bramble-cutting')).toBe(true);
    expect(toasts).toEqual(['+1 Brombeer-Steckling']);

    const iconSet = new Set(ITEM_ICON_IDS);
    for (const item of content.items.all()) {
      expect(iconSet.has(item.id), `Missing item icon for "${item.id}"`).toBe(true);
    }
  });
});
