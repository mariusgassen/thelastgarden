/**
 * Content definitions: pure data, no Phaser, no game logic.
 * Systems look entries up by id via the registries in ./index.ts.
 */

/** Kinds of natural obstacles placed in the world (see src/world/types.ts ObstacleDef). */
export type ObstacleKind = 'bramble' | 'fallenTree' | 'tallGrass';

export interface PlantDef {
  id: string;
  name: string;
  description: string;
  /** Item id of the seed that grows this plant. */
  seedItemId?: string;
  /** Number of growth stages until mature. */
  growthStages: number;
  /** Obstacle kinds this plant's ability can clear once mature (consumed by Wave 2). */
  clears?: ObstacleKind[];
  /** Free-form ability id, interpreted by the plant-abilities system (Wave 2). */
  abilityId?: string;
  /** Primary display color (hex) for placeholder rendering. */
  color: number;
  /** Light radius in px a mature plant emits (hook for Wave 4's day/night layer; see systems/plants.ts getLightSources). */
  lightRadius?: number;
}

export type ItemCategory = 'seed' | 'tool' | 'key' | 'material' | 'note' | 'resource';

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  stackable: boolean;
  /** Primary display color (hex) for placeholder icons. */
  color: number;
}

export type QuestObjective =
  | { type: 'flag'; flag: string; description: string }
  | { type: 'item'; itemId: string; count: number; description: string }
  | { type: 'unblock'; obstacleId: string; description: string }
  | { type: 'visitZone'; zoneId: string; description: string };

export interface QuestDef {
  id: string;
  title: string;
  summary: string;
  objectives: QuestObjective[];
  /** Flags set when the quest completes. */
  rewardFlags?: string[];
  rewardItems?: { itemId: string; count: number }[];
}

export interface DialogueLine {
  /** NPC id or free display name; omit for narration. */
  speaker?: string;
  text: string;
}

export interface DialogueDef {
  id: string;
  lines: DialogueLine[];
}

export interface NpcDef {
  id: string;
  name: string;
  description: string;
  /** Default dialogue shown on interaction (Wave 3 adds behavior). */
  dialogueId?: string;
  color: number;
}
