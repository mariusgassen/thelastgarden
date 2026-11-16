import { BUILDABLES } from './buildables';
import { DIALOGUES } from './dialogues';
import { ITEMS } from './items';
import { NPCS } from './npcs';
import { PLANTS } from './plants';
import { QUESTS } from './quests';
import { RECIPES } from './recipes';
import { TOOLS } from './tools';
import { VILLAGE_PARTS, villageDialogues, villageQuests, villagerNpcs } from './village';
import type { BuildableDef, DialogueDef, ItemDef, NpcDef, PlantDef, QuestDef, RecipeDef, ToolDef, VillagePartDef } from './types';

export * from './types';

export class Registry<T extends { id: string }> {
  private readonly byId = new Map<string, T>();

  constructor(
    readonly kind: string,
    entries: readonly T[],
  ) {
    for (const entry of entries) this.add(entry);
  }

  /** Later waves may add entries at runtime; duplicate ids are a content bug. */
  add(entry: T): void {
    if (this.byId.has(entry.id)) throw new Error(`[content] duplicate ${this.kind} id "${entry.id}"`);
    this.byId.set(entry.id, entry);
  }

  get(id: string): T {
    const entry = this.byId.get(id);
    if (!entry) throw new Error(`[content] unknown ${this.kind} id "${id}"`);
    return entry;
  }

  find(id: string): T | undefined {
    return this.byId.get(id);
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  all(): T[] {
    return [...this.byId.values()];
  }
}

export const content = {
  plants: new Registry<PlantDef>('plant', PLANTS),
  items: new Registry<ItemDef>('item', ITEMS),
  quests: new Registry<QuestDef>('quest', [...QUESTS, ...villageQuests()]),
  dialogues: new Registry<DialogueDef>('dialogue', [...DIALOGUES, ...villageDialogues()]),
  npcs: new Registry<NpcDef>('npc', [...NPCS, ...villagerNpcs()]),
  recipes: new Registry<RecipeDef>('recipe', RECIPES),
  buildables: new Registry<BuildableDef>('buildable', BUILDABLES),
  tools: new Registry<ToolDef>('tool', TOOLS),
  villageParts: new Registry<VillagePartDef>('village part', VILLAGE_PARTS),
};
