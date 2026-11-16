import Phaser from 'phaser';
import { THEME } from './theme';

const RADIUS = 23;

/**
 * Small round HUD button with a drawn icon (town map, horse). UIScene does the hit-testing
 * through `contains`, like for the quest log button, so a press never starts the joystick.
 */
export class HudButton {
  static readonly RADIUS = RADIUS;
  private readonly container: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly icon: Phaser.GameObjects.Graphics;
  private shown = false;
  private active = false;
  private enabled = true;

  constructor(
    scene: Phaser.Scene,
    private readonly drawIcon: (g: Phaser.GameObjects.Graphics, color: number) => void,
    keyHint?: string,
  ) {
    this.bg = scene.add.graphics();
    this.icon = scene.add.graphics();
    const parts: Phaser.GameObjects.GameObject[] = [this.bg, this.icon];
    if (keyHint) {
      parts.push(
        scene.add
          .text(-RADIUS - 8, 0, keyHint, { fontFamily: THEME.font, fontSize: '11px', color: THEME.creamCss })
          .setOrigin(1, 0.5),
      );
    }
    this.container = scene.add.container(0, 0, parts).setDepth(90_000).setVisible(false);
    this.redraw();
  }

  get visible(): boolean {
    return this.shown;
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setVisible(visible: boolean): void {
    if (visible === this.shown) return;
    this.shown = visible;
    this.container.setVisible(visible);
  }

  /** `active` highlights the button (e.g. while riding); `enabled: false` dims it. */
  setState(active: boolean, enabled = true): void {
    if (active === this.active && enabled === this.enabled) return;
    this.active = active;
    this.enabled = enabled;
    this.redraw();
  }

  /** True if (x, y) in CSS px hits the visible button. */
  contains(x: number, y: number): boolean {
    return this.shown && Math.hypot(x - this.container.x, y - this.container.y) <= RADIUS + 6;
  }

  private redraw(): void {
    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.25);
    this.bg.fillCircle(0, 3, RADIUS);
    this.bg.fillStyle(this.active ? THEME.sun : THEME.cream, 0.95);
    this.bg.fillCircle(0, 0, RADIUS);
    this.bg.lineStyle(3, this.active ? THEME.cream : THEME.sun, 1);
    this.bg.strokeCircle(0, 0, RADIUS - 1.5);
    this.icon.clear();
    this.drawIcon(this.icon, THEME.ink);
    this.container.setAlpha(this.enabled ? 1 : 0.5);
  }
}

/** A folded town map with a marked route. */
export function drawMapIcon(g: Phaser.GameObjects.Graphics, color: number): void {
  g.lineStyle(2, color, 1);
  g.strokeRoundedRect(-12, -9, 24, 18, 3);
  g.lineBetween(-4, -9, -4, 9);
  g.lineBetween(4, -9, 4, 9);
  g.fillStyle(THEME.sun, 1);
  g.fillCircle(-8, 3, 2.2);
  g.fillStyle(color, 1);
  g.fillCircle(0, -2, 1.3);
  g.fillCircle(8, -4, 2.2);
}

/** A horseshoe. */
export function drawHorseIcon(g: Phaser.GameObjects.Graphics, color: number): void {
  g.lineStyle(5.5, color, 1);
  g.beginPath();
  g.arc(0, -1, 8.5, Phaser.Math.DegToRad(125), Phaser.Math.DegToRad(55), false);
  g.strokePath();
  g.fillStyle(THEME.cream, 1);
  for (const deg of [170, 225, 270, 315, 10]) {
    const a = Phaser.Math.DegToRad(deg);
    g.fillCircle(Math.cos(a) * 8.5, -1 + Math.sin(a) * 8.5, 1);
  }
}

/** A hammer: build mode. */
export function drawHammerIcon(g: Phaser.GameObjects.Graphics, color: number): void {
  g.lineStyle(4, 0x8a603d, 1);
  g.lineBetween(-8, 10, 4, -3);
  g.fillStyle(color, 1);
  g.fillRoundedRect(-3, -12, 15, 8, 2);
  g.fillStyle(THEME.sun, 1);
  g.fillRect(-3, -12, 4, 8);
}
