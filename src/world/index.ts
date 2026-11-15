import { GARDEN_MAP } from './maps/garden';
import { WORKSHOP_MAP } from './maps/workshop';
import type { MapDef, ObstacleDef, PlantingBedDef, ResourceNodeDef } from './types';

export * from './types';
export { TILE_SIZE } from './tiles';

/** All maps by id. Register new maps (e.g. greenhouse interior) here. */
export const MAPS: Record<string, MapDef> = {
  [GARDEN_MAP.id]: GARDEN_MAP,
  [WORKSHOP_MAP.id]: WORKSHOP_MAP,
};

export const START_MAP_ID = GARDEN_MAP.id;

export function getMap(id: string): MapDef {
  const map = MAPS[id];
  if (!map) throw new Error(`[world] unknown map "${id}"`);
  return map;
}

/** Every obstacle across all maps, with the map it lives on. */
export function allObstacles(): (ObstacleDef & { mapId: string })[] {
  return Object.values(MAPS).flatMap((m) => m.obstacles.map((o) => ({ ...o, mapId: m.id })));
}

export function findObstacle(id: string): (ObstacleDef & { mapId: string }) | undefined {
  return allObstacles().find((o) => o.id === id);
}

/** Every planting bed across all maps, with the map it lives on. */
export function allPlantingBeds(): (PlantingBedDef & { mapId: string })[] {
  return Object.values(MAPS).flatMap((m) => (m.plantingBeds ?? []).map((b) => ({ ...b, mapId: m.id })));
}

export function findPlantingBed(id: string): (PlantingBedDef & { mapId: string }) | undefined {
  return allPlantingBeds().find((b) => b.id === id);
}

/** Every resource node across all maps, with the map it lives on. */
export function allResourceNodes(): (ResourceNodeDef & { mapId: string })[] {
  return Object.values(MAPS).flatMap((m) => (m.resourceNodes ?? []).map((n) => ({ ...n, mapId: m.id })));
}

export function findResourceNode(id: string): (ResourceNodeDef & { mapId: string }) | undefined {
  return allResourceNodes().find((n) => n.id === id);
}
