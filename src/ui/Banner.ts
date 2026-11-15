import Phaser from 'phaser';
import { THEME } from './theme';

/** Fading text pill at the top of the screen (area names, short toasts). */
export class Banner {
  private readonly container: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;
  private hideTimer: Phaser.Time.TimerEvent | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fontSize: number,
  ) {
    this.bg = scene.add.graphics();
    this.text = scene.add
      .text(0, 0, '', { fontFamily: THEME.font, fontSize: `${fontSize}px`, fontStyle: 'bold', color: THEME.creamCss })
      .setOrigin(0.5);
    this.container = scene.add.container(0, 0, [this.bg, this.text]).setAlpha(0);
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  show(message: string, durationMs = 2200): void {
    this.text.setText(message);
    const w = this.text.width + 36;
    const h = this.fontSize + 20;
    this.bg.clear();
    this.bg.fillStyle(THEME.panel, THEME.panelAlpha);
    this.bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    this.scene.tweens.killTweensOf(this.container);
    this.hideTimer?.remove();
    this.container.setAlpha(0);
    this.scene.tweens.add({ targets: this.container, alpha: 1, duration: 250 });
    this.hideTimer = this.scene.time.delayedCall(durationMs, () =>
      this.scene.tweens.add({ targets: this.container, alpha: 0, duration: 500 }),
    );
  }
}
