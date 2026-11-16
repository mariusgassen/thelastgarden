import Phaser from 'phaser';
import { THEME } from './theme';
import type { SafeArea } from './viewport';

const PAD = 20;
const ROW_H = 46;

export interface MenuItem {
  label: string;
  action: () => void;
}

/** Small modal menu: a list of actions. More entries (save, export, ...) can be appended later. */
export class MenuPanel {
  private readonly backdrop: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private panelW = 260;
  private panelH = 0;
  private open = false;
  private selected = 0;
  private texts: Phaser.GameObjects.Text[] = [];

  constructor(
    scene: Phaser.Scene,
    private readonly items: MenuItem[],
    private readonly onOpenChange: (open: boolean) => void,
  ) {
    this.backdrop = scene.add.rectangle(0, 0, 10, 10, 0x000000, 0.45).setOrigin(0).setDepth(95_999).setVisible(false);
    this.bg = scene.add.graphics();
    const title = scene.add.text(PAD, PAD - 2, 'Menü', { fontFamily: THEME.font, fontSize: '20px', fontStyle: 'bold', color: THEME.sunCss });
    this.texts = items.map((item, i) =>
      scene.add.text(PAD, PAD + 38 + i * ROW_H + 10, item.label, { fontFamily: THEME.font, fontSize: '17px', color: THEME.creamCss }),
    );
    this.panel = scene.add.container(0, 0, [this.bg, title, ...this.texts]).setDepth(96_000).setVisible(false);
    this.panelH = PAD * 2 + 38 + items.length * ROW_H;
  }

  get isOpen(): boolean {
    return this.open;
  }

  layout(w: number, h: number, safe: SafeArea): void {
    this.backdrop.setSize(w, h);
    this.panelW = Math.min(300, Math.max(220, w - safe.left - safe.right - 40));
    this.panel.setPosition(safe.left + (w - safe.left - safe.right - this.panelW) / 2, safe.top + (h - safe.top - safe.bottom - this.panelH) / 2);
    this.draw();
  }

  toggle(): void {
    this.setOpen(!this.open);
  }

  setOpen(open: boolean): void {
    if (this.open === open) return;
    this.open = open;
    this.selected = 0;
    this.backdrop.setVisible(open);
    this.panel.setVisible(open);
    this.draw();
    this.onOpenChange(open);
  }

  moveSelection(dir: 1 | -1): void {
    this.selected = Phaser.Math.Clamp(this.selected + dir, 0, this.items.length - 1);
    this.draw();
  }

  confirm(): void {
    this.run(this.selected);
  }

  pointerDown(x: number, y: number): boolean {
    if (!this.open) return false;
    const lx = x - this.panel.x;
    const ly = y - this.panel.y;
    const inside = lx >= 0 && lx <= this.panelW && ly >= 0 && ly <= this.panelH;
    if (!inside || (lx >= this.panelW - 56 && ly <= 52)) {
      this.setOpen(false);
      return true;
    }
    const i = Math.floor((ly - PAD - 38) / ROW_H);
    if (i >= 0 && i < this.items.length) this.run(i);
    return true;
  }

  private run(i: number): void {
    this.setOpen(false);
    this.items[i]?.action();
  }

  private draw(): void {
    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.3);
    this.bg.fillRoundedRect(0, 6, this.panelW, this.panelH, 18);
    this.bg.fillStyle(THEME.panel, 0.97);
    this.bg.fillRoundedRect(0, 0, this.panelW, this.panelH, 18);
    this.bg.lineStyle(2, THEME.sun, 0.7);
    this.bg.strokeRoundedRect(1, 1, this.panelW - 2, this.panelH - 2, 17);
    this.bg.lineStyle(1, THEME.cream, 0.15);
    this.bg.lineBetween(PAD, PAD + 30, this.panelW - PAD, PAD + 30);
    this.items.forEach((_, i) => {
      const top = PAD + 38 + i * ROW_H;
      if (i === this.selected) {
        this.bg.fillStyle(THEME.sun, 0.18);
        this.bg.fillRoundedRect(PAD - 8, top, this.panelW - PAD * 2 + 16, ROW_H - 6, 10);
      }
    });
  }
}
