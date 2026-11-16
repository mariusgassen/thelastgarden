/**
 * Mohn, the horse. No Phaser dependency.
 *
 * She is befriended through `q-horse` (flag `horse-tamed`) and then travels with the player:
 * riding can be toggled on any outdoor map and makes the player faster (systems/player.ts).
 * On `MapDef.indoor` maps she waits outside; the riding choice is kept and resumes at the door.
 *
 *   hasHorse()          true once Mohn is befriended
 *   canRideHere()       false on indoor maps
 *   isRiding()          the stored choice (ext.horse.riding)
 *   isRidingHere()      what the world shows: riding and allowed on the current map
 *   toggleRiding()      mount/dismount; emits `riding-changed`
 */
import { MAPS } from '../world';
import { bus } from './events';
import { gameState } from './state';

export const HORSE_FLAG = 'horse-tamed';

interface HorseExt {
  riding: boolean;
}

export function hasHorse(): boolean {
  return gameState.hasFlag(HORSE_FLAG);
}

export function canRideOn(mapId: string): boolean {
  return !MAPS[mapId]?.indoor;
}

export function canRideHere(): boolean {
  return canRideOn(gameState.data.player.mapId);
}

export function isRiding(): boolean {
  return hasHorse() && gameState.getExt<HorseExt>('horse', { riding: false }).riding;
}

export function isRidingHere(): boolean {
  return isRiding() && canRideHere();
}

/** Returns false (with a toast where it helps) if there is no horse or the map is indoors. */
export function setRiding(riding: boolean): boolean {
  if (!hasHorse()) return false;
  if (!canRideHere()) {
    bus.emit('toast', { text: 'Mohn wartet lieber draußen.' });
    return false;
  }
  if (isRiding() === riding) return true;
  gameState.setExt<HorseExt>('horse', { riding });
  bus.emit('riding-changed', { riding });
  return true;
}

export function toggleRiding(): boolean {
  return setRiding(!isRiding());
}
