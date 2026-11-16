import Phaser from 'phaser';
import { inputState } from './input';
import type { Facing } from './save';

const SPEED = 140;
const RIDE_SPEED = 245;
const BOAT_SPEED = 195;
/** Feet (collision circle center) offset from the sprite's origin, in px. */
export const FEET_OFFSET_Y = 12;
/** `player-riding` texture: its hoof line, in px from the top (see world/textures.ts). */
const RIDING_HOOF_Y = 68;

type Keys = Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;

/** Player sprite + movement. Reads keyboard and the virtual joystick (inputState). */
export class PlayerController {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly keys: Keys | null;
  private walkTime = 0;
  private riding = false;
  private boating = false;
  facing: Facing;

  /** x/y = feet position in px. */
  constructor(scene: Phaser.Scene, x: number, y: number, facing: Facing) {
    this.facing = facing;
    this.shadow = scene.add.image(x, y + 4, 'shadow').setScale(0.75).setDepth(y - 1);
    this.sprite = scene.physics.add.sprite(x, y - FEET_OFFSET_Y, 'player').setDepth(y);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setCircle(8, 6, 24);
    body.setCollideWorldBounds(true);
    this.sprite.setFlipX(facing === 'left');

    const kb = scene.input.keyboard;
    this.keys = kb
      ? (kb.addKeys({
          up: Phaser.Input.Keyboard.KeyCodes.UP,
          down: Phaser.Input.Keyboard.KeyCodes.DOWN,
          left: Phaser.Input.Keyboard.KeyCodes.LEFT,
          right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
          w: Phaser.Input.Keyboard.KeyCodes.W,
          a: Phaser.Input.Keyboard.KeyCodes.A,
          s: Phaser.Input.Keyboard.KeyCodes.S,
          d: Phaser.Input.Keyboard.KeyCodes.D,
        }) as Keys)
      : null;
  }

  get isRiding(): boolean {
    return this.riding;
  }

  get isBoating(): boolean {
    return this.boating;
  }

  /**
   * Swaps between walking and riding Mohn. The sprite's origin stays FEET_OFFSET_Y above the
   * feet (or hooves) and the collision circle stays the same, so every path stays passable.
   */
  setRiding(riding: boolean): void {
    if (this.riding === riding) return;
    this.riding = riding;
    if (!this.boating) this.applyAppearance();
  }

  /** Swaps between rowing a boat on water and on-foot/riding state. */
  setBoating(boating: boolean): void {
    if (this.boating === boating) return;
    this.boating = boating;
    if (boating) this.riding = false;
    this.applyAppearance();
  }

  private applyAppearance(): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (this.boating) {
      this.sprite.setTexture('player-boating').setOrigin(0.5, 0.5);
      body.setCircle(8, this.sprite.width / 2 - 8, this.sprite.height / 2 + FEET_OFFSET_Y - 8);
      this.shadow.setScale(1.4, 0.8);
      return;
    }
    if (this.riding) {
      this.sprite.setTexture('player-riding');
      const originY = RIDING_HOOF_Y - FEET_OFFSET_Y;
      this.sprite.setOrigin(0.5, originY / this.sprite.height);
      body.setCircle(8, this.sprite.width / 2 - 8, originY + FEET_OFFSET_Y - 8);
      this.shadow.setScale(1.7, 1);
      return;
    }
    this.sprite.setTexture('player').setOrigin(0.5, 0.5);
    body.setCircle(8, 6, 24);
    this.shadow.setScale(0.75, 0.75);
  }

  get feetX(): number {
    return this.sprite.x;
  }

  get feetY(): number {
    return this.sprite.y + FEET_OFFSET_Y;
  }

  /** `speedFactor` slows the player down on heavy ground (the blight). */
  update(deltaMs: number, frozen: boolean, speedFactor = 1): void {
    let dx = 0;
    let dy = 0;
    if (!frozen) {
      const k = this.keys;
      if (k) {
        dx = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
        dy = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
      }
      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        dx /= len;
        dy /= len;
      } else {
        dx = inputState.moveX;
        dy = inputState.moveY;
      }
    }

    const base = this.boating ? BOAT_SPEED : this.riding ? RIDE_SPEED : SPEED;
    const speed = base * speedFactor;
    this.sprite.setVelocity(dx * speed, dy * speed);
    const moving = Math.hypot(dx, dy) > 0.05;
    if (dx < -0.1) this.facing = 'left';
    else if (dx > 0.1) this.facing = 'right';
    this.sprite.setFlipX(this.facing === 'left');

    if (moving) {
      this.walkTime += deltaMs * (0.012 + Math.hypot(dx, dy) * 0.006);
      this.sprite.setAngle(Math.sin(this.walkTime) * (this.boating ? 2 : this.riding ? 2.5 : 5));
      this.sprite.setScale(1, 1 + Math.abs(Math.sin(this.walkTime)) * (this.boating ? 0.03 : 0.05));
    } else {
      this.walkTime = 0;
      this.sprite.setAngle(0);
      this.sprite.setScale(1, 1);
    }

    this.sprite.setDepth(this.feetY);
    this.shadow.setPosition(this.feetX, this.feetY + 4).setDepth(this.feetY - 1);
  }
}
