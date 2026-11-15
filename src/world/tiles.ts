export const TILE_SIZE = 32;
/** Tileset strip padding (frames are extruded by 1px to avoid seams). */
export const TILESET_MARGIN = 1;
export const TILESET_SPACING = 2;

export interface TileDef {
  /** Base fill color. */
  color: number;
  /** Secondary color used for texture detail. */
  detail: number;
  solid: boolean;
  /** Visual style used by the tileset generator. */
  style: 'grass' | 'canopy' | 'dirt' | 'stone' | 'water' | 'glass' | 'planks' | 'wall' | 'asphalt' | 'soil' | 'rails' | 'brick';
  /** Number of visual variants (randomly chosen per cell). */
  variants: number;
}

/** Order defines tileset layout; never reorder without regenerating — append new tiles at the end. */
export const TILES = {
  forest: { color: 0x2c4a2a, detail: 0x3d6337, solid: true, style: 'canopy', variants: 3 },
  grass: { color: 0x7fa65a, detail: 0x93bb6a, solid: false, style: 'grass', variants: 3 },
  wildGrass: { color: 0x6b9449, detail: 0x88ad5c, solid: false, style: 'grass', variants: 3 },
  path: { color: 0xc2a477, detail: 0xb08f62, solid: false, style: 'dirt', variants: 2 },
  overgrownPath: { color: 0xa69a63, detail: 0x7d9a4c, solid: false, style: 'dirt', variants: 2 },
  paving: { color: 0xb9b2a3, detail: 0xa39c8e, solid: false, style: 'stone', variants: 2 },
  road: { color: 0x6f6f6c, detail: 0x7d7d79, solid: false, style: 'asphalt', variants: 2 },
  water: { color: 0x4f8fa6, detail: 0x6fb0c4, solid: true, style: 'water', variants: 2 },
  soil: { color: 0x7a5a3c, detail: 0x6a4c31, solid: false, style: 'soil', variants: 2 },
  greenhouse: { color: 0xa9d3cf, detail: 0xe7f4ef, solid: true, style: 'glass', variants: 1 },
  hutWall: { color: 0x8a5a3b, detail: 0x6e4529, solid: true, style: 'planks', variants: 1 },
  woodWall: { color: 0x5e3d29, detail: 0x4b2f1f, solid: true, style: 'wall', variants: 1 },
  floor: { color: 0xb88a5a, detail: 0xa47849, solid: false, style: 'planks', variants: 2 },
  rails: { color: 0x8d836f, detail: 0x5c4734, solid: false, style: 'rails', variants: 2 },
  brickWall: { color: 0x7d4537, detail: 0x5c3026, solid: true, style: 'brick', variants: 1 },
} satisfies Record<string, TileDef>;

export type TileId = keyof typeof TILES;

export const TILE_IDS = Object.keys(TILES) as TileId[];

/** First tileset frame index of each tile id (variants follow consecutively). */
export const TILE_FRAME_START: Record<TileId, number> = (() => {
  const out = {} as Record<TileId, number>;
  let i = 0;
  for (const id of TILE_IDS) {
    out[id] = i;
    i += TILES[id].variants;
  }
  return out;
})();

export const TILESET_FRAME_COUNT = TILE_IDS.reduce((n, id) => n + TILES[id].variants, 0);

export const SOLID_FRAMES: number[] = TILE_IDS.filter((id) => TILES[id].solid).flatMap((id) =>
  Array.from({ length: TILES[id].variants }, (_, v) => TILE_FRAME_START[id] + v),
);
