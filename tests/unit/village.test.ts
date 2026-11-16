import { beforeEach, describe, expect, it } from 'vitest';
import { content } from '../../src/content';
import { VILLAGE_PARTS, VILLAGERS, getVillagers, villageQuestId } from '../../src/content/village';
import { getWards } from '../../src/systems/blight';
import { bus } from '../../src/systems/events';
import { pickNpcDialogue } from '../../src/systems/npcs';
import { getActiveQuests, getCompletedQuests, startQuestRuntime } from '../../src/systems/quests';
import { gameState } from '../../src/systems/state';
import { ALL_RESTORED_FLAG, getVillageStatus, isPartOpen, isPartRestored, isVillagerHelped, startVillage, syncVillage } from '../../src/systems/village';
import { getWikiEntries } from '../../src/systems/wiki';
import { MAPS } from '../../src/world';
import { buildTileGrid } from '../../src/world/grid';
import { TILES } from '../../src/world/tiles';

const give = (items: { itemId: string; count: number }[]): void => {
  for (const item of items) gameState.addItem(item.itemId, item.count);
};

/** What NpcLayer does when a villager's dialogue closes (systems/npcs.ts), without a scene. */
function talkTo(villagerId: string): string {
  const def = content.npcs.get(villagerId);
  const rule = pickNpcDialogue(def);
  const dialogueId = rule?.dialogueId ?? def.dialogueId!;
  for (const item of rule?.takeItems ?? []) gameState.removeItem(item.itemId, item.count);
  for (const item of rule?.giveItems ?? []) gameState.addItem(item.itemId, item.count);
  for (const flag of rule?.setFlags ?? []) gameState.setFlag(flag);
  return dialogueId;
}

function helpAll(partId: string): void {
  for (const v of getVillagers(partId)) {
    if (isVillagerHelped(v.id)) continue;
    give(v.request);
    expect(talkTo(v.id)).toBe(`village-${v.id}-thanks`);
  }
}

const openedOrder = (): string[] => VILLAGE_PARTS.filter((p) => isPartOpen(p.id)).map((p) => p.id);

