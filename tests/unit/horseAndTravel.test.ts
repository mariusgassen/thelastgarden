import { beforeEach, describe, expect, it } from 'vitest';
import { content } from '../../src/content';
import { craft } from '../../src/systems/crafting';
import { bus } from '../../src/systems/events';
import { canRideHere, hasHorse, isRiding, isRidingHere, setRiding, toggleRiding } from '../../src/systems/horse';
import { pickNpcDialogue } from '../../src/systems/npcs';
import { parseSave } from '../../src/systems/save';
import { gameState } from '../../src/systems/state';
import { getTravelStops, hasTravelMap, travelTo } from '../../src/systems/travel';
import { getMap, MAPS } from '../../src/world';
import { TRAVEL_STOPS } from '../../src/world/travel';

describe('horse and fast travel', () => {
  let toasts: string[] = [];
  let travels: { mapId: string; spawn: string }[] = [];
  let ridingEvents: boolean[] = [];
  const onToast = (p: { text: string }) => toasts.push(p.text);
  const onTravel = (p: { mapId: string; spawn: string }) => travels.push(p);
  const onRiding = (p: { riding: boolean }) => ridingEvents.push(p.riding);

  beforeEach(() => {
    localStorage.clear();
    gameState.reset();
    toasts = [];
    travels = [];
    ridingEvents = [];
    bus.off('toast', onToast).on('toast', onToast);
    bus.off('fast-travel', onTravel).on('fast-travel', onTravel);
    bus.off('riding-changed', onRiding).on('riding-changed', onRiding);
  });

  it('befriends Mohn with a crafted treat and takes the treat', () => {
    const mohn = content.npcs.get('mohn');
    gameState.data.player.mapId = 'tramline';
    expect(pickNpcDialogue(mohn)?.dialogueId).toBe('mohn-intro');
    gameState.setFlag('horse-met');
    expect(pickNpcDialogue(mohn)?.dialogueId).toBe('mohn-waiting');

    gameState.setFlag('journal-read:page-mohn');
    gameState.addItem('produce-tendril', 1);
    gameState.addItem('produce-scent-bundle', 1);
    gameState.addItem('resource-dew', 1);
    expect(craft('horse-treat')).toBe(true);

    const rule = pickNpcDialogue(mohn);
    expect(rule?.dialogueId).toBe('mohn-tamed');
    expect(rule?.takeItems).toEqual([{ itemId: 'craft-horse-treat', count: 1 }]);
    expect(rule?.setFlags).toEqual(['horse-tamed']);
  });

  it('rides only with the horse and only outdoors, and keeps the choice across interiors', () => {
    expect(hasHorse()).toBe(false);
    expect(toggleRiding()).toBe(false);
    expect(isRiding()).toBe(false);

    gameState.setFlag('horse-tamed');
    expect(toggleRiding()).toBe(true);
    expect(isRidingHere()).toBe(true);
    expect(ridingEvents).toEqual([true]);

    gameState.data.player.mapId = 'workshop';
    expect(canRideHere()).toBe(false);
    expect(isRiding()).toBe(true);
    expect(isRidingHere()).toBe(false);
    expect(setRiding(false)).toBe(false);
    expect(toasts).toContain('Mohn wartet lieber draußen.');

    gameState.data.player.mapId = 'garden';
    expect(isRidingHere()).toBe(true);
    expect(toggleRiding()).toBe(true);
    expect(isRiding()).toBe(false);
    expect(ridingEvents).toEqual([true, false]);
  });

  it('travels only with the copied plan and only to places already visited', () => {
    gameState.markZoneVisited('garden');
    gameState.markZoneVisited('tram-tracks');
    expect(hasTravelMap()).toBe(false);
    expect(travelTo('tramline')).toBe(false);

    gameState.setFlag('greenhouse-hint-read');
    expect(getTravelStops().filter((s) => s.known).map((s) => s.stop.mapId)).toEqual(['garden', 'tramline']);
    expect(getTravelStops().find((s) => s.current)?.stop.mapId).toBe('garden');

    expect(travelTo('water-tower')).toBe(false);
    expect(travelTo('workshop')).toBe(false);
    expect(travelTo('garden')).toBe(false);
    expect(toasts).toContain('Hier bist du schon.');
    expect(travels).toEqual([]);

    expect(travelTo('tramline')).toBe(true);
    expect(travels).toEqual([{ mapId: 'tramline', spawn: 'west' }]);
  });

  it('defines every stop as an outdoor map with an existing spawn', () => {
    for (const stop of TRAVEL_STOPS) {
      const map = getMap(stop.mapId);
      expect(map.indoor, stop.mapId).toBeFalsy();
      expect(map.spawns[stop.spawn], `${stop.mapId}.${stop.spawn}`).toBeDefined();
      expect(stop.at.x).toBeGreaterThan(0);
      expect(stop.at.x).toBeLessThan(1);
      expect(stop.at.y).toBeGreaterThan(0);
      expect(stop.at.y).toBeLessThan(1);
    }
    // Every outdoor map is a stop, so no place is left off the plan.
    const outdoor = Object.values(MAPS).filter((m) => !m.indoor).map((m) => m.id);
    expect(TRAVEL_STOPS.map((s) => s.mapId).sort()).toEqual(outdoor.sort());
  });

  it('unlocks map and horse for saves written before these features', () => {
    const old = parseSave(
      JSON.stringify({
        version: 1,
        player: { mapId: 'orchard', x: 300, y: 900, facing: 'left' },
        world: {
          unblockedPaths: [],
          visitedZones: ['garden', 'tram-tracks', 'water-tower-plaza', 'hill-south', 'orchard-entrance'],
          flags: { 'greenhouse-hint-read': true, 'episode-1-complete': true },
        },
        inventory: { items: {} },
        quests: { active: [], completed: [], progress: {} },
        ext: {},
      }),
    );
    expect(old).not.toBeNull();
    gameState.data = old!;
    expect(hasTravelMap()).toBe(true);
    expect(getTravelStops().filter((s) => s.known)).toHaveLength(5);
    expect(isRiding()).toBe(false);
    expect(travelTo('garden')).toBe(true);
  });
});
