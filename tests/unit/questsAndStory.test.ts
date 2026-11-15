import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { content } from '../../src/content';
import { bus } from '../../src/systems/events';
import { createSpecInteractable, InteractionSystem, type WorldApi } from '../../src/systems/interaction';
import { journalReadFlag, markPageRead } from '../../src/systems/journal';
import { pickNpcDialogue } from '../../src/systems/npcs';
import {
  getActiveQuests,
  getCompletedQuests,
  getObjectiveStates,
  getQuestMarkerIds,
  getTrackedObjective,
  isObjectiveDone,
  startQuest,
  startQuestRuntime,
} from '../../src/systems/quests';
import { collectNode, getResourceNodes, isNodeAvailable } from '../../src/systems/resources';
import { gameState } from '../../src/systems/state';
import { allJournalPages, findResourceNode, getMap } from '../../src/world';

describe('quests, NPCs, journal, resources, and interaction', () => {
  beforeEach(() => {
    localStorage.clear();
    gameState.reset();
    startQuestRuntime();
    bus.emit('save-loaded', { save: gameState.data });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('progresses the full Episode 1, 2, and 3 quest chains cleanly', () => {
    expect(getActiveQuests().map((q) => q.id)).toEqual(['q-meet-crow']);
    expect(getCompletedQuests()).toEqual([]);
    expect(getTrackedObjective()?.quest.id).toBe('q-meet-crow');
    expect([...getQuestMarkerIds()]).toEqual(['npc:crow']);

    // Meet the crow
    gameState.setFlag('crow-met');
    expect(getCompletedQuests().map((q) => q.id)).toEqual(['q-meet-crow']);
    expect(getActiveQuests().map((q) => q.id)).toEqual(['q-restore-beds']);

    // Restore the 3 beds
    gameState.setFlag('bed-restored:bed-bramble');
    gameState.setFlag('bed-restored:bed-lily');
    gameState.setFlag('bed-restored:bed-lavender');
    expect(getCompletedQuests().map((q) => q.id)).toEqual(['q-meet-crow', 'q-restore-beds']);
    expect(getActiveQuests().map((q) => q.id)).toEqual(['q-journal-pages']);

    // Read the 3 Episode 1 journal pages (and verify markPageRead is idempotent)
    for (const page of allJournalPages().filter((p) => p.id.startsWith('page-bramble') || p.id.startsWith('page-lily') || p.id.startsWith('page-lavender'))) {
      markPageRead(page);
      markPageRead(page);
      expect(gameState.hasFlag(journalReadFlag(page.id))).toBe(true);
      if (page.itemId) expect(gameState.getItemCount(page.itemId)).toBe(1);
    }
    expect(getCompletedQuests().map((q) => q.id)).toContain('q-journal-pages');
    expect(getActiveQuests().map((q) => q.id)).toEqual(['q-greenhouse']);

    // Receive key, unlock greenhouse, read map board -> completes Episode 1 and starts Episode 2 quests
    gameState.setFlag('crow-gave-key');
    gameState.setFlag('greenhouse-unlocked');
    gameState.setFlag('greenhouse-hint-read');
    expect(gameState.hasFlag('episode-1-complete')).toBe(true);
    expect(gameState.hasFlag('quest-completed:q-greenhouse')).toBe(true);
    expect(startQuest('q-greenhouse')).toBe(false); // already completed
    expect(getActiveQuests().map((q) => q.id)).toEqual(['q-canal-path', 'q-tramline']);

    // Complete q-canal-path -> grants reward items
    gameState.setFlag('saw-found');
    gameState.markPathUnblocked('fallen-tree-canal');
    bus.emit('path-unblocked', { obstacleId: 'fallen-tree-canal', mapId: 'garden' });
    expect(getCompletedQuests().map((q) => q.id)).toContain('q-canal-path');
    expect(gameState.getItemCount('resource-curio')).toBe(1);

    // Complete q-tramline -> starts q-water-tower
    gameState.markZoneVisited('tram-tracks');
    gameState.markPathUnblocked('bramble-tram-switch');
    gameState.markZoneVisited('water-tower-plaza');
    bus.emit('area-changed', { mapId: 'water-tower', zoneId: 'water-tower-plaza', name: 'Am Wasserturm' });
    expect(getCompletedQuests().map((q) => q.id)).toContain('q-tramline');
    expect(getActiveQuests().map((q) => q.id)).toEqual(['q-water-tower']);

    // Complete q-water-tower -> starts q-inner-greenhouse
    gameState.setFlag('water-tower-crow-met');
    gameState.setFlag('owl-met');
    gameState.setFlag('journal-read:page-tower');
    gameState.setFlag('tower-cistern-repaired');
    gameState.setFlag('bed-restored:bed-tower-lily');
    gameState.setFlag('owl-gave-vial');
    expect(getCompletedQuests().map((q) => q.id)).toContain('q-water-tower');
    expect(getActiveQuests().map((q) => q.id)).toEqual(['q-inner-greenhouse']);

    // Complete q-inner-greenhouse -> sets episode-2-complete and starts Episode 3 quests
    gameState.setFlag('greenhouse-inner-unlocked');
    gameState.setFlag('journal-read:page-heart');
    gameState.setFlag('bed-restored:bed-heart-fern');
    gameState.setFlag('crow-heart-talked');
    expect(gameState.hasFlag('episode-2-complete')).toBe(true);
    expect(getActiveQuests().map((q) => q.id)).toEqual(['q-vestibule-garden', 'q-hill-mist']);

    // Complete q-vestibule-garden side quest
    gameState.setFlag('bed-restored:bed-vestibule');
    expect(getCompletedQuests().map((q) => q.id)).toContain('q-vestibule-garden');
    expect(getActiveQuests().map((q) => q.id)).toEqual(['q-hill-mist']);

    // Complete q-hill-mist -> starts q-find-m
    gameState.markZoneVisited('hill-south');
    gameState.markPathUnblocked('fog-hill-ridge');
    gameState.markZoneVisited('orchard-entrance');
    bus.emit('area-changed', { mapId: 'orchard', zoneId: 'orchard-entrance', name: 'Die alten Obstwiesen' });
    expect(getCompletedQuests().map((q) => q.id)).toContain('q-hill-mist');
    expect(getActiveQuests().map((q) => q.id)).toEqual(['q-find-m']);

    // Complete q-find-m -> starts q-orchard-revival
    gameState.setFlag('crow-orchard-talked');
    gameState.markPathUnblocked('bramble-orchard-terrace');
    gameState.setFlag('m-met');
    expect(getCompletedQuests().map((q) => q.id)).toContain('q-find-m');
    expect(getActiveQuests().map((q) => q.id)).toEqual(['q-orchard-revival']);

    // Complete q-orchard-revival -> sets episode-3-complete and grants apple graft
    gameState.setFlag('orchard-sluice-repaired');
    gameState.setFlag('bed-restored:bed-orchard-violet');
    gameState.setFlag('journal-read:page-orchard');
    gameState.setFlag('m-orchard-celebrated');
    expect(getActiveQuests()).toEqual([]);
    expect(getTrackedObjective()).toBeNull();
    expect(gameState.hasFlag('episode-3-complete')).toBe(true);
    expect(gameState.getItemCount('orchard-apple-graft')).toBe(1);
  });

  it('evaluates item, unblock, and visitZone objective variants', () => {
    expect(isObjectiveDone({ type: 'item', itemId: 'resource-sunlight', count: 2, description: '' })).toBe(false);
    gameState.addItem('resource-sunlight', 2);
    expect(isObjectiveDone({ type: 'item', itemId: 'resource-sunlight', count: 2, description: '' })).toBe(true);

    expect(isObjectiveDone({ type: 'unblock', obstacleId: 'bramble-greenhouse-yard', description: '' })).toBe(false);
    gameState.markPathUnblocked('bramble-greenhouse-yard');
    expect(isObjectiveDone({ type: 'unblock', obstacleId: 'bramble-greenhouse-yard', description: '' })).toBe(true);

    expect(isObjectiveDone({ type: 'visitZone', zoneId: 'pond', description: '' })).toBe(false);
    gameState.markZoneVisited('pond');
    expect(isObjectiveDone({ type: 'visitZone', zoneId: 'pond', description: '' })).toBe(true);

    expect(getObjectiveStates('q-meet-crow')).toHaveLength(1);
  });

  it('picks the right crow dialogue across all progression flags', () => {
    const crow = content.npcs.get('crow');
    expect(pickNpcDialogue(crow)?.dialogueId).toBe('crow-intro');

    gameState.setFlag('crow-met');
    expect(pickNpcDialogue(crow)).toBeUndefined(); // falls back to crow.dialogueId = 'crow-waiting'

    gameState.setFlag('journal-read:page-bramble');
    expect(pickNpcDialogue(crow)?.dialogueId).toBe('crow-progress');

    gameState.setFlag('quest-completed:q-restore-beds');
    expect(pickNpcDialogue(crow)?.dialogueId).toBe('crow-pages-pending');

    gameState.setFlag('quest-completed:q-journal-pages');
    expect(pickNpcDialogue(crow)?.dialogueId).toBe('crow-gives-key');

    gameState.setFlag('crow-gave-key');
    expect(pickNpcDialogue(crow)?.dialogueId).toBe('crow-key-given');

    gameState.setFlag('greenhouse-unlocked');
    expect(pickNpcDialogue(crow)?.dialogueId).toBe('crow-epilogue');
  });

  it('handles one-time and respawnable resource nodes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'));

    expect(getResourceNodes('garden').length).toBeGreaterThan(0);
    expect(getResourceNodes('workshop')).toEqual([]);

    const seedNode = findResourceNode('seed-bramble-1')!;
    expect(isNodeAvailable(seedNode)).toBe(true);
    expect(collectNode('seed-bramble-1')).toBe(true);
    expect(gameState.getItemCount('seed-bramble-vine')).toBe(1);
    expect(isNodeAvailable(seedNode)).toBe(false);
    expect(collectNode('seed-bramble-1')).toBe(false);

    const sunNode = findResourceNode('sun-1')!;
    expect(collectNode('sun-1')).toBe(true);
    expect(isNodeAvailable(sunNode)).toBe(false);
    vi.advanceTimersByTime(sunNode.respawnMs!);
    expect(isNodeAvailable(sunNode)).toBe(true);
    expect(collectNode('sun-1')).toBe(true);
    expect(gameState.getItemCount('resource-sunlight')).toBe(2);
    expect(collectNode('missing-node')).toBe(false);
  });

  it('focuses nearest interactable, handles tap tolerance, and unlocks keyed doors', () => {
    let playerX = 0;
    let playerY = 0;
    const world: WorldApi = {
      mapId: 'garden',
      changeMap: vi.fn(),
      showDialogue: vi.fn(),
      showLines: vi.fn(),
      toast: vi.fn(),
    };
    const interaction = new InteractionSystem(() => ({ world, playerX, playerY }));
    const onFar = vi.fn();
    const onNear = vi.fn();

    interaction.register({
      id: 'far',
      label: 'Weit',
      radius: 80,
      getPosition: () => ({ x: 50, y: 0 }),
      onInteract: onFar,
    });
    interaction.register({
      id: 'near',
      label: 'Nah',
      radius: 80,
      getPosition: () => ({ x: 20, y: 0 }),
      onInteract: onNear,
    });

    interaction.update(true);
    expect(interaction.focused?.id).toBe('near');
    expect(interaction.interactFocused()).toBe(true);
    expect(onNear).toHaveBeenCalledOnce();

    // Tap within tolerance (<= 40px) hits 'far'
    expect(interaction.interactAt(70, 0)).toBe(true);
    expect(onFar).toHaveBeenCalledOnce();
    // Tap outside tolerance misses
    expect(interaction.interactAt(200, 0)).toBe(false);

    interaction.update(false);
    expect(interaction.focused).toBeNull();
    expect(interaction.interactFocused()).toBe(false);

    // Door spec: locked -> key unlock -> changeMap after dialogue closes
    const greenhouseDoorSpec = getMap('garden').interactables.find((i) => i.id === 'greenhouse-door')!;
    const door = createSpecInteractable(greenhouseDoorSpec);
    const ctx = { world, playerX: 0, playerY: 0 };

    door.onInteract(ctx);
    expect(world.showDialogue).toHaveBeenCalledWith('greenhouse-locked');
    expect(world.changeMap).not.toHaveBeenCalled();

    gameState.addItem('greenhouse-key', 1);
    door.onInteract(ctx);
    expect(gameState.getItemCount('greenhouse-key')).toBe(0);
    expect(gameState.hasFlag('greenhouse-unlocked')).toBe(true);
    expect(world.showDialogue).toHaveBeenCalledWith('greenhouse-unlock');
    bus.emit('dialogue-closed', { id: 'greenhouse-unlock' });
    expect(world.changeMap).toHaveBeenCalledWith('greenhouse-vestibule', 'entrance');
  });
});
