import Phaser from 'phaser';
import type { DialogueLine } from '../content/types';
import { THEME } from './theme';

const PAD = 18;
const MAX_WIDTH = 560;

/** Bottom text panel. Linear: shows lines one after another; advance() returns false when finished. */
export class DialogueBox {
  private readonly container: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly speaker: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly more: Phaser.GameObjects.Text;
  private lines: DialogueLine[] = [];
  private index = 0;
  private width = 300;
  private height = 120;
  private viewH = 0;
  private safeBottom = 0;
  id: string | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    this.bg = scene.add.graphics();
    this.speaker = scene.add.text(PAD, PAD - 4, '', {
      fontFamily: THEME.font,
      fontSize: '13px',
      fontStyle: 'bold',
      color: THEME.sunCss,
    });
    this.body = scene.add.text(PAD, PAD + 16, '', {
      fontFamily: THEME.font,
      fontSize: '17px',
      color: THEME.creamCss,
      lineSpacing: 5,
    });
    this.more = scene.add.text(0, 0, '▾', { fontFamily: THEME.font, fontSize: '18px', color: THEME.sunCss });
    this.container = scene.add.container(0, 0, [this.bg, this.speaker, this.body, this.more]).setVisible(false);
    scene.tweens.add({ targets: this.more, y: '+=4', duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  get isOpen(): boolean {
    return this.id !== null;
  }

  layout(viewW: number, viewH: number, safeBottom: number): void {
    this.width = Math.min(MAX_WIDTH, viewW - 24);
    this.body.setWordWrapWidth(this.width - PAD * 2, true);
    this.viewH = viewH;
    this.safeBottom = safeBottom;
    this.redraw();
    this.container.setPosition((viewW - this.width) / 2, viewH - safeBottom - this.height - 16);
  }

  open(id: string, lines: DialogueLine[]): void {
    if (lines.length === 0) return;
    this.id = id;
    this.lines = lines;
    this.index = 0;
    this.container.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this.container, alpha: 1, duration: 150 });
    this.showLine();
  }

  /** Returns false when the dialogue has ended (box closed). */
  advance(): boolean {
    if (!this.isOpen) return false;
    this.index++;
    if (this.index >= this.lines.length) {
      this.close();
      return false;
    }
    this.showLine();
    return true;
  }

  close(): void {
    this.id = null;
    this.container.setVisible(false);
  }

  private showLine(): void {
    const line = this.lines[this.index];
    this.speaker.setText(line.speaker ?? '');
    this.body.setY(line.speaker ? PAD + 16 : PAD);
    this.body.setText(line.text);
    this.redraw();
    this.container.setY(this.viewH - this.safeBottom - this.height - 16);
  }

  private redraw(): void {
    this.height = Math.max(84, this.body.y + this.body.height + PAD + 6);
    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.25);
    this.bg.fillRoundedRect(0, 4, this.width, this.height, 16);
    this.bg.fillStyle(THEME.panel, THEME.panelAlpha);
    this.bg.fillRoundedRect(0, 0, this.width, this.height, 16);
    this.bg.lineStyle(2, THEME.sun, 0.6);
    this.bg.strokeRoundedRect(1, 1, this.width - 2, this.height - 2, 15);
    this.more.setPosition(this.width - PAD - 8, this.height - PAD - 14);
  }
}
