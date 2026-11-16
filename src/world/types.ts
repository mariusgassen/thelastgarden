import type { ObstacleKind } from '../content/types';
import type { TileId } from './tiles';

/** All world coordinates in map definitions are in TILES (see TILE_SIZE). Fractions are allowed. */
export interface TileRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TilePoint {
  x: number;
  y: number;
}

/** Layout operations are applied in order on top of `MapDef.baseTile` to rasterize the tile grid. */
export type LayoutOp =
  | { op: 'rect'; tile: TileId; rect: TileRect }
  | { op: 'ellipse'; tile: TileId; cx: number; cy: number; rx: number; ry: number }
  /** Polyline brush; `width` in tiles. Good for winding paths. */
  | { op: 'path'; tile: TileId; points: TilePoint[]; width: number };

/** A named location. Entering it emits `area-changed` and marks it visited in the save. */
export interface ZoneDef {
  id: string;
  name: string;
  rect: TileRect;
}

/**
 * A natural obstacle blocking a path. It is solid until unblocked via `unblockPath(id)`
 * (src/systems/obstacles.ts). Unblocked ids persist in `SaveGame.world.unblockedPaths`.
 */
export interface ObstacleDef {
  id: string;
  /** What blocks the way; plant abilities match on this (PlantDef.clears). */
  blockedBy: ObstacleKind;
  /** false = permanent scenery that unblockPath() refuses to remove. */
  removable: boolean;
  /** Collision area in tiles. */
  rect: TileRect;
  name: string;
  /** Shown when the player inspects the obstacle. */
  hint: string;
}

/**
 * Prepared soil the player can plant a seed on (src/systems/plants.ts). `rect` is also the
 * bed's clickable area; its center is where the plant sprite and prompt appear.
 */
export interface PlantingBedDef {
  id: string;
  rect: TileRect;
  /** Species this bed accepts; omit to accept the first species the player owns a seed for. */
  plantId?: string;
}

/** A collectible resource or seed in the world (src/systems/resources.ts). */
export interface ResourceNodeDef {
  id: string;
  /** Item id added to the inventory on collection (content/items.ts). */
  itemId: string;
  at: TilePoint;
  label: string;
  /** ms before the node reappears after collection; omit for a one-time pickup. */
  respawnMs?: number;
  /** Own sprite (a wood pile, a scrap heap) instead of the tinted glowing orb. */
  texture?: string;
  /** Items per collection (default 1). */
  count?: number;
}

/**
 * Where the blight grows from (src/systems/blight.ts). Each night it spreads from here over
 * open ground, at most `reach` steps far, until a ward covers the heart itself.
 */
export interface BlightHeartDef {
  id: string;
  /** Whole tile coordinates. */
  at: TilePoint;
  reach: number;
}

export interface PropDef {
  /** Texture key generated in src/world/textures.ts. */
  texture: string;
  /** Anchor = bottom-center of the sprite, in tiles. */
  at: TilePoint;
  /** Optional collision box in tiles, relative to the map (not the sprite). */
  solid?: TileRect;
  scale?: number;
  flipX?: boolean;
  /** Flat on the ground (rugs, lily pads): always drawn below actors. */
  ground?: boolean;
  /** Only shown while this flag is set (re-evaluated on `flag-changed`). */
  showWhenFlag?: string;
  /** Hidden once this flag is set (re-evaluated on `flag-changed`). */
  hideWhenFlag?: string;
}

/** An NPC from content/npcs.ts standing on this map (src/systems/npcs.ts). */
export interface NpcPlacementDef {
  npcId: string;
  /** Feet position in tiles. */
  at: TilePoint;
  radius?: number;
  /** Only shown & interactable while this flag is set. */
  showWhenFlag?: string;
  /** Hidden & non-interactable once this flag is set. */
  hideWhenFlag?: string;
}

/**
 * A readable note that appears in the world once `appearsWhenFlag` is set
 * (src/systems/journal.ts). Reading it shows `dialogueId`, sets `journal-read:<id>` and
 * adds `itemId` (if given) to the inventory. Its interactable id is `journal:<id>`.
 */
