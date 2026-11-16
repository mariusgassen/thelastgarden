import Phaser from 'phaser';
import { prefersReducedMotion } from '../ui/viewport';
import { HorseFollowPath, type HorsePoint, pickHorseSpawn, shouldShowFollowerHorse } from './horse';
import type { Facing } from './save';

/**
 * Scene-bound follower sprite for Mohn while tamed, outdoors, and not currently mounted.
 * Follows the player's trail via HorseFollowPath without adding solid physics collision so she
 * never blocks doorways or narrow paths.
 */
export class HorseFollower {
  sprite: Phaser.GameObjects.Image | null = null;
  private path: HorseFollowPath | null = null;
  private walkTime = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly mapId: string,
    private readonly isWalkablePx: (x: number, y: number) => boolean,
  ) {}

  sync(playerX: number, playerY: number, facing: Facing, overridePos?: HorsePoint): void {
    if (!shouldShowFollowerHorse(this.mapId)) {
      this.destroy();
      return;
    }
    if (this.sprite) return;
    const pos = overridePos ?? pickHorseSpawn(playerX, playerY, facing, this.isWalkablePx);
    this.sprite = this.scene.add
      .image(pos.x, pos.y, 'mohn')
      .setOrigin(0.5, 1)
      .setFlipX(facing === 'left')
      .setDepth(pos.y - 0.5);
    this.path = new HorseFollowPath(pos.x, pos.y, facing, playerX, playerY);
    this.walkTime = 0;
  }

  update(playerX: number, playerY: number, deltaMs: number, frozen: boolean): void {
    if (!this.sprite || !this.path) return;
    const res = this.path.step(playerX, playerY, deltaMs, frozen);
    this.sprite.setPosition(res.x, res.y).setFlipX(res.facing === 'left').setDepth(res.y - 0.5);
    if (res.moving && !prefersReducedMotion()) {
      this.walkTime += deltaMs * 0.015;
      this.sprite.setAngle(Math.sin(this.walkTime) * 2.5);
      this.sprite.setScale(1, 1 + Math.abs(Math.sin(this.walkTime)) * 0.04);
    } else {
      this.walkTime = 0;
      this.sprite.setAngle(0).setScale(1, 1);
    }
  }

  destroy(): void {
    this.sprite?.destroy();
    this.sprite = null;
    this.path = null;
    this.walkTime = 0;
  }
}
