import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bus, type NightOutcome } from '../../src/systems/events';
import { isNightActive, triggerNightEvent } from '../../src/systems/nightEvents';
import { debugRewindGrowth, getBedState, plantSeed, shiftGrowth, STAGE_DURATION_MS } from '../../src/systems/plants';
import { gameState } from '../../src/systems/state';

async function runNight(kind: 'snails' | 'voles' | 'crows' | 'rain'): Promise<NightOutcome> {
  let resolved: NightOutcome | null = null;
  let ended: NightOutcome | null = null;
  const onResolved = (p: { outcome: NightOutcome }) => {
    resolved = p.outcome;
  };
  const onEnded = (p: { outcome: NightOutcome }) => {
    ended = p.outcome;
  };
  bus.on('night-resolved', onResolved);
  bus.on('night-ends', onEnded);

  expect(triggerNightEvent(kind)).toBe(true);
  expect(isNightActive()).toBe(true);
  expect(triggerNightEvent(kind)).toBe(false); // blocks concurrent night

  vi.advanceTimersByTime(1600);
  expect(resolved).not.toBeNull();
  vi.advanceTimersByTime(1400);
  expect(ended).not.toBeNull();
  expect(isNightActive()).toBe(false);

  bus.off('night-resolved', onResolved);
  bus.off('night-ends', onEnded);
  return ended!;
}

describe('night events system', () => {
  beforeEach(() => {
    localStorage.clear();
    gameState.reset();
    gameState.data.player.mapId = 'garden';
    gameState.data.player.x = 800;
    gameState.data.player.y = 1000;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T21:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('harms tender beds with snails unless a mature lavender protects them', async () => {
    gameState.addItem('seed-bramble-vine', 1);
    expect(plantSeed('bed-bramble')).toBe(true);
    shiftGrowth('bed-bramble', -STAGE_DURATION_MS); // stage 1
    const beforePlantedAt = getBedState('bed-bramble')!.plantedAt;

    const hit = await runNight('snails');
    expect(hit.dialogueId).toBe('night-snails-hit');
    expect(hit.affectedBedIds).toEqual(['bed-bramble']);
    expect(hit.remnants).toHaveLength(2);
    expect(getBedState('bed-bramble')!.plantedAt).toBeGreaterThan(beforePlantedAt);

    // Mature lavender protects nearby tender beds (bed-extra is 14 tiles away, within SCENT_RADIUS_PX = 18 tiles)
    gameState.addItem('seed-lavender', 1);
    expect(plantSeed('bed-lavender')).toBe(true);
    debugRewindGrowth(STAGE_DURATION_MS * 3);
    gameState.addItem('seed-bramble-vine', 1);
    expect(plantSeed('bed-extra')).toBe(true);

    const safe = await runNight('snails');
    expect(safe.dialogueId).toBe('night-snails-safe');
    expect(safe.protectedBy).toBe('lavender');
    expect(safe.affectedBedIds).toEqual([]);
  });

  it('harms tender beds with voles unless a mature glow lily illuminates them', async () => {
    gameState.addItem('seed-bramble-vine', 1);
    expect(plantSeed('bed-bramble')).toBe(true);

    const hit = await runNight('voles');
    expect(hit.dialogueId).toBe('night-voles-hit');
    expect(hit.affectedBedIds).toEqual(['bed-bramble']);

    gameState.addItem('seed-glow-lily', 1);
    expect(plantSeed('bed-lily')).toBe(true);
    shiftGrowth('bed-lily', -STAGE_DURATION_MS * 3); // only mature glow-lily

    const safe = await runNight('voles');
    expect(safe.dialogueId).toBe('night-voles-safe');
    expect(safe.protectedBy).toBe('glow-lily');
  });

  it('spends a carried sachet or lantern to protect beds no plant covers', async () => {
    gameState.addItem('seed-bramble-vine', 1);
    expect(plantSeed('bed-bramble')).toBe(true);
    const plantedAt = getBedState('bed-bramble')!.plantedAt;
    gameState.addItem('craft-lavender-sachet', 1);
    gameState.addItem('craft-lily-lantern', 1);

    const snails = await runNight('snails');
    expect(snails.dialogueId).toBe('night-snails-sachet');
    expect(snails.protectedBy).toBe('sachet');
    expect(snails.affectedBedIds).toEqual([]);
    expect(gameState.getItemCount('craft-lavender-sachet')).toBe(0);
    expect(gameState.getItemCount('craft-lily-lantern')).toBe(1); // the wrong tool is not spent

    const voles = await runNight('voles');
    expect(voles.dialogueId).toBe('night-voles-lantern');
    expect(voles.protectedBy).toBe('lantern');
    expect(gameState.getItemCount('craft-lily-lantern')).toBe(0);
    expect(getBedState('bed-bramble')!.plantedAt).toBe(plantedAt);

    // Used up: the next night harms the bed again
    expect((await runNight('snails')).dialogueId).toBe('night-snails-hit');

    // Not spent when a plant already protects the beds
    gameState.addItem('seed-glow-lily', 1);
    expect(plantSeed('bed-lily')).toBe(true);
    shiftGrowth('bed-lily', -STAGE_DURATION_MS * 3);
    gameState.addItem('craft-lily-lantern', 1);
    expect((await runNight('voles')).protectedBy).toBe('glow-lily');
    expect(gameState.getItemCount('craft-lily-lantern')).toBe(1);
  });

  it('resolves crow nights based on crow friendship, glow lily, or curio inventory', async () => {
    const nothing = await runNight('crows');
    expect(nothing.dialogueId).toBe('night-crows-nothing');

    gameState.addItem('resource-curio', 1);
    const hit = await runNight('crows');
    expect(hit.dialogueId).toBe('night-crows-hit');
    expect(gameState.getItemCount('resource-curio')).toBe(0);

    gameState.addItem('seed-glow-lily', 1);
    expect(plantSeed('bed-lily')).toBe(true);
    shiftGrowth('bed-lily', -STAGE_DURATION_MS * 3);
    const lily = await runNight('crows');
    expect(lily.dialogueId).toBe('night-crows-lily');
    expect(gameState.getItemCount('resource-curio')).toBe(1);

    gameState.setFlag('crow-met');
    const friend = await runNight('crows');
    expect(friend.dialogueId).toBe('night-crows-friend');
    expect(friend.protectedBy).toBe('crow');
    expect(gameState.getItemCount('resource-curio')).toBe(2);
  });

  it('boosts tender beds during rain nights and handles empty beds cleanly', async () => {
    const empty = await runNight('rain');
    expect(empty.dialogueId).toBe('night-rain-empty');
    expect(empty.affectedBedIds).toEqual([]);

    gameState.addItem('seed-bramble-vine', 1);
    expect(plantSeed('bed-bramble')).toBe(true);
    const before = getBedState('bed-bramble')!.plantedAt;

    const wet = await runNight('rain');
    expect(wet.dialogueId).toBe('night-rain');
    expect(wet.affectedBedIds).toEqual(['bed-bramble']);
    expect(getBedState('bed-bramble')!.plantedAt).toBe(before - 6000);
  });
});
