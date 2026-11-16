/**
 * Content definitions: pure data, no Phaser, no game logic.
 * Systems look entries up by id via the registries in ./index.ts.
 */

/** Kinds of natural obstacles placed in the world (see src/world/types.ts ObstacleDef). */
export type ObstacleKind = 'bramble' | 'fallenTree' | 'tallGrass' | 'denseFog';

export interface PlantDef {
  id: string;
  name: string;
  description: string;
  /** Item id of the seed that grows this plant. */
  seedItemId?: string;
  /** Item id a mature plant regrows and yields on harvest (see systems/plants.ts harvestBed). */
  produceItemId?: string;
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
  /** Tiles around its bed a mature plant keeps free of blight; omit for the default (see systems/blight.ts). */
  wardRadius?: number;
}

export type ItemCategory = 'seed' | 'tool' | 'key' | 'material' | 'note' | 'resource' | 'produce' | 'meal';

/** What eating a meal does for a while (systems/meals.ts). */
export type MealEffect = 'swift' | 'blightproof';

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  stackable: boolean;
  /** Primary display color (hex) for placeholder icons. */
  color: number;
  /** Set on `meal` items: eaten from the bag (systems/meals.ts). */
  meal?: { effect: MealEffect; minutes: number };
}

/** A workbench recipe (content/recipes.ts, systems/crafting.ts). */
export interface RecipeDef {
  id: string;
  name: string;
  result: { itemId: string; count: number }[];
  cost: { itemId: string; count: number }[];
  /** Flag that unlocks the recipe, usually `journal-read:<pageId>`; omit for always known. */
  requiresFlag?: string;
}

/** Something the player can place on the map grid in build mode (content/buildables.ts, systems/building.ts). */
export interface BuildableDef {
  id: string;
  name: string;
  description: string;
  cost: { itemId: string; count: number }[];
  /** `water` pieces (the footbridge) go on water tiles and make them walkable; everything else needs open ground. */
  on: 'ground' | 'water';
  /** Collision box inside the tile, in tile fractions; omit for walkable pieces. */
  solid?: { x: number; y: number; w: number; h: number };
  /** Tiles (from the piece's centre) kept free of blight (systems/blight.ts). */
  wardRadius?: number;
  /** Light radius in px that opens the night veil (systems/atmosphere.ts). */
  lightRadius?: number;
  /** Holds one plant: the piece doubles as a planting bed (systems/plants.ts). */
  planter?: boolean;
  /** Resting here skips to the next morning. */
  rest?: boolean;
  /** A home for helper animals (systems/animals.ts); the animals move in on their own. */
  home?: { animal: 'bees' | 'hens' | 'goat' | 'horse' };
}

interface QuestObjectiveBase {
  description: string;
  /**
   * Interactable ids (e.g. `npc:crow`, `bed:bed-lily`, `greenhouse-door`) that get a quest
   * pin in the world while this objective is open. Ids not registered on the current map
   * are simply skipped.
   */
  markers?: string[];
}

export type QuestObjective = QuestObjectiveBase &
  (
    | { type: 'flag'; flag: string }
    | { type: 'item'; itemId: string; count: number }
    | { type: 'unblock'; obstacleId: string }
    | { type: 'visitZone'; zoneId: string }
  );

export interface QuestDef {
  id: string;
  title: string;
  summary: string;
  objectives: QuestObjective[];
  /** Start as soon as the game runs (new save or old save that never started it). */
  autoStart?: boolean;
  /** Start once ANY of these flags is set. `quest-completed:<id>` is set for every finished quest. */
  startsWhen?: string[];
  /** Flags set when the quest completes. */
  rewardFlags?: string[];
  rewardItems?: { itemId: string; count: number }[];
}

export interface DialogueChoice {
  /** Optional id; picking this choice emits `dialogue-choice` so a system can react (e.g. the seed picker). */
  id?: string;
  label: string;
  /** Optional next DialogueDef id; omit to close after applying effects. */
  nextDialogueId?: string;
  setFlags?: string[];
  giveItems?: { itemId: string; count: number }[];
  /** All of these flags must be set for this choice to appear. */
  requires?: string[];
  /** None of these flags may be set for this choice to appear. */
  forbids?: string[];
}

export interface DialogueLine {
  /** NPC id (resolved to its name + portrait) or free display name; omit for narration. */
  speaker?: string;
  text: string;
  /** Optional branching choices presented on this line. */
  choices?: DialogueChoice[];
}

export type DialogueStyle = 'speech' | 'page';

export interface DialogueDef {
  id: string;
  lines: DialogueLine[];
  /** `page` renders as a parchment note (journal pages); default is the speech panel. */
  style?: DialogueStyle;
  /** Header shown above a `page` style dialogue. */
  title?: string;
}

/** First rule whose conditions hold is the dialogue an NPC shows. */
export interface NpcDialogueRule {
  dialogueId: string;
  /** Optional: rule applies only while the player is on this map. */
  mapId?: string;
  /** All of these flags must be set. */
  requires?: string[];
  /** None of these flags may be set. */
  forbids?: string[];
  /** The player must carry all of these for the rule to apply. */
  requiresItems?: { itemId: string; count: number }[];
  /** Applied when the dialogue closes. */
  setFlags?: string[];
  giveItems?: { itemId: string; count: number }[];
  /** Removed from the inventory when the dialogue closes (pair with `requiresItems`). */
  takeItems?: { itemId: string; count: number }[];
}

export interface NpcDef {
  id: string;
  name: string;
  description: string;
  /** Evaluated top to bottom on interaction; falls back to `dialogueId`. */
  dialogues?: NpcDialogueRule[];
  /** Fallback dialogue if no rule matches. */
  dialogueId?: string;
  /** Context-button label (default "Ansprechen"). */
  interactLabel?: string;
  color: number;
}
