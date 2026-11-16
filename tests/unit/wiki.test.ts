import { beforeEach, describe, expect, it } from 'vitest';
import { content } from '../../src/content';
import { bus } from '../../src/systems/events';
import { gameState } from '../../src/systems/state';
import { getWikiEntries, getWikiSections, refreshWiki, registerWikiSource, startWiki } from '../../src/systems/wiki';

function knownKeys(): string[] {
  return getWikiSections().flatMap((s) => s.entries.filter((e) => e.known).map((e) => e.entry.key));
}

describe('wiki', () => {
  beforeEach(() => {
    localStorage.clear();
    gameState.reset();
    startWiki();
  });

  it('generates an entry for every plant, recipe and build piece', () => {
    const keys = getWikiEntries().map((e) => e.key);
    for (const p of content.plants.all()) expect(keys).toContain(`plants:${p.id}`);
    for (const r of content.recipes.all()) expect(keys).toContain(`recipes:${r.id}`);
    for (const b of content.buildables.all()) expect(keys).toContain(`buildables:${b.id}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('derives item and plant text from the other definitions', () => {
    const lavender = getWikiEntries().find((e) => e.key === 'plants:lavender')!;
    expect(lavender.lines.join(' ')).toContain(content.items.get('seed-lavender').name);
    const seed = getWikiEntries().find((e) => e.key === 'items:seed-lavender')!;
    expect(seed.lines.join(' ')).toContain('Lavendel');
  });

  it('unlocks entries as the player finds things, and keeps them', () => {
    expect(knownKeys()).not.toContain('items:seed-lavender');
    expect(knownKeys()).not.toContain('plants:lavender');
    gameState.addItem('seed-lavender', 1);
    expect(knownKeys()).toContain('items:seed-lavender');
    expect(knownKeys()).toContain('plants:lavender');
    gameState.removeItem('seed-lavender', 1);
    expect(knownKeys()).toContain('items:seed-lavender');
  });

  it('unlocks topics and build pieces by flag, and picks up old saves', () => {
    expect(knownKeys()).not.toContain('topics:blight');
    gameState.setFlag('episode-1-complete');
    expect(knownKeys()).toContain('topics:blight');
    gameState.setFlag('gathered-material');
    expect(knownKeys()).toContain('buildables:fence');
    gameState.data.inventory.items['seed-glow-lily'] = 1; // as an old save would have it
    refreshWiki();
    expect(gameState.getExt<{ seen: string[] }>('wiki', { seen: [] }).seen).toContain('plants:glow-lily');
  });

  it('lists entries of registered sources and warns the player about new ones', () => {
    const toasts: string[] = [];
    bus.on('toast', (t) => toasts.push(t.text));
    registerWikiSource(() => [
      { key: 'test:thing', section: 'machines', title: 'Testding', lines: ['x'], known: () => gameState.hasFlag('test-thing') },
    ]);
    expect(getWikiSections().find((s) => s.id === 'machines')?.title).toBe('Maschinen');
    gameState.setFlag('test-thing');
    expect(knownKeys()).toContain('test:thing');
    expect(toasts).toContain('Neu im Almanach: Testding');
  });

  it('covers people, places and story, unlocked by playing', () => {
    const keys = getWikiEntries().map((e) => e.key);
    for (const n of content.npcs.all()) expect(keys).toContain(`persons:${n.id}`);
    for (const q of content.quests.all()) expect(keys).toContain(`story:${q.id}`);
    expect(keys).toContain('places:garden');
    expect(knownKeys()).not.toContain('persons:crow');
    bus.emit('interacted', { id: 'npc:crow' });
    expect(knownKeys()).toContain('persons:crow');
    gameState.markZoneVisited('garden');
    refreshWiki();
    expect(knownKeys()).toContain('places:garden');
    gameState.markQuestActive('q-meet-crow');
    refreshWiki();
    expect(knownKeys()).toContain('story:q-meet-crow');
  });

  it('explains tools, meals and the new mechanics', () => {
    const sickle = getWikiEntries().find((e) => e.key === 'items:tool-sickle')!;
    expect(sickle.lines.join(' ')).toContain(content.tools.get('tool-sickle').hint);
    expect(knownKeys()).not.toContain('topics:animals');
    gameState.setFlag('built:beehive');
    expect(knownKeys()).toContain('topics:animals');
  });
});
