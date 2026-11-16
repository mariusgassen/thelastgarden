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

export function canRideHere(mapId = gameState.data.player.mapId): boolean {
  return canRideOn(mapId);
}

export function isRiding(): boolean {
  return hasHorse() && gameState.getExt<HorseExt>('horse', { riding: false }).riding;
}

export function isRidingHere(mapId = gameState.data.player.mapId): boolean {
  return isRiding() && canRideOn(mapId);
}

/** True when Mohn should trot beside/behind the player on foot in the current map. */
export function shouldShowFollowerHorse(mapId = gameState.data.player.mapId): boolean {
  return hasHorse() && canRideOn(mapId) && !isRidingHere(mapId);
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

export interface HorsePoint {
  x: number;
  y: number;
}

export const HORSE_FOLLOW_GAP = 44;
export const HORSE_TRAIL_STEP = 12;
export const HORSE_WALK_SPEED = 148;
export const HORSE_CATCHUP_SPEED = 230;
const TRAIL_MAX_POINTS = 96;
const WAYPOINT_REACHED_PX = 8;

export interface HorseFollowStep {
  x: number;
  y: number;
  moving: boolean;
  facing: 'left' | 'right';
}

/** Picks a walkable spot near the player (behind them first) for spawning Mohn on foot. */
export function pickHorseSpawn(
  playerX: number,
  playerY: number,
  facing: 'left' | 'right',
  isWalkablePx: (x: number, y: number) => boolean,
): HorsePoint {
  const back = facing === 'left' ? 28 : -28;
  const candidates: HorsePoint[] = [
    { x: playerX + back, y: playerY },
    { x: playerX - back, y: playerY },
    { x: playerX, y: playerY + 24 },
    { x: playerX, y: playerY - 24 },
    { x: playerX, y: playerY },
  ];
  return candidates.find((p) => isWalkablePx(p.x, p.y)) ?? { x: playerX, y: playerY };
}

/**
 * Pure breadcrumb-based path follower so Mohn follows the player's footsteps around walls,
 * across narrow bridges, and stops cleanly at a comfortable distance beside them.
 */
export class HorseFollowPath {
  x: number;
  y: number;
  facing: 'left' | 'right';
  private trail: HorsePoint[] = [];
  private lastSampleX: number;
  private lastSampleY: number;

  constructor(x: number, y: number, facing: 'left' | 'right', playerX: number, playerY: number) {
    this.x = x;
    this.y = y;
    this.facing = facing;
    this.lastSampleX = playerX;
    this.lastSampleY = playerY;
  }

  step(playerX: number, playerY: number, deltaMs: number, frozen: boolean): HorseFollowStep {
    if (frozen || deltaMs <= 0) {
      return { x: this.x, y: this.y, moving: false, facing: this.facing };
    }

    const movedFromSample = Math.hypot(playerX - this.lastSampleX, playerY - this.lastSampleY);
    if (movedFromSample > 240) {
      this.trail = [];
      this.lastSampleX = playerX;
      this.lastSampleY = playerY;
    } else if (movedFromSample >= HORSE_TRAIL_STEP) {
      this.trail.push({ x: playerX, y: playerY });
      if (this.trail.length > TRAIL_MAX_POINTS) this.trail.shift();
      this.lastSampleX = playerX;
      this.lastSampleY = playerY;
    }

    const directDist = Math.hypot(playerX - this.x, playerY - this.y);
    if (directDist <= HORSE_FOLLOW_GAP) {
      this.trail = [];
      this.lastSampleX = playerX;
      this.lastSampleY = playerY;
      const dx = playerX - this.x;
      if (Math.abs(dx) > 10) this.facing = dx < 0 ? 'left' : 'right';
      return { x: this.x, y: this.y, moving: false, facing: this.facing };
    }

    while (this.trail.length > 0 && Math.hypot(this.trail[0].x - this.x, this.trail[0].y - this.y) <= WAYPOINT_REACHED_PX) {
      this.trail.shift();
    }

    const speed = Math.min(HORSE_CATCHUP_SPEED, HORSE_WALK_SPEED + Math.max(0, directDist - 72) * 0.85);
    let budget = (speed * deltaMs) / 1000;
    const prevX = this.x;
    const prevY = this.y;

    while (budget > 0.01) {
      const remainingDirect = Math.hypot(playerX - this.x, playerY - this.y);
      if (remainingDirect <= HORSE_FOLLOW_GAP) {
        this.trail = [];
        break;
      }
      const target = this.trail[0] ?? { x: playerX, y: playerY };
      const tx = target.x - this.x;
      const ty = target.y - this.y;
      const dist = Math.hypot(tx, ty);
      if (dist <= 0.01) {
        if (this.trail.length > 0) this.trail.shift();
        else break;
        continue;
      }
      if (this.trail.length === 0) {
        const move = Math.min(budget, Math.max(0, remainingDirect - HORSE_FOLLOW_GAP));
        if (move <= 0.01) break;
        this.x += (tx / dist) * move;
        this.y += (ty / dist) * move;
        break;
      }
      if (dist <= budget) {
        this.x = target.x;
        this.y = target.y;
        this.trail.shift();
        budget -= dist;
      } else {
        this.x += (tx / dist) * budget;
        this.y += (ty / dist) * budget;
        budget = 0;
      }
    }

    const movedX = this.x - prevX;
    const movedY = this.y - prevY;
    const moving = Math.hypot(movedX, movedY) > 0.05;
    if (Math.abs(movedX) > 0.1) this.facing = movedX < 0 ? 'left' : 'right';

    return { x: this.x, y: this.y, moving, facing: this.facing };
  }
}
