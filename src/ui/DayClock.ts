import Phaser from 'phaser';
import { getDayTime, type DayTimeInfo } from '../systems/dayClock';
import { THEME } from './theme';

const PILL_W = 108;
const PILL_H = 38;
const DIAL_R = 12;

function lerpColor(a: number, b: number, t: number): number {
  const x = Phaser.Math.Clamp(t, 0, 1);
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * x);
  const g = Math.round(ag + (bg - ag) * x);
  const bl = Math.round(ab + (bb - ab) * x);
  return (r << 16) | (g << 8) | bl;
}

function pickSkyColor(hour: number): number {
  const night = 0x18264d;
  const dawn = 0xe08d67;
  const day = 0x5fa8d3;
  const dusk = 0xd67458;

  if (hour >= 5 && hour < 6.2) return lerpColor(night, dawn, (hour - 5) / 1.2);
  if (hour >= 6.2 && hour < 7.5) return lerpColor(dawn, day, (hour - 6.2) / 1.3);
  if (hour >= 7.5 && hour < 18) return day;
  if (hour >= 18 && hour < 19.5) return lerpColor(day, dusk, (hour - 18) / 1.5);
  if (hour >= 19.5 && hour < 21) return lerpColor(dusk, night, (hour - 19.5) / 1.5);
  return night;
}

/**
 * Compact day/night HUD clock placed top-right beneath the quest button. Shows a dynamic
 * sun/moon sky dial alongside an approximate 24h time and German time-of-day label.
 */
export class DayClock {
  private readonly container: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly dial: Phaser.GameObjects.Graphics;
  private readonly timeText: Phaser.GameObjects.Text;
  private readonly phaseText: Phaser.GameObjects.Text;
  private lastKey = '';

  constructor(scene: Phaser.Scene) {
    this.bg = scene.add.graphics();
    this.bg.fillStyle(THEME.panel, THEME.panelAlpha * 0.85);
    this.bg.fillRoundedRect(-PILL_W, -PILL_H / 2, PILL_W + 4, PILL_H, PILL_H / 2);

    this.dial = scene.add.graphics();
    const textX = -PILL_W + 39;
    this.timeText = scene.add
      .text(textX, -6, '09:00', {
        fontFamily: THEME.font,
        fontSize: '13px',
        fontStyle: 'bold',
        color: THEME.creamCss,
      })
      .setOrigin(0, 0.5);
    this.phaseText = scene.add
      .text(textX, 7, 'Morgen', {
        fontFamily: THEME.font,
        fontSize: '11px',
        color: '#d6cfb6',
      })
      .setOrigin(0, 0.5);

    this.container = scene.add
      .container(0, 0, [this.bg, this.dial, this.timeText, this.phaseText])
      .setDepth(90_000);
    this.update();
  }

  get width(): number {
    return PILL_W;
  }

  get height(): number {
    return PILL_H;
  }

  get bottom(): number {
    return this.container.y + PILL_H / 2;
  }

  /** Right-aligned position (`x` = right edge, `y` = vertical center). */
  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  update(): void {
    const info = getDayTime();
    const step = Math.round(info.celestialProgress * 60);
    const sky = pickSkyColor(info.hour);
    const key = `${info.formattedTime}|${info.phaseLabel}|${info.isDaylight}|${step}|${sky}`;
    if (key === this.lastKey) return;
    this.lastKey = key;

    this.timeText.setText(info.formattedTime);
    this.phaseText.setText(info.phaseLabel);
    this.drawDial(info, sky);
  }

  private drawDial(info: DayTimeInfo, skyColor: number): void {
    const cx = -PILL_W + 20;
    const cy = 0;
    const g = this.dial;
    g.clear();

    // Sky circle
    g.fillStyle(skyColor, 1);
    g.fillCircle(cx, cy, DIAL_R);

    // Subtle stars at night
    if (!info.isDaylight) {
      g.fillStyle(THEME.cream, 0.8);
      g.fillCircle(cx - 5, cy - 5, 0.9);
      g.fillCircle(cx + 5, cy - 4, 0.8);
      g.fillCircle(cx + 1, cy - 7, 0.7);
    }

    // Sun or crescent moon moving along the upper arc (left = rise, top = zenith, right = set)
    const angle = Math.PI - info.celestialProgress * Math.PI;
    const arcR = 7.5;
    const bx = cx + Math.cos(angle) * arcR;
    const by = cy + 3 - Math.sin(angle) * arcR;

    if (info.isDaylight) {
      g.fillStyle(0xffd966, 0.32);
      g.fillCircle(bx, by, 4.8);
      g.fillStyle(0xffd966, 1);
      g.fillCircle(bx, by, 3.2);
      g.fillStyle(0xfff6cc, 1);
      g.fillCircle(bx, by, 1.7);
    } else {
      g.fillStyle(0xf7efd2, 1);
      g.fillCircle(bx, by, 3.2);
      g.fillStyle(skyColor, 1);
      g.fillCircle(bx + 1.4, by - 0.8, 2.6);
    }

    // Meadow horizon band clipped cleanly to the dial circle
    g.fillStyle(info.isDaylight ? 0x3b6135 : 0x1d2b24, 1);
    g.beginPath();
    g.arc(cx, cy, DIAL_R - 0.5, Phaser.Math.DegToRad(24), Phaser.Math.DegToRad(156), false);
    g.closePath();
    g.fillPath();

    // Dial ring
    g.lineStyle(1.5, info.isDaylight ? THEME.sun : 0x9eb8e8, 0.85);
    g.strokeCircle(cx, cy, DIAL_R);
  }
}
