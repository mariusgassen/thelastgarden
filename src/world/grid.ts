import { TILE_FRAME_START, TILES, type TileId } from './tiles';
import type { LayoutOp, MapDef } from './types';

/** Deterministic PRNG (mulberry32) so decoration is stable between sessions. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rasterizes a map's layout ops into a grid of tile ids, indexed [row][col]. */
export function buildTileGrid(map: MapDef): TileId[][] {
  const grid: TileId[][] = Array.from({ length: map.height }, () =>
    Array.from({ length: map.width }, () => map.baseTile),
  );
  const set = (x: number, y: number, tile: TileId) => {
    if (x >= 0 && y >= 0 && x < map.width && y < map.height) grid[y][x] = tile;
  };
  for (const op of map.layout) applyOp(op, set);
  return grid;
}

function applyOp(op: LayoutOp, set: (x: number, y: number, tile: TileId) => void): void {
  switch (op.op) {
    case 'rect':
      for (let y = op.rect.y; y < op.rect.y + op.rect.h; y++)
        for (let x = op.rect.x; x < op.rect.x + op.rect.w; x++) set(x, y, op.tile);
      return;
    case 'ellipse':
      for (let y = Math.floor(op.cy - op.ry); y <= Math.ceil(op.cy + op.ry); y++)
        for (let x = Math.floor(op.cx - op.rx); x <= Math.ceil(op.cx + op.rx); x++) {
          const dx = (x + 0.5 - op.cx) / op.rx;
          const dy = (y + 0.5 - op.cy) / op.ry;
          if (dx * dx + dy * dy <= 1) set(x, y, op.tile);
        }
      return;
    case 'path': {
      const half = op.width / 2;
      for (let i = 0; i < op.points.length - 1; i++) {
        const a = op.points[i];
        const b = op.points[i + 1];
        const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 4));
        for (let s = 0; s <= steps; s++) {
          const px = a.x + ((b.x - a.x) * s) / steps;
          const py = a.y + ((b.y - a.y) * s) / steps;
          for (let y = Math.floor(py - half); y < Math.ceil(py + half); y++)
            for (let x = Math.floor(px - half); x < Math.ceil(px + half); x++) set(x, y, op.tile);
        }
      }
      return;
    }
  }
}

/** Converts tile ids into tileset frame indices, picking a stable random variant per cell. */
export function toFrameGrid(grid: TileId[][], seed: number): number[][] {
  const rnd = seededRandom(seed);
  return grid.map((row) =>
    row.map((id) => TILE_FRAME_START[id] + Math.floor(rnd() * TILES[id].variants)),
  );
}
