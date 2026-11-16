import { GARDEN_MAP } from './maps/garden';
import { GREENHOUSE_HEART_MAP } from './maps/greenhouseHeart';
import { GREENHOUSE_VESTIBULE_MAP } from './maps/greenhouseVestibule';
import { HILL_PATH_MAP } from './maps/hillPath';
import { MILL_INTERIOR_MAP } from './maps/millInterior';
import { OLD_MILL_MAP } from './maps/oldMill';
import { ORCHARD_MAP } from './maps/orchard';
import { ORCHARD_COTTAGE_MAP } from './maps/orchardCottage';
import { RIVER_FARMS_MAP } from './maps/riverFarms';
import { TRAMLINE_MAP } from './maps/tramline';
import { WATER_TOWER_MAP } from './maps/waterTower';
import { WORKSHOP_MAP } from './maps/workshop';
import type { BlightHeartDef, JournalPageDef, MapDef, ObstacleDef, PlantingBedDef, ResourceNodeDef } from './types';

export * from './types';
export { TILE_SIZE } from './tiles';

/** All maps by id. Register new maps here. */
export const MAPS: Record<string, MapDef> = {
  [GARDEN_MAP.id]: GARDEN_MAP,
  [WORKSHOP_MAP.id]: WORKSHOP_MAP,
  [GREENHOUSE_VESTIBULE_MAP.id]: GREENHOUSE_VESTIBULE_MAP,
  [TRAMLINE_MAP.id]: TRAMLINE_MAP,
  [WATER_TOWER_MAP.id]: WATER_TOWER_MAP,
  [GREENHOUSE_HEART_MAP.id]: GREENHOUSE_HEART_MAP,
  [HILL_PATH_MAP.id]: HILL_PATH_MAP,
  [ORCHARD_MAP.id]: ORCHARD_MAP,
  [ORCHARD_COTTAGE_MAP.id]: ORCHARD_COTTAGE_MAP,
  [OLD_MILL_MAP.id]: OLD_MILL_MAP,
  [MILL_INTERIOR_MAP.id]: MILL_INTERIOR_MAP,
  [RIVER_FARMS_MAP.id]: RIVER_FARMS_MAP,
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

type BedWithMap = PlantingBedDef & { mapId: string };

let dynamicBeds: () => BedWithMap[] = () => [];

/** Beds that exist at runtime only: the planters the player built (systems/building.ts). */
export function setDynamicBedProvider(provider: () => BedWithMap[]): void {
  dynamicBeds = provider;
}

/** Every planting bed across all maps (map data plus built planters), with the map it lives on. */
export function allPlantingBeds(): BedWithMap[] {
  return [...Object.values(MAPS).flatMap((m) => (m.plantingBeds ?? []).map((b) => ({ ...b, mapId: m.id }))), ...dynamicBeds()].flatMap(
    splitBed,
  );
}

/** A bed with `slots` becomes one planting bed per cell (the plants share the bed's area); any other bed is returned as it is. */
export function splitBed(bed: BedWithMap): BedWithMap[] {
  const { slots } = bed;
  if (!slots || slots.cols * slots.rows <= 1) return [bed];
  const w = bed.rect.w / slots.cols;
  const h = bed.rect.h / slots.rows;
  const cells: BedWithMap[] = [];
  for (let r = 0; r < slots.rows; r++)
    for (let c = 0; c < slots.cols; c++) {
      const n = r * slots.cols + c;
      cells.push({
        ...bed,
        id: n === 0 ? bed.id : `${bed.id}#${n}`,
        rect: { x: bed.rect.x + c * w, y: bed.rect.y + r * h, w, h },
        slots: undefined,
        bounds: bed.rect,
      });
    }
  return cells;
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

/** Every journal page across all maps, with the map it lives on. */
export function allJournalPages(): (JournalPageDef & { mapId: string })[] {
  return Object.values(MAPS).flatMap((m) => (m.journalPages ?? []).map((p) => ({ ...p, mapId: m.id })));
}

/** Every blight heart across all maps, with the map it lives on. */
export function allBlightHearts(): (BlightHeartDef & { mapId: string })[] {
  return Object.values(MAPS).flatMap((m) => (m.blightHearts ?? []).map((h) => ({ ...h, mapId: m.id })));
}
