import Phaser from 'phaser';
import { THEME } from './theme';

const RADIUS = 56;
const DEAD_ZONE = 0.12;

/**
 * Floating virtual joystick: appears where a touch starts, knob follows the finger.
 * Coordinates are CSS pixels (UIScene camera is zoomed by DPR).
 */
export class Joystick {
  private readonly base: Phaser.GameObjects.Arc;
  private readonly ring: Phaser.GameObjects.Arc;
  private readonly knob: Phaser.GameObjects.Arc;
  private pointerId: number | null = null;
  private originX = 0;
  private originY = 0;
  private restX = 0;
  private restY = 0;
  vectorX = 0;
  vectorY = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly showIdle: boolean,
  ) {
    this.base = scene.add.circle(0, 0, RADIUS, THEME.cream, 0.14);
    this.ring = scene.add.circle(0, 0, RADIUS).setStrokeStyle(2, THEME.cream, 0.45);
    this.knob = scene.add.circle(0, 0, 24, THEME.cream, 0.75).setStrokeStyle(2, THEME.moss, 0.5);
    this.setAlpha(this.showIdle ? 0.35 : 0);
  }

  get active(): boolean {
    return this.pointerId !== null;
  }

  /** Where the idle hint is drawn (bottom-left, inside the safe area). */
  setRestPosition(x: number, y: number): void {
    this.restX = x;
    this.restY = y;
    if (!this.active) this.moveTo(x, y, x, y);
  }

  start(pointerId: number, x: number, y: number): void {
    this.pointerId = pointerId;
    this.originX = x;
    this.originY = y;
    this.moveTo(x, y, x, y);
    this.setAlpha(1);
  }

  move(pointerId: number, x: number, y: number): void {
    if (pointerId !== this.pointerId) return;
    let dx = x - this.originX;
    let dy = y - this.originY;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      // Let the base trail the finger so direction changes stay responsive.
      this.originX = x - (dx / len) * RADIUS;
      this.originY = y - (dy / len) * RADIUS;
      dx = x - this.originX;
      dy = y - this.originY;
    }
    const mag = Math.min(1, Math.hypot(dx, dy) / RADIUS);
    if (mag < DEAD_ZONE) {
      this.vectorX = 0;
      this.vectorY = 0;
    } else {
      const scaled = (mag - DEAD_ZONE) / (1 - DEAD_ZONE);
      const a = Math.atan2(dy, dx);
      this.vectorX = Math.cos(a) * scaled;
      this.vectorY = Math.sin(a) * scaled;
    }
    this.moveTo(this.originX, this.originY, this.originX + dx, this.originY + dy);
  }

  end(pointerId: number): boolean {
    if (pointerId !== this.pointerId) return false;
    this.pointerId = null;
    this.vectorX = 0;
    this.vectorY = 0;
    this.moveTo(this.restX, this.restY, this.restX, this.restY);
    this.setAlpha(this.showIdle ? 0.35 : 0);
    return true;
  }

  private moveTo(bx: number, by: number, kx: number, ky: number): void {
    this.base.setPosition(bx, by);
    this.ring.setPosition(bx, by);
    this.knob.setPosition(kx, ky);
  }

  private setAlpha(a: number): void {
    this.base.setAlpha(a);
    this.ring.setAlpha(a);
    this.knob.setAlpha(a);
  }
}
