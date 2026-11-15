import Phaser from 'phaser';
import { THEME } from './theme';

/** Fading text pill at the top of the screen (area names, short toasts). */
export class Banner {
  private readonly container: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;
  private hideTimer: Phaser.Time.TimerEvent | null = null;
  private pillW = 0;
  private pillH: number;
  private showing = false;

  constructor(
    private readonly scene: Phaser.Scene,
    fontSize: number,
    private readonly onChange?: () => void,
  ) {
    this.pillH = fontSize + 20;
    this.bg = scene.add.graphics();
    this.text = scene.add
      .text(0, 0, '', {
        fontFamily: THEME.font,
        fontSize: `${fontSize}px`,
        fontStyle: 'bold',
        color: THEME.creamCss,
        align: 'center',
      })
      .setOrigin(0.5);
    this.container = scene.add.container(0, 0, [this.bg, this.text]).setDepth(89_000).setAlpha(0);
  }

  get width(): number {
    return this.pillW;
  }

  get height(): number {
    return this.pillH;
  }

  get isVisible(): boolean {
    return this.showing;
  }

  setMaxWidth(maxWidth: number): void {
    this.text.setWordWrapWidth(Math.max(120, maxWidth - 36), true);
    if (this.showing) this.redraw();
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  show(message: string, durationMs = 2200): void {
    this.text.setText(message);
    this.redraw();
    this.scene.tweens.killTweensOf(this.container);
    this.hideTimer?.remove();
    this.showing = true;
    this.onChange?.();
    this.container.setAlpha(0);
    this.scene.tweens.add({ targets: this.container, alpha: 1, duration: 250 });
    this.hideTimer = this.scene.time.delayedCall(durationMs, () =>
      this.scene.tweens.add({
        targets: this.container,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          this.showing = false;
          this.onChange?.();
        },
      }),
    );
  }

  private redraw(): void {
    this.pillW = this.text.width + 36;
    this.pillH = this.text.height + 20;
    this.bg.clear();
    this.bg.fillStyle(THEME.panel, THEME.panelAlpha);
    this.bg.fillRoundedRect(-this.pillW / 2, -this.pillH / 2, this.pillW, this.pillH, Math.min(this.pillH / 2, 20));
  }
}
