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
}

interface InteractableSpecBase {
  id: string;
  at: TilePoint;
  /** Short verb/noun shown on the context button, e.g. "Lesen", "Betreten". */
  label: string;
  /** Interaction radius in pixels (default 56). */
  radius?: number;
}

/** Shows a dialogue from content/dialogues.ts. */
export interface DialogueInteractableSpec extends InteractableSpecBase {
  type: 'dialogue';
  dialogueId: string;
}

/**
 * Moves the player to another map. If `locked` is true, the door stays shut until
 * `unlockFlag` is set in the save (`gameState.setFlag(unlockFlag, true)`).
 */
export interface DoorInteractableSpec extends InteractableSpecBase {
  type: 'door';
  target?: { mapId: string; spawn: string };
  locked?: boolean;
  unlockFlag?: string;
  lockedDialogueId?: string;
}

/** Built-in data-driven interactables. Add new variants here + a handler in systems/interaction.ts. */
export type InteractableSpec = DialogueInteractableSpec | DoorInteractableSpec;

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
  /** Named spawn points (tiles). `default` is required. */
  spawns: Record<string, TilePoint> & { default: TilePoint };
  /** Scatter decorative trees along forest edges. */
  decorate?: { trees?: boolean; flowers?: boolean; seed: number };
  /** Camera background color outside the map. */
  backgroundColor: number;
}
