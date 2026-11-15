import Phaser from 'phaser';
import { content } from '../content';
import type { DialogueLine, DialogueStyle } from '../content/types';
import { THEME } from './theme';

const PAD = 20;
const MAX_WIDTH = 620;
const PORTRAIT = 60;
const PAGE_FONT = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';

interface Palette {
  fill: number;
  fillAlpha: number;
  stroke: number;
  text: string;
  accent: string;
  muted: string;
}

const PALETTES: Record<DialogueStyle, Palette> = {
  speech: { fill: THEME.panel, fillAlpha: 0.94, stroke: THEME.sun, text: THEME.creamCss, accent: THEME.sunCss, muted: '#c9c2a8' },
  page: { fill: 0xf1e6c8, fillAlpha: 0.97, stroke: 0x8a603d, text: THEME.inkCss, accent: '#6e4529', muted: '#8a7a5c' },
};

/**
 * Large bottom dialogue panel. Linear sequencing: one line at a time, `advance()` returns
 * false once the last line was dismissed. `speech` style shows a speaker name and, if the
 * speaker is an NPC with a `portrait-<id>` texture, its portrait; `page` style renders a
 * parchment note with a title (journal pages).
 */
export class DialoguePanel {
  private readonly container: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly portrait: Phaser.GameObjects.Image;
  private readonly header: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly progress: Phaser.GameObjects.Text;
  private readonly next: Phaser.GameObjects.Text;
  private lines: DialogueLine[] = [];
  private index = 0;
  private style: DialogueStyle = 'speech';
  private title?: string;
  private width = 320;
  private height = 120;
  private viewW = 0;
  private viewH = 0;
  private safeBottom = 0;
  private safeLeft = 0;
  private safeRight = 0;
  id: string | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly touch: boolean,
  ) {
    this.bg = scene.add.graphics();
    this.portrait = scene.add.image(PAD, PAD, 'portrait-crow').setOrigin(0).setDisplaySize(PORTRAIT, PORTRAIT).setVisible(false);
    this.header = scene.add.text(0, 0, '', { fontFamily: THEME.font, fontSize: '14px', fontStyle: 'bold' });
    this.body = scene.add.text(0, 0, '', { fontFamily: THEME.font, fontSize: '19px', lineSpacing: 7 });
    this.progress = scene.add.text(0, 0, '', { fontFamily: THEME.font, fontSize: '12px' });
    this.next = scene.add.text(0, 0, '', { fontFamily: THEME.font, fontSize: '13px', fontStyle: 'bold' }).setOrigin(1, 0);
    this.container = scene.add
      .container(0, 0, [this.bg, this.portrait, this.header, this.body, this.progress, this.next])
      .setDepth(95_000)
      .setVisible(false);
    scene.tweens.add({ targets: this.next, alpha: 0.55, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  get isOpen(): boolean {
    return this.id !== null;
  }

  layout(viewW: number, viewH: number, safeBottom: number, safeLeft = 0, safeRight = 0): void {
    this.viewW = viewW;
    this.viewH = viewH;
    this.safeBottom = safeBottom;
    this.safeLeft = safeLeft;
    this.safeRight = safeRight;
    this.width = Math.max(220, Math.min(MAX_WIDTH, viewW - safeLeft - safeRight - 24));
    if (this.isOpen) this.showLine(false);
  }

  open(id: string, lines: DialogueLine[], style: DialogueStyle = 'speech', title?: string): void {
    if (lines.length === 0) return;
    this.id = id;
    this.lines = lines;
    this.index = 0;
    this.style = style;
    this.title = title;
    this.container.setVisible(true).setAlpha(0).setY(this.container.y + 12);
    this.scene.tweens.add({ targets: this.container, alpha: 1, y: '-=12', duration: 180, ease: 'Sine.easeOut' });
    this.showLine(false);
  }

  /** Returns false when the dialogue has ended (panel closed). */
  advance(): boolean {
    if (!this.isOpen) return false;
    this.index++;
    if (this.index >= this.lines.length) {
      this.close();
      return false;
    }
    this.showLine(true);
    return true;
  }

  close(): void {
    this.id = null;
    this.container.setVisible(false);
  }

  private showLine(animate: boolean): void {
    const line = this.lines[this.index];
    const pal = PALETTES[this.style];
    const isPage = this.style === 'page';

    // Speaker → NPC name + portrait, if known.
    const npc = line.speaker ? content.npcs.find(line.speaker) : undefined;
    const portraitKey = npc && this.scene.textures.exists(`portrait-${npc.id}`) ? `portrait-${npc.id}` : null;
    const headerText = isPage ? (this.title ?? '').toUpperCase() : (npc?.name ?? line.speaker ?? '');

    this.portrait.setVisible(portraitKey !== null);
    if (portraitKey) this.portrait.setTexture(portraitKey).setDisplaySize(PORTRAIT, PORTRAIT);
    const textX = PAD + (portraitKey ? PORTRAIT + 16 : 0);

    this.header.setText(headerText).setColor(pal.accent).setPosition(textX, PAD - 2);
    this.header.setFontFamily(isPage ? PAGE_FONT : THEME.font).setLetterSpacing(isPage ? 1.5 : 0);
    const bodyY = headerText ? PAD + 20 : PAD;
    this.body
      .setFontFamily(isPage ? PAGE_FONT : THEME.font)
      .setFontStyle(isPage ? 'italic' : 'normal')
      .setFontSize(isPage ? 18 : 19)
      .setColor(pal.text)
      .setWordWrapWidth(this.width - PAD - textX, true)
      .setPosition(textX, bodyY)
      .setText(line.text);

    const contentBottom = Math.max(this.body.y + this.body.height, portraitKey ? PAD + PORTRAIT : 0);
    this.height = Math.max(112, contentBottom + PAD + 20);

    const last = this.index === this.lines.length - 1;
    this.progress.setText(`${this.index + 1} / ${this.lines.length}`).setColor(pal.muted).setPosition(PAD, this.height - PAD - 6);
    const hint = this.touch ? '' : '  (E)';
    this.next
      .setText((last ? 'Schließen' : 'Weiter ▸') + hint)
      .setColor(pal.accent)
      .setPosition(this.width - PAD, this.height - PAD - 7);

    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.28);
    this.bg.fillRoundedRect(0, 5, this.width, this.height, 18);
    this.bg.fillStyle(pal.fill, pal.fillAlpha);
    this.bg.fillRoundedRect(0, 0, this.width, this.height, 18);
    this.bg.lineStyle(2, pal.stroke, isPage ? 0.9 : 0.7);
    this.bg.strokeRoundedRect(1, 1, this.width - 2, this.height - 2, 17);
    if (isPage) {
      this.bg.lineStyle(1, pal.stroke, 0.35);
      this.bg.strokeRoundedRect(7, 7, this.width - 14, this.height - 14, 12);
    }

    const centerX = this.safeLeft + (this.viewW - this.safeLeft - this.safeRight - this.width) / 2;
    this.container.setPosition(centerX, this.viewH - this.safeBottom - this.height - 18);
    if (animate) {
      this.body.setAlpha(0);
      this.scene.tweens.add({ targets: this.body, alpha: 1, duration: 140 });
    }
  }
}