describe('living village', () => {
  beforeEach(() => {
    localStorage.clear();
    gameState.reset();
    startQuestRuntime();
    startVillage();
    bus.emit('save-loaded', { save: gameState.data });
    gameState.data.player.mapId = 'garden';
  });

  it('keeps every request, gift and line consistent with the content', () => {
    expect(VILLAGERS).toHaveLength(6);
    for (const v of VILLAGERS) {
      expect(content.npcs.has(v.id)).toBe(true);
      expect(v.request.length).toBeGreaterThan(0);
      for (const entry of [...v.request, ...v.gift]) {
        expect(content.items.has(entry.itemId), `${v.id}: ${entry.itemId}`).toBe(true);
        expect(entry.count).toBeGreaterThan(0);
      }
      for (const text of Object.values(v.lines)) expect(text.trim().length).toBeGreaterThan(10);
      for (const id of ['ask', 'thanks', 'after', 'restored']) expect(content.dialogues.has(`village-${v.id}-${id}`)).toBe(true);
    }
    for (const part of VILLAGE_PARTS) {
      expect(getVillagers(part.id)).toHaveLength(2);
      expect(content.quests.has(villageQuestId(part.id))).toBe(true);
      for (const reward of part.rewardItems) expect(content.items.has(reward.itemId)).toBe(true);
    }
  });

  it('asks for nothing but things the garden makes, and never for money', () => {
    const asked = new Set(VILLAGERS.flatMap((v) => v.request.map((r) => r.itemId)));
    for (const itemId of ['craft-flour', 'produce-egg', 'produce-honey', 'meal-berry-mash', 'meal-turnip-stew']) {
      expect(asked.has(itemId), itemId).toBe(true);
    }
    for (const itemId of asked) expect(['produce', 'meal', 'material']).toContain(content.items.get(itemId).category);
  });

  it('puts every villager and building on open ground of its quarter', () => {
    for (const part of VILLAGE_PARTS) {
      const map = MAPS[part.mapId];
      const grid = buildTileGrid(map);
      const open = (x: number, y: number): boolean => !TILES[grid[Math.floor(y)][Math.floor(x)]].solid;
      for (const v of getVillagers(part.id)) {
        const placement = map.npcs?.find((n) => n.npcId === v.id);
        expect(placement, v.id).toBeDefined();
        expect(placement!.showWhenFlag).toBe(`village-open:${part.id}`);
        expect(open(placement!.at.x, placement!.at.y), `${v.id} stands on open ground`).toBe(true);
      }
      const restoredProps = map.props.filter((p) => p.showWhenFlag === `village-restored:${part.id}`);
      expect(restoredProps.length).toBeGreaterThan(1);
      for (const prop of restoredProps) {
        expect(open(prop.at.x, prop.at.y - 0.1), prop.texture).toBe(true);
        // A restored building may not box in a villager or a pickup.
        const solid = prop.solid;
        if (!solid) continue;
        for (const v of getVillagers(part.id)) {
          const at = map.npcs!.find((n) => n.npcId === v.id)!.at;
          const inside = at.x > solid.x - 0.6 && at.x < solid.x + solid.w + 0.6 && at.y > solid.y - 0.6 && at.y < solid.y + solid.h + 0.6;
          expect(inside, `${prop.texture} next to ${v.id}`).toBe(false);
        }
        for (const node of map.resourceNodes ?? []) {
          const inside = node.at.x > solid.x - 0.3 && node.at.x < solid.x + solid.w + 0.3 && node.at.y > solid.y - 0.3 && node.at.y < solid.y + solid.h + 0.3;
          expect(inside, `${prop.texture} over pickup ${node.id}`).toBe(false);
        }
      }
    }
  });

  it('opens nothing before Episode 4 chose an ending', () => {
    syncVillage();
    expect(openedOrder()).toEqual([]);
    expect(getActiveQuests().some((q) => q.id.startsWith('q-village-'))).toBe(false);
  });

  it.each([
    ['garden', ['plaza', 'farms', 'orchard']],
    ['valley', ['farms', 'orchard', 'plaza']],
    ['future', ['orchard', 'plaza', 'farms']],
  ])('the %s ending opens its quarter first and the other two in a ring', (ending, order) => {
    gameState.setFlag(`chronicle-ending-${ending}`);
    gameState.setFlag('episode-4-complete');
    expect(openedOrder()).toEqual([order[0]]);
    expect(getVillageStatus().map((s) => s.state).filter((s) => s === 'open')).toHaveLength(1);

    helpAll(order[0]);
    expect(isPartRestored(order[0])).toBe(true);
    expect(openedOrder().sort()).toEqual([order[0], order[1]].sort());

    helpAll(order[1]);
    expect(openedOrder().sort()).toEqual([...order].sort());
    expect(gameState.hasFlag(ALL_RESTORED_FLAG)).toBe(false);

    helpAll(order[2]);
    expect(gameState.hasFlag(ALL_RESTORED_FLAG)).toBe(true);
    expect(getCompletedQuests().filter((q) => q.id.startsWith('q-village-'))).toHaveLength(3);
  });

  it('runs a villager through ask, hand-over, thanks and the restored line', () => {
    gameState.setFlag('chronicle-ending-garden');
    const hanne = getVillagers('plaza')[0];
    expect(talkTo(hanne.id)).toBe('village-hanne-ask');
    // Not enough yet: still the request.
    gameState.addItem('craft-flour', 2);
    expect(talkTo(hanne.id)).toBe('village-hanne-ask');
    gameState.addItem('produce-egg', 2);
    expect(talkTo(hanne.id)).toBe('village-hanne-thanks');
    expect(gameState.getItemCount('craft-flour')).toBe(0);
    expect(gameState.getItemCount('produce-egg')).toBe(0);
    expect(gameState.getItemCount('seed-honeyberry')).toBe(2);
    expect(isVillagerHelped('hanne')).toBe(true);
    expect(talkTo('hanne')).toBe('village-hanne-after');

    // Handing over twice is impossible: the gift is paid once.
    give(hanne.request);
    expect(talkTo('hanne')).toBe('village-hanne-after');
    expect(gameState.getItemCount('seed-honeyberry')).toBe(2);

    helpAll('plaza');
    expect(talkTo('hanne')).toBe('village-hanne-restored');
  });

  it('restores a quarter: reward, cleared tree, blight ward, and nothing is sold', () => {
    gameState.setFlag('chronicle-ending-garden');
    expect(getWards('garden').some((w) => w.x === 16 && w.y === 63)).toBe(false);
    expect(gameState.isPathUnblocked('fallen-tree-canal')).toBe(false);

    helpAll('plaza');
    expect(gameState.hasFlag('village-restored:plaza')).toBe(true);
    expect(gameState.isPathUnblocked('fallen-tree-canal')).toBe(true);
    expect(getWards('garden').some((w) => w.x === 16 && w.y === 63)).toBe(true);
    expect(gameState.getItemCount('mat-wood')).toBeGreaterThanOrEqual(3);
    expect(gameState.getItemCount('seed-gold-turnip')).toBeGreaterThanOrEqual(2);
    expect(Object.keys(gameState.data.inventory.items).some((id) => id.includes('coin') || id.includes('money'))).toBe(false);
  });

  it('derives the flags from the quests, so an old save past Episode 4 lands in the right place', () => {
    gameState.setFlag('chronicle-ending-valley');
    gameState.setFlag('episode-4-complete');
    helpAll('farms');
    // A reload: flags dropped, quests kept.
    for (const flag of ['village-open:farms', 'village-restored:farms', 'village-open:orchard']) delete gameState.data.world.flags[flag];
    syncVillage();
    expect(isPartRestored('farms')).toBe(true);
    expect(isPartOpen('orchard')).toBe(true);
    expect(isPartOpen('plaza')).toBe(false);
  });

  it('lets M. announce the first quarter once, according to the ending', () => {
    for (const ending of ['garden', 'valley', 'future']) {
      gameState.reset();
      startQuestRuntime();
      bus.emit('save-loaded', { save: gameState.data });
      gameState.data.player.mapId = 'garden';
      gameState.setFlag('episode-4-complete');
      gameState.setFlag(`chronicle-ending-${ending}`);
      expect(talkTo('m')).toBe(`m-village-hint-${ending}`);
      expect(talkTo('m')).toBe('m-garden-after');
    }
  });

  it('ends with M.\'s celebration once, then a short line', () => {
    gameState.setFlag('episode-4-complete');
    gameState.setFlag('chronicle-ending-garden');
    for (const part of ['plaza', 'farms', 'orchard']) helpAll(part);
    expect(talkTo('m')).toBe('m-village-finale');
    expect(talkTo('m')).toBe('m-village-after');
  });

  it('lets every villager wander around the home spot, like the other NPCs', () => {
    for (const v of VILLAGERS) {
      const part = VILLAGE_PARTS.find((p) => p.id === v.partId)!;
      const placement = MAPS[part.mapId].npcs!.find((n) => n.npcId === v.id)!;
      expect(placement.wander, v.id).toBeGreaterThan(0);
    }
  });

  it('lists quarters, villagers and their quests in the Almanach only once they are known', () => {
    const entry = (key: string) => getWikiEntries().find((e) => e.key === key)!;
    expect(entry('village:plaza').known()).toBe(false);
    expect(entry('persons:hanne')).toBeDefined();
    gameState.setFlag('chronicle-ending-garden');
    expect(entry('village:plaza').known()).toBe(true);
    expect(entry('village:farms').known()).toBe(false);
    expect(entry('village:plaza').lines.join(' ')).toContain('Hanne');
    expect(entry('story:q-village-plaza').known()).toBe(true);
    expect(getWikiEntries().filter((e) => e.key.startsWith('villageParts:'))).toHaveLength(0);
  });
});