export interface JournalPageDef {
  id: string;
  at: TilePoint;
  dialogueId: string;
  appearsWhenFlag: string;
  itemId?: string;
}

interface InteractableSpecBase {
  id: string;
  at: TilePoint;
  /** Short verb/noun shown on the context button, e.g. "Lesen", "Betreten". */
  label: string;
  /** Interaction radius in pixels (default 56). */
  radius?: number;
  /** Only interactable while this flag is set. */
  showWhenFlag?: string;
  /** Non-interactable once this flag is set. */
  hideWhenFlag?: string;
}

export interface DialogueVariant {
  dialogueId: string;
  requires?: string[];
  forbids?: string[];
  setFlags?: string[];
  giveItems?: { itemId: string; count: number }[];
}

/** Shows a dialogue from content/dialogues.ts. */
export interface DialogueInteractableSpec extends InteractableSpecBase {
  type: 'dialogue';
  dialogueId: string;
  /** Flag set when the dialogue is shown (e.g. for "read the notice" quest objectives). */
  setFlag?: string;
  /** Evaluated top to bottom before falling back to `dialogueId`. */
  variants?: DialogueVariant[];
}

/**
 * Moves the player to another map. If `locked` is true, the door stays shut until
 * `unlockFlag` is set in the save (`gameState.setFlag(unlockFlag, true)`). With
 * `keyItemId`, interacting while holding that item sets `unlockFlag`, consumes the key,
 * shows `unlockedDialogueId` and then walks through.
 */
export interface DoorInteractableSpec extends InteractableSpecBase {
  type: 'door';
  target?: { mapId: string; spawn: string };
  locked?: boolean;
  unlockFlag?: string;
  lockedDialogueId?: string;
  keyItemId?: string;
  unlockedDialogueId?: string;
}

/**
 * Repairs or activates something in the world by spending resource/material items once.
 */
export interface RepairInteractableSpec extends InteractableSpecBase {
  type: 'repair';
  doneFlag: string;
  cost: { itemId: string; count: number }[];
  missingDialogueId: string;
  repairedDialogueId: string;
  doneDialogueId: string;
  giveItems?: { itemId: string; count: number }[];
}

/**
 * A workbench: opens the crafting menu (systems/crafting.ts). `variants` run first, like on a
 * dialogue spec (e.g. finding the saw); `emptyDialogueId` shows while no recipe is unlocked.
 */
export interface CraftInteractableSpec extends InteractableSpecBase {
  type: 'craft';
  emptyDialogueId: string;
  variants?: DialogueVariant[];
}

/** Built-in data-driven interactables. Add new variants here + a handler in systems/interaction.ts. */
export type InteractableSpec =
  | DialogueInteractableSpec
  | DoorInteractableSpec
  | RepairInteractableSpec
  | CraftInteractableSpec;

export interface MapDef {
  id: string;
  name: string;
  /** Size in tiles. */
  width: number;
  height: number;
  baseTile: TileId;
  layout: LayoutOp[];
  zones: ZoneDef[];
  obstacles: ObstacleDef[];
  props: PropDef[];
  interactables: InteractableSpec[];
  /** Plantable soil (Wave 2). Optional: maps without it simply have no beds. */
  plantingBeds?: PlantingBedDef[];
  /** Collectible resources/seeds (Wave 2). Optional: maps without it simply have no pickups. */
  resourceNodes?: ResourceNodeDef[];
  /** NPCs standing on this map (Wave 3). */
  npcs?: NpcPlacementDef[];
  /** Flag-gated readable notes (Wave 3). */
  journalPages?: JournalPageDef[];
  /** Sources of the nightly blight; outdoor maps only. */
  blightHearts?: BlightHeartDef[];
  /** Named spawn points (tiles). `default` is required. */
  spawns: Record<string, TilePoint> & { default: TilePoint };
  /** Scatter decorative trees along forest edges. */
  decorate?: { trees?: boolean; flowers?: boolean; seed: number };
  /** Camera background color outside the map. */
  backgroundColor: number;
  /** Interior room: the horse waits outside (systems/horse.ts) and it is no fast-travel stop. */
  indoor?: boolean;
}
