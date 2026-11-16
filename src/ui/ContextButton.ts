import Phaser from 'phaser';
import { THEME } from './theme';

type IconPainter = (g: Phaser.GameObjects.Graphics, color: number) => void;

const SIZE = 84;

/** Large round action button (bottom-right). Shows the focused interactable's label. */
export class ContextButton {
  readonly container: Phaser.GameObjects.Container;
  readonly hit: Phaser.GameObjects.Arc;
  private readonly label: Phaser.GameObjects.Text;
  private readonly keyHint: Phaser.GameObjects.Text;
  private readonly icon: Phaser.GameObjects.Graphics;
  private iconKey: string | null = null;
  private visible = false;

  constructor(
    private readonly scene: Phaser.Scene,
    showKeyHint: boolean,
    onPress: () => void,
  ) {
    const shadow = scene.add.circle(0, 4, SIZE / 2, 0x000000, 0.25);
    this.hit = scene.add.circle(0, 0, SIZE / 2, THEME.cream, 0.95).setStrokeStyle(4, THEME.sun, 1);
    this.label = scene.add
      .text(0, 0, '', {
        fontFamily: THEME.font,
        fontSize: '15px',
        fontStyle: 'bold',
        color: THEME.inkCss,
        align: 'center',
      })
      .setOrigin(0.5);
    this.keyHint = scene.add
      .text(0, SIZE / 2 + 14, 'E / Leertaste', {
        fontFamily: THEME.font,
        fontSize: '11px',
        color: THEME.creamCss,
      })
      .setOrigin(0.5)
      .setVisible(showKeyHint);
    this.icon = scene.add.graphics().setScale(1.9).setVisible(false);
    this.container = scene.add.container(0, 0, [shadow, this.hit, this.label, this.icon, this.keyHint]);
    this.container.setAlpha(0).setScale(0.6);

    this.hit.setInteractive({ useHandCursor: true });
    this.hit.on('pointerdown', () => {
      if (!this.visible) return;
      scene.tweens.add({ targets: this.container, scale: 0.9, duration: 70, yoyo: true });
      onPress();
    });
  }

  get radius(): number {
    return SIZE / 2;
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  /** Shows the button with a drawn icon instead of a label (the tool in hand). `key` says when the icon changed. */
  showIcon(key: string, paint: IconPainter): void {
    if (this.iconKey !== key) {
      this.iconKey = key;
      this.icon.clear();
      paint(this.icon, THEME.ink);
    }
    this.icon.setVisible(true);
    this.label.setText('');
    this.reveal();
  }

  show(label: string): void {
    this.iconKey = null;
    this.icon.setVisible(false);
    this.label.setText(label);
    for (let size = 15; size >= 10; size--) {
      this.label.setFontSize(size);
      if (this.label.width <= SIZE - 16) break;
    }
    this.reveal();
  }

  private reveal(): void {
    if (this.visible) return;
    this.visible = true;
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.add({ targets: this.container, alpha: 1, scale: 1, duration: 160, ease: 'Back.easeOut' });
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.add({ targets: this.container, alpha: 0, scale: 0.6, duration: 140, ease: 'Sine.easeIn' });
  }

  /** True if (x, y) in CSS px hits the button. */
  contains(x: number, y: number): boolean {
    return this.visible && Math.hypot(x - this.container.x, y - this.container.y) <= SIZE / 2 + 6;
  }
}
