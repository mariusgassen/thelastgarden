/**
 * Quest runtime. No Phaser dependency.
 *
 * Objective completion is derived from save state on every evaluation (flags, inventory,
 * unblocked paths, visited zones), so there is nothing to persist beyond
 * `SaveGame.quests.active/completed`. The runtime re-evaluates on the bus events that can
 * change any of those and starts quests whose `autoStart` / `startsWhen` conditions hold.
 *
 *   startQuestRuntime()        once at boot, after gameState.init()
 *   startQuest(id)             force-start (dev / scripted)
 *   getActiveQuests()          QuestDef[] in start order
 *   getCompletedQuests()
 *   getObjectiveStates(id)     { objective, done }[]
 *   getQuestMarkerIds()        interactable ids that should carry a quest pin right now
 */
import { content } from '../content';
import type { QuestDef, QuestObjective } from '../content/types';
import { bus } from './events';
import { gameState } from './state';

export interface ObjectiveState {
  objective: QuestObjective;
  done: boolean;
}

export function isObjectiveDone(objective: QuestObjective): boolean {
  switch (objective.type) {
    case 'flag':
      return gameState.hasFlag(objective.flag);
    case 'item':
      return gameState.getItemCount(objective.itemId) >= objective.count;
    case 'unblock':
      return gameState.isPathUnblocked(objective.obstacleId);
    case 'visitZone':
      return gameState.hasVisitedZone(objective.zoneId);
  }
}

export function getObjectiveStates(questId: string): ObjectiveState[] {
  return content.quests.get(questId).objectives.map((objective) => ({ objective, done: isObjectiveDone(objective) }));
}

export function getActiveQuests(): QuestDef[] {
  return gameState.data.quests.active.filter((id) => content.quests.has(id)).map((id) => content.quests.get(id));
}

export function getCompletedQuests(): QuestDef[] {
  return gameState.data.quests.completed.filter((id) => content.quests.has(id)).map((id) => content.quests.get(id));
}

/** First open objective of the most recently started quest — what the HUD tracker shows. */
export function getTrackedObjective(): { quest: QuestDef; objective: QuestObjective } | null {
  const active = getActiveQuests();
  for (let i = active.length - 1; i >= 0; i--) {
    const open = active[i].objectives.find((o) => !isObjectiveDone(o));
    if (open) return { quest: active[i], objective: open };
  }
  return null;
}

export function getQuestMarkerIds(): Set<string> {
  const ids = new Set<string>();
  for (const quest of getActiveQuests()) {
    for (const objective of quest.objectives) {
      if (isObjectiveDone(objective)) continue;
      for (const id of objective.markers ?? []) ids.add(id);
    }
  }
  return ids;
}

export function startQuest(questId: string): boolean {
  const quest = content.quests.get(questId);
  if (gameState.isQuestActive(questId) || gameState.isQuestCompleted(questId)) return false;
  gameState.markQuestActive(questId);
  bus.emit('quest-started', { questId });
  bus.emit('toast', { text: `Neue Aufgabe: ${quest.title}` });
  evaluate();
  return true;
}

function canStart(quest: QuestDef): boolean {
  if (gameState.isQuestActive(quest.id) || gameState.isQuestCompleted(quest.id)) return false;
  if (quest.autoStart) return true;
  return quest.startsWhen?.some((flag) => gameState.hasFlag(flag)) ?? false;
}

function complete(quest: QuestDef): void {
  gameState.markQuestCompleted(quest.id);
  for (const reward of quest.rewardItems ?? []) gameState.addItem(reward.itemId, reward.count);
  bus.emit('quest-completed', { questId: quest.id });
  bus.emit('toast', { text: `Erledigt: ${quest.title}` });
  // Flags last: they may start the next quest, whose toast should follow this one.
  for (const flag of quest.rewardFlags ?? []) gameState.setFlag(flag);
  gameState.setFlag(`quest-completed:${quest.id}`);
}

const objectiveSeen = new Map<string, boolean[]>();
let evaluating = false;
let pending = false;

/** Re-derives objective + quest states from the save and emits what changed. Re-entrancy safe. */
export function evaluate(): void {
  if (evaluating) {
    pending = true;
    return;
  }
  evaluating = true;
  let changed = false;
  try {
    do {
      pending = false;
      for (const quest of content.quests.all()) {
        if (canStart(quest)) {
          gameState.markQuestActive(quest.id);
          bus.emit('quest-started', { questId: quest.id });
          bus.emit('toast', { text: `Neue Aufgabe: ${quest.title}` });
          changed = true;
        }
      }
      for (const quest of getActiveQuests()) {
        const states = getObjectiveStates(quest.id);
        const seen = objectiveSeen.get(quest.id) ?? states.map(() => false);
        states.forEach((s, index) => {
          if (s.done && !seen[index]) {
            seen[index] = true;
            bus.emit('quest-objective-completed', { questId: quest.id, index });
            changed = true;
          }
        });
        objectiveSeen.set(quest.id, seen);
        if (states.every((s) => s.done)) {
          complete(quest);
          changed = true;
        }
      }
    } while (pending);
  } finally {
    evaluating = false;
  }
  if (changed) {
    gameState.save();
    bus.emit('quest-updated', undefined);
  }
}

let started = false;
export function startQuestRuntime(): void {
  if (started) return;
  started = true;
  const refresh = () => evaluate();
  bus.on('flag-changed', refresh);
  bus.on('inventory-changed', refresh);
  bus.on('path-unblocked', refresh);
  bus.on('area-changed', refresh);
  bus.on('save-loaded', () => {
    objectiveSeen.clear();
    // Objectives already done in a loaded save shouldn't re-announce themselves.
    for (const quest of getActiveQuests()) objectiveSeen.set(quest.id, getObjectiveStates(quest.id).map((s) => s.done));
    evaluate();
  });
  for (const quest of getActiveQuests()) objectiveSeen.set(quest.id, getObjectiveStates(quest.id).map((s) => s.done));
  evaluate();
}
