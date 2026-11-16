import type { TilePoint } from './types';

/**
 * Stops on the town map (systems/travel.ts, ui/MapPanel.ts). A stop is an outdoor map plus the
 * spawn the player first reaches it by, so arriving there never skips an obstacle.
 */
export interface TravelStopDef {
  /** Also the id of the map it leads to. */
  mapId: string;
  spawn: string;
  /** Short label on the map sheet. */
  name: string;
  /** Position on the map sheet, each axis 0..1. */
  at: TilePoint;
}

export const TRAVEL_STOPS: TravelStopDef[] = [
  { mapId: 'garden', spawn: 'default', name: 'Garten', at: { x: 0.12, y: 0.72 } },
  { mapId: 'tramline', spawn: 'west', name: 'Linie 3', at: { x: 0.35, y: 0.8 } },
  { mapId: 'water-tower', spawn: 'west', name: 'Wasserturm', at: { x: 0.59, y: 0.7 } },
  { mapId: 'hill-path', spawn: 'south', name: 'Hügelpfad', at: { x: 0.44, y: 0.44 } },
  { mapId: 'orchard', spawn: 'south', name: 'Obstwiesen', at: { x: 0.6, y: 0.17 } },
  { mapId: 'old-mill', spawn: 'west', name: 'Alte Mühle', at: { x: 0.86, y: 0.28 } },
  { mapId: 'river-farms', spawn: 'north', name: 'Drei Höfe', at: { x: 0.84, y: 0.6 } },
];

/** The river on the map sheet, as a polyline in the same 0..1 space. */
export const TRAVEL_RIVER: TilePoint[] = [
  { x: 0.74, y: 0 },
  { x: 0.8, y: 0.14 },
  { x: 0.93, y: 0.3 },
  { x: 0.95, y: 0.5 },
  { x: 0.9, y: 0.7 },
  { x: 0.97, y: 1 },
];
