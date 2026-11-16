import Phaser from 'phaser';
import { getInventoryGroups } from '../systems/inventory';
import { THEME } from './theme';
import type { SafeArea } from './viewport';

const PANEL_MAX_W = 460;
const PAD = 20;
const CRAFT_W = 92;
const CRAFT_H = 30;

/**
 * "Beutel": a scrollable modal panel listing everything the player carries, grouped by kind.
 * With the pocket workbench it also offers a "Werkeln" button. Reads state only; opening the
 * crafting menu is delegated to the scene through `onCraft`.
 */
export class InventoryPanel {
  private readonly backdrop: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Container;
  private readonly panelBg: Phaser.GameObjects.Graphics;
  private readonly closeText: Phaser.GameObjects.Text;
  private readonly craftBg: Phaser.GameObjects.Graphics;
  private readonly craftText: Phaser.GameObjects.Text;
  private readonly list: Phaser.GameObjects.Container;
  private readonly listTop = PAD + 36;
  private panelW = 320;
  private panelH = 200;
  private listViewH = 0;
  private listContentH = 0;
  private scrollY = 0;
  private dragLastY: number | null = null;
  private viewW = 0;
  private viewH = 0;
  private safe: SafeArea = { top: 0, right: 0, bottom: 0, left: 0 };
  private open = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onOpenChange: (open: boolean) => void,
    /** True while the player owns the pocket workbench. */
    private readonly canCraft: () => boolean,
    private readonly onCraft: () => void,
  ) {
    this.backdrop = scene.add.rectangle(0, 0, 10, 10, 0x000000, 0.45).setOrigin(0).setDepth(95_999).setVisible(false);
    this.panelBg = scene.add.graphics();
    const title = scene.add.text(PAD, PAD - 2, 'Beutel', {
      fontFamily: THEME.font,
      fontSize: '20px',
      fontStyle: 'bold',
      color: THEME.sunCss,
    });
    this.closeText = scene.add
      .text(0, PAD - 6, '×', { fontFamily: THEME.font, fontSize: '28px', color: THEME.creamCss })
      .setOrigin(1, 0);
    this.craftBg = scene.add.graphics();
    this.craftText = scene.add
      .text(0, 0, 'Werkeln', { fontFamily: THEME.font, fontSize: '14px', fontStyle: 'bold', color: THEME.inkCss })
      .setOrigin(0.5);
    this.list = scene.add.container(0, 0);
    this.panel = scene.add
      .container(0, 0, [this.panelBg, title, this.closeText, this.craftBg, this.craftText, this.list])
      .setDepth(96_000)
      .setVisible(false);
  }

  get isOpen(): boolean {
    return this.open;
  }

  layout(viewW: number, viewH: number, safe: SafeArea): void {
    this.viewW = viewW;
    this.viewH = viewH;
    this.safe = safe;
    this.backdrop.setSize(viewW, viewH);
    const panelW = Math.min(PANEL_MAX_W, Math.max(240, viewW - safe.left - safe.right - 24));
    if (panelW !== this.panelW) {
      this.panelW = panelW;
      this.rebuildList();
    }
    const maxH = viewH - safe.top - safe.bottom - 36;
    this.panelH = Math.min(maxH, this.listContentH + this.listTop + PAD);
    this.listViewH = this.panelH - this.listTop - PAD;
    this.panel.setPosition(safe.left + (viewW - safe.left - safe.right - this.panelW) / 2, safe.top + 18 + (maxH - this.panelH) / 2);
    this.drawPanel();
  }

  toggle(): void {
    this.setOpen(!this.open);
  }

  setOpen(open: boolean): void {
    if (this.open === open) return;
    this.open = open;
    this.backdrop.setVisible(open);
    this.panel.setVisible(open);
    if (open) {
      this.scrollY = 0;
      this.refresh();
      this.panel.setAlpha(0).setScale(0.96);
      this.scene.tweens.add({ targets: this.panel, alpha: 1, scale: 1, duration: 160, ease: 'Back.easeOut' });
    }
    this.onOpenChange(open);
  }

  /** Rebuilds the list from the current inventory (no-op while closed). */
  refresh(): void {
    if (!this.open) return;
    this.rebuildList();
    this.layout(this.viewW, this.viewH, this.safe);
  }

  /** Pointer handling while the panel is open; returns true if consumed. */
  pointerDown(x: number, y: number): boolean {
    if (!this.open) return false;
    const lx = x - this.panel.x;
    const ly = y - this.panel.y;
    const inside = lx >= 0 && lx <= this.panelW && ly >= 0 && ly <= this.panelH;
    const onClose = lx >= this.panelW - 56 && ly <= 52;
    if (!inside || onClose) {
      this.setOpen(false);
      return true;
    }
    const c = this.craftRect();
    if (this.canCraft() && lx >= c.x - 6 && lx <= c.x + c.w + 6 && ly >= c.y - 8 && ly <= c.y + c.h + 8) {
      this.onCraft();
      return true;
    }
    this.dragLastY = y;
    return true;
  }

  pointerMove(y: number): void {
    if (!this.open || this.dragLastY === null) return;
    this.scrollBy(this.dragLastY - y);
    this.dragLastY = y;
  }

  pointerUp(): void {
    this.dragLastY = null;
  }

  scrollBy(dy: number): void {
    if (!this.open) return;
    const max = Math.max(0, this.listContentH - this.listViewH);
    this.scrollY = Phaser.Math.Clamp(this.scrollY + dy, 0, max);
    this.applyScroll();
  }

  private craftRect(): { x: number; y: number; w: number; h: number } {
    return { x: this.panelW - PAD - 44 - CRAFT_W, y: PAD - 4, w: CRAFT_W, h: CRAFT_H };
  }

  private rebuildList(): void {
    this.list.removeAll(true);
    const width = this.panelW - PAD * 2;
    let y = 0;
    const add = (text: string, style: Phaser.Types.GameObjects.Text.TextStyle, x = 0): void => {
      const t = this.scene.add.text(x, y, text, { fontFamily: THEME.font, ...style }).setWordWrapWidth(width - x, true);
      this.list.add(t);
      y += t.height;
    };

    const groups = getInventoryGroups();
    if (groups.length === 0) {
      add('Dein Beutel ist noch leer. Sammle Samen, Tau und Sonnenlicht im Garten.', { fontSize: '15px', color: THEME.creamCss });
    }
    groups.forEach((group, i) => {
      if (i > 0) y += 14;
      add(group.title, { fontSize: '13px', fontStyle: 'bold', color: THEME.sunCss });
      y += 4;
      for (const { item, count } of group.entries) {
        add(item.stackable ? `${count}×  ${item.name}` : item.name, { fontSize: '15px', fontStyle: 'bold', color: THEME.creamCss });
        add(item.description, { fontSize: '13px', color: '#d6cfb6', lineSpacing: 2 });
        y += 6;
      }
    });
    this.listContentH = y + 4;
  }

  private drawPanel(): void {
    this.panelBg.clear();
    this.panelBg.fillStyle(0x000000, 0.3);
    this.panelBg.fillRoundedRect(0, 6, this.panelW, this.panelH, 18);
    this.panelBg.fillStyle(THEME.panel, 0.97);
    this.panelBg.fillRoundedRect(0, 0, this.panelW, this.panelH, 18);
    this.panelBg.lineStyle(2, THEME.sun, 0.7);
    this.panelBg.strokeRoundedRect(1, 1, this.panelW - 2, this.panelH - 2, 17);
    this.panelBg.lineStyle(1, THEME.cream, 0.15);
    this.panelBg.lineBetween(PAD, this.listTop - 8, this.panelW - PAD, this.listTop - 8);
    this.closeText.setX(this.panelW - PAD + 6);

    const craft = this.canCraft();
    const c = this.craftRect();
    this.craftBg.clear().setVisible(craft);
    this.craftText.setVisible(craft).setPosition(c.x + c.w / 2, c.y + c.h / 2);
    if (craft) {
      this.craftBg.fillStyle(THEME.cream, 0.95);
      this.craftBg.fillRoundedRect(c.x, c.y, c.w, c.h, c.h / 2);
      this.craftBg.lineStyle(2, THEME.sun, 1);
      this.craftBg.strokeRoundedRect(c.x, c.y, c.w, c.h, c.h / 2);
    }
    this.applyScroll();
  }

  private applyScroll(): void {
    this.list.setPosition(PAD, this.listTop - this.scrollY);
    const clipTop = this.scrollY;
    const clipBottom = this.scrollY + this.listViewH;
    for (const child of this.list.list) {
      const item = child as Phaser.GameObjects.Text;
      const top = Math.max(0, clipTop - item.y);
      const bottom = Math.min(item.height, clipBottom - item.y);
      if (bottom <= top) {
        item.setVisible(false);
      } else {
        item.setVisible(true);
        if (top <= 0 && bottom >= item.height) item.setCrop();
        else item.setCrop(0, top, item.width, bottom - top);
      }
    }
  }
}
