/**
 * The living village (content/village.ts). No Phaser dependency.
 *
 * Three quarters of Erlenbrück wake up one after the other. A quarter is driven by its quest
 * `q-village-<part>`: the quest starts when the quarter opens (the Episode 4 ending the player
 * chose, or the quarter before it) and completes once every villager of the quarter has been
 * helped. This system turns those quest states into flags the maps read, and does the rest:
 *
 *   village-open:<part>        the quarter's villagers stand on the map
 *   village-restored:<part>    its buildings stand; the villagers have their "restored" lines
 *   village-all-restored       all three are restored
 *   village-helped:<villager>  set by the villager's NPC rule when the request is handed over
 *
 * Restoring a quarter also clears its obstacles, keeps the blight away from its centre and pays
 * its quest reward. The flags are derived from the quest list, so old saves need no migration.
 *
 *   startVillage()             once at boot, after the quest runtime
 *   syncVillage()              (re)derives every flag and effect; safe to call at any time
 *   getVillageStatus()         { part, state, helped, total }[] in ring order
 *   isPartOpen / isPartRestored / isVillagerHelped
 */
import type { VillagePartDef } from '../content/types';
import { VILLAGE_PARTS, getVillagers, villagerRequestText, villageOpenFlag, villageQuestId, villageRestoredFlag, villagerHelpedFlag } from '../content/village';
import { refreshBlight, registerWardSource } from './blight';
import { bus } from './events';
import { unblockPath } from './obstacles';
import { gameState } from './state';
import { registerWikiSource } from './wiki';

export const ALL_RESTORED_FLAG = 'village-all-restored';

export type PartState = 'locked' | 'open' | 'restored';

export interface PartStatus {
  part: VillagePartDef;
  state: PartState;
  helped: number;
  total: number;
}

export function isPartOpen(partId: string): boolean {
  return gameState.hasFlag(villageOpenFlag(partId));
}

export function isPartRestored(partId: string): boolean {
  return gameState.hasFlag(villageRestoredFlag(partId));
}

export function isVillagerHelped(villagerId: string): boolean {
  return gameState.hasFlag(villagerHelpedFlag(villagerId));
}

export function getVillageStatus(): PartStatus[] {
  return VILLAGE_PARTS.map((part) => {
    const villagers = getVillagers(part.id);
    return {
      part,
      state: isPartRestored(part.id) ? 'restored' : isPartOpen(part.id) ? 'open' : 'locked',
      helped: villagers.filter((v) => isVillagerHelped(v.id)).length,
      total: villagers.length,
    };
  });
}

/** Applies what a restored quarter does. Idempotent: obstacles already gone and blight already pushed back stay so. */
function applyRestored(part: VillagePartDef): void {
  for (const obstacleId of part.unblocks ?? []) unblockPath(obstacleId);
  refreshBlight(part.mapId);
}

/** Derives every village flag from the quests. Only quest states count, so a loaded save always lands on the same flags. */
export function syncVillage(): void {
  for (const part of VILLAGE_PARTS) {
    const questId = villageQuestId(part.id);
    const restored = gameState.isQuestCompleted(questId);
    if (restored || gameState.isQuestActive(questId)) gameState.setFlag(villageOpenFlag(part.id));
    if (restored) {
      gameState.setFlag(villageRestoredFlag(part.id));
      applyRestored(part);
    }
  }
  if (VILLAGE_PARTS.every((p) => isPartRestored(p.id))) gameState.setFlag(ALL_RESTORED_FLAG);
}

/** Almanach: a quarter is listed once it has opened; it names who lives there and what they asked for. */
registerWikiSource(() =>
  VILLAGE_PARTS.map((part) => ({
    key: `village:${part.id}`,
    section: 'village',
    title: part.name,
    lines: [
      part.description,
      ...getVillagers(part.id).map((v) => `${v.name}: ${villagerRequestText(v.request)}${isVillagerHelped(v.id) ? ' (erledigt)' : ''}.`),
      isPartRestored(part.id) ? 'Wieder voll Leben.' : 'Wartet auf Hilfe.',
    ],
    known: () => isPartOpen(part.id),
  })),
);

let started = false;

export function startVillage(): void {
  if (started) return;
  started = true;
  registerWardSource((mapId) =>
    VILLAGE_PARTS.flatMap((p) => (p.mapId === mapId && p.ward && isPartRestored(p.id) ? [{ ...p.ward }] : [])),
  );
  bus.on('quest-started', ({ questId }) => {
    const part = VILLAGE_PARTS.find((p) => villageQuestId(p.id) === questId);
    if (!part) return;
    syncVillage();
    bus.emit('toast', { text: `${part.name} in Erlenbrück wartet auf Hilfe.` });
  });
  bus.on('quest-completed', ({ questId }) => {
    const part = VILLAGE_PARTS.find((p) => villageQuestId(p.id) === questId);
    if (!part) return;
    syncVillage();
    bus.emit('toast', { text: part.restoredText });
    gameState.save();
  });
  bus.on('save-loaded', () => syncVillage());
  syncVillage();
}
