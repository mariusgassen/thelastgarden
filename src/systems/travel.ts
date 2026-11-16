/**
 * Fast travel with the town map ("Stadtplan"). No Phaser dependency.
 *
 * The player copies the plan from the map board in the greenhouse vestibule
 * (`greenhouse-hint-read`, the end of Episode 1). A stop is known once any zone of its map
 * was visited, so the map never leads anywhere the player has not walked to.
 *
 *   hasTravelMap()        true once the plan is copied
 *   getTravelStops()      every stop with `known` / `current`
 *   travelTo(mapId)       emits `fast-travel` (WorldScene changes the map); false if not possible
 */
import { MAPS } from '../world';
import { TRAVEL_STOPS, type TravelStopDef } from '../world/travel';
import { bus } from './events';
import { gameState } from './state';

export const TRAVEL_MAP_FLAG = 'greenhouse-hint-read';

export interface TravelStopState {
  stop: TravelStopDef;
  known: boolean;
  /** The player is on this stop's map right now. */
  current: boolean;
}

export function hasTravelMap(): boolean {
  return gameState.hasFlag(TRAVEL_MAP_FLAG);
}

export function isStopKnown(stop: TravelStopDef): boolean {
  return MAPS[stop.mapId]?.zones.some((zone) => gameState.hasVisitedZone(zone.id)) ?? false;
}

export function getTravelStops(): TravelStopState[] {
  const here = gameState.data.player.mapId;
  return TRAVEL_STOPS.map((stop) => ({ stop, known: isStopKnown(stop), current: stop.mapId === here }));
}

export function travelTo(mapId: string): boolean {
  const stop = TRAVEL_STOPS.find((s) => s.mapId === mapId);
  if (!hasTravelMap() || !stop || !isStopKnown(stop)) return false;
  if (stop.mapId === gameState.data.player.mapId) {
    bus.emit('toast', { text: 'Hier bist du schon.' });
    return false;
  }
  bus.emit('fast-travel', { mapId: stop.mapId, spawn: stop.spawn });
  return true;
}
