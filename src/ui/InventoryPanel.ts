import Phaser from 'phaser';
import type { ItemDef } from '../content/types';
import { getInventoryGroups } from '../systems/inventory';
import { itemTextureKey } from '../world/textures';
import { THEME } from './theme';
import type { SafeArea } from './viewport';

const PANEL_MAX_W = 460;
const PAD = 20;
const LIST_TOP = PAD + 36;
const CRAFT_W = 92;
const CRAFT_H = 30;
const EAT_W = 66;
const SLOT_GAP = 8;
const PREVIEW_SIZE = 46;
const DRAG_THRESHOLD_PX = 6;

interface SlotEntry {
  item: ItemDef;
  count: number;
  x: number;
  y: number;
  size: number;
  row: number;
  col: number;
  bg: Phaser.GameObjects.Image;
}

interface ClipItem {
  obj: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
  topY: number;
  height: number;
}

/**
 * "Beutel": an icon-grid modal panel showing everything the player carries with count badges
 * and a compact bottom detail bar for the selected item. With the pocket workbench it also
 * offers a "Werkeln" button. Reads state only; crafting is delegated through `onCraft`.
 */
export class InventoryPanel {
  private readonly backdrop: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Container;
  private readonly panelBg: Phaser.GameObjects.Graphics;
  private readonly closeText: Phaser.GameObjects.Text;
  private readonly craftBg: Phaser.GameObjects.Graphics;
  private readonly craftText: Phaser.GameObjects.Text;
  private readonly list: Phaser.GameObjects.Container;
  private readonly footer: Phaser.GameObjects.Container;
  private readonly previewBg: Phaser.GameObjects.Image;
  private readonly previewIcon: Phaser.GameObjects.Image;
  private readonly eatBg: Phaser.GameObjects.Graphics;
  private readonly eatText: Phaser.GameObjects.Text;
  private readonly detailTitle: Phaser.GameObjects.Text;
  private readonly detailDesc: Phaser.GameObjects.Text;

  private slots: SlotEntry[] = [];
  private clipItems: ClipItem[] = [];
  private selectedId: string | null = null;
  private panelW = 320;
  private panelH = 200;
  private footerH = 0;
  private listViewH = 0;
  private listContentH = 0;
  private scrollY = 0;
  private dragStartY = 0;
  private dragLastY: number | null = null;
  private dragMoved = false;
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
    /** Eats the meal with this item id (systems/meals.ts). */
    private readonly onEat: (itemId: string) => void,
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
    this.eatBg = scene.add.graphics();
    this.eatText = scene.add
      .text(0, 0, 'Essen', { fontFamily: THEME.font, fontSize: '14px', fontStyle: 'bold', color: THEME.inkCss })
      .setOrigin(0.5);
    this.list = scene.add.container(0, 0);

    this.previewBg = scene.add.image(PAD, 12, 'ui-slot').setOrigin(0).setDisplaySize(PREVIEW_SIZE, PREVIEW_SIZE);
    this.previewIcon = scene.add
      .image(PAD + PREVIEW_SIZE / 2, 12 + PREVIEW_SIZE / 2, 'item-fallback')
      .setOrigin(0.5)
      .setDisplaySize(32, 32);
    this.detailTitle = scene.add.text(PAD + PREVIEW_SIZE + 12, 11, '', {
      fontFamily: THEME.font,
      fontSize: '15px',
      fontStyle: 'bold',
      color: THEME.sunCss,
    });
    this.detailDesc = scene.add.text(PAD + PREVIEW_SIZE + 12, 31, '', {
      fontFamily: THEME.font,
      fontSize: '12px',
      color: '#d6cfb6',
      lineSpacing: 2,
    });
    this.footer = scene.add
      .container(0, 0, [this.previewBg, this.previewIcon, this.detailTitle, this.detailDesc])
      .setVisible(false);

    this.panel = scene.add
      .container(0, 0, [this.panelBg, title, this.closeText, this.craftBg, this.craftText, this.eatBg, this.eatText, this.list, this.footer])
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
    } else {
      this.updateFooter();
    }
    const maxH = viewH - safe.top - safe.bottom - 36;
    const minListH = Math.min(this.listContentH, 120);
    this.panelH = Math.min(maxH, Math.max(LIST_TOP + minListH + this.footerH, this.listContentH + LIST_TOP + this.footerH));
    this.listViewH = Math.max(40, this.panelH - LIST_TOP - this.footerH);
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, Math.max(0, this.listContentH - this.listViewH));
    this.panel.setPosition(
      safe.left + (viewW - safe.left - safe.right - this.panelW) / 2,
      safe.top + 18 + (maxH - this.panelH) / 2,
    );
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
      if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        this.panel.setAlpha(0).setScale(0.96);
        this.scene.tweens.add({ targets: this.panel, alpha: 1, scale: 1, duration: 160, ease: 'Back.easeOut' });
      } else {
        this.panel.setAlpha(1).setScale(1);
      }
    }
    this.onOpenChange(open);
  }

  /** Rebuilds the grid from the current inventory (no-op while closed). */
  refresh(): void {
    if (!this.open) return;
    this.rebuildList();
    this.layout(this.viewW, this.viewH, this.safe);
  }

  /** Keyboard navigation across the icon grid. */
  moveSelection(dx: number, dy: number): void {
    if (!this.open || this.slots.length === 0) return;
    const curIdx = Math.max(
      0,
      this.slots.findIndex((s) => s.item.id === this.selectedId),
    );
    const cur = this.slots[curIdx];
    let nextIdx = curIdx;
    if (dx !== 0) {
      nextIdx = (curIdx + dx + this.slots.length) % this.slots.length;
    } else if (dy !== 0) {
      const targetRow = cur.row + dy;
      const rowSlots = this.slots.filter((s) => s.row === targetRow);
      if (rowSlots.length > 0) {
        const best = rowSlots.reduce((a, b) => (Math.abs(b.col - cur.col) < Math.abs(a.col - cur.col) ? b : a));
        nextIdx = this.slots.indexOf(best);
      } else {
        nextIdx = dy > 0 ? 0 : this.slots.length - 1;
      }
    }
    this.selectSlot(this.slots[nextIdx]);
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
    const e = this.eatRect();
    if (this.selectedMealId() && lx >= e.x - 6 && lx <= e.x + e.w + 6 && ly >= e.y - 8 && ly <= e.y + e.h + 8) {
      this.eatSelected();
      return true;
    }
    this.dragStartY = y;
    this.dragLastY = y;
    this.dragMoved = false;
    return true;
  }

  /** Eats the selected meal, if one is selected. */
  eatSelected(): void {
    const id = this.selectedMealId();
    if (!id) return;
    this.onEat(id);
    this.refresh();
  }

  private selectedMealId(): string | null {
    const item = this.slots.find((s) => s.item.id === this.selectedId)?.item;
    return item?.meal ? item.id : null;
  }

  private eatRect(): { x: number; y: number; w: number; h: number } {
    const c = this.craftRect();
    return { x: (this.canCraft() ? c.x - 8 : c.x + c.w) - EAT_W, y: c.y, w: EAT_W, h: c.h };
  }

  pointerMove(y: number): void {
    if (!this.open || this.dragLastY === null) return;
    if (Math.abs(y - this.dragStartY) > DRAG_THRESHOLD_PX) this.dragMoved = true;
    this.scrollBy(this.dragLastY - y);
    this.dragLastY = y;
  }

  pointerUp(x?: number, y?: number): void {
    if (this.open && this.dragLastY !== null && !this.dragMoved && x !== undefined && y !== undefined) {
      this.trySelectAt(x, y);
    }
    this.dragLastY = null;
    this.dragMoved = false;
  }

  scrollBy(dy: number): void {
    if (!this.open) return;
    const max = Math.max(0, this.listContentH - this.listViewH);
    this.scrollY = Phaser.Math.Clamp(this.scrollY + dy, 0, max);
    this.applyScroll();
  }

  private trySelectAt(cssX: number, cssY: number): void {
    const lx = cssX - this.panel.x - PAD;
    const ly = cssY - this.panel.y - LIST_TOP;
    if (ly < 0 || ly > this.listViewH) return;
    const gy = ly + this.scrollY;
    const hit = this.slots.find((s) => lx >= s.x && lx <= s.x + s.size && gy >= s.y && gy <= s.y + s.size);
    if (hit) this.selectSlot(hit);
  }

  private selectSlot(slot: SlotEntry): void {
    if (this.selectedId === slot.item.id) return;
    this.selectedId = slot.item.id;
    for (const s of this.slots) {
      s.bg.setTexture(s.item.id === this.selectedId ? 'ui-slot-selected' : 'ui-slot');
    }
    // Keep selected slot inside the visible scroll viewport
    if (slot.y < this.scrollY) this.scrollY = slot.y;
    else if (slot.y + slot.size > this.scrollY + this.listViewH) {
      this.scrollY = slot.y + slot.size - this.listViewH;
    }
    this.layout(this.viewW, this.viewH, this.safe);
  }

  private craftRect(): { x: number; y: number; w: number; h: number } {
    return { x: this.panelW - PAD - 44 - CRAFT_W, y: PAD - 4, w: CRAFT_W, h: CRAFT_H };
  }

  private iconKey(itemId: string): string {
    const key = itemTextureKey(itemId);
    return this.scene.textures.exists(key) ? key : 'item-fallback';
  }

  private rebuildList(): void {
    this.list.removeAll(true);
    this.slots = [];
    this.clipItems = [];

    const innerW = this.panelW - PAD * 2;
    const groups = getInventoryGroups();

    if (groups.length === 0) {
      this.selectedId = null;
      const empty = this.scene.add
        .text(0, 6, 'Dein Beutel ist noch leer. Sammle Samen, Tau und Sonnenlicht im Garten.', {
          fontFamily: THEME.font,
          fontSize: '15px',
          color: THEME.creamCss,
        })
        .setWordWrapWidth(innerW, true);
      this.list.add(empty);
      this.clipItems.push({ obj: empty, topY: 6, height: empty.height });
      this.listContentH = Math.ceil(empty.height) + 18;
      this.updateFooter();
      return;
    }

    const allIds = groups.flatMap((g) => g.entries.map((e) => e.item.id));
    if (!this.selectedId || !allIds.includes(this.selectedId)) {
      this.selectedId = allIds[0];
    }

    const cols = innerW >= 360 ? 6 : 5;
    const slotSize = Math.floor((innerW - (cols - 1) * SLOT_GAP) / cols);
    const iconSize = Math.min(38, Math.round(slotSize * 0.64));

    let y = 0;
    let rowBase = 0;

    groups.forEach((group, gi) => {
      if (gi > 0) y += 10;
      const header = this.scene.add.text(0, y, group.title.toUpperCase(), {
        fontFamily: THEME.font,
        fontSize: '11px',
        fontStyle: 'bold',
        color: THEME.sunCss,
      });
      header.setAlpha(0.85);
      this.list.add(header);
      this.clipItems.push({ obj: header, topY: y, height: header.height });
      y += Math.ceil(header.height) + 5;

      group.entries.forEach(({ item, count }, idx) => {
        const col = idx % cols;
        const row = rowBase + Math.floor(idx / cols);
        const sx = col * (slotSize + SLOT_GAP);
        const sy = y + Math.floor(idx / cols) * (slotSize + SLOT_GAP);

        const selected = item.id === this.selectedId;
        const bg = this.scene.add
          .image(sx, sy, selected ? 'ui-slot-selected' : 'ui-slot')
          .setOrigin(0)
          .setDisplaySize(slotSize, slotSize);
        const icon = this.scene.add
          .image(sx + slotSize / 2, sy + slotSize / 2, this.iconKey(item.id))
          .setOrigin(0.5)
          .setDisplaySize(iconSize, iconSize);

        this.list.add([bg, icon]);
        this.clipItems.push(
          { obj: bg, topY: sy, height: slotSize },
          { obj: icon, topY: sy + (slotSize - iconSize) / 2, height: iconSize },
        );

        if (item.stackable || count > 1) {
          const badge = this.scene.add
            .text(sx + slotSize - 4, sy + slotSize - 3, String(count), {
              fontFamily: THEME.font,
              fontSize: '12px',
              fontStyle: 'bold',
              color: THEME.creamCss,
              stroke: '#151e13',
              strokeThickness: 3,
            })
            .setOrigin(1, 1);
          this.list.add(badge);
          this.clipItems.push({ obj: badge, topY: sy + slotSize - 3 - badge.height, height: badge.height });
        }

        this.slots.push({ item, count, x: sx, y: sy, size: slotSize, row, col, bg });
      });

      const rowsUsed = Math.ceil(group.entries.length / cols);
      rowBase += rowsUsed;
      y += rowsUsed * (slotSize + SLOT_GAP) - SLOT_GAP;
    });

    this.listContentH = y + 10;
    this.updateFooter();
  }

  private updateFooter(): void {
    const entry = this.slots.find((s) => s.item.id === this.selectedId);
    if (!entry) {
      this.footer.setVisible(false);
      this.footerH = PAD / 2;
      return;
    }
    this.footer.setVisible(true);
    const { item, count } = entry;
    const textX = PAD + PREVIEW_SIZE + 12;
    const textW = Math.max(100, this.panelW - PAD - textX);
    this.previewIcon.setTexture(this.iconKey(item.id));
    this.detailTitle
      .setPosition(textX, 11)
      .setWordWrapWidth(textW, true)
      .setText(item.stackable ? `${item.name}  ·  ${count}×` : item.name);
    const descY = 11 + Math.ceil(this.detailTitle.height) + 3;
    this.detailDesc.setPosition(textX, descY).setWordWrapWidth(textW, true).setText(item.description);
    this.footerH = Math.max(PREVIEW_SIZE + 26, descY + Math.ceil(this.detailDesc.height) + 14);
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
    this.panelBg.lineBetween(PAD, LIST_TOP - 8, this.panelW - PAD, LIST_TOP - 8);
    if (this.footer.visible) {
      const footerY = this.panelH - this.footerH;
      this.panelBg.lineBetween(PAD, footerY, this.panelW - PAD, footerY);
      this.footer.setPosition(0, footerY);
    }
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
    const eat = this.selectedMealId() !== null;
    const e = this.eatRect();
    this.eatBg.clear().setVisible(eat);
    this.eatText.setVisible(eat).setPosition(e.x + e.w / 2, e.y + e.h / 2);
    if (eat) {
      this.eatBg.fillStyle(THEME.sun, 0.95);
      this.eatBg.fillRoundedRect(e.x, e.y, e.w, e.h, e.h / 2);
      this.eatBg.lineStyle(2, THEME.cream, 1);
      this.eatBg.strokeRoundedRect(e.x, e.y, e.w, e.h, e.h / 2);
    }
    this.applyScroll();
  }

  private applyScroll(): void {
    this.list.setPosition(PAD, LIST_TOP - this.scrollY);
    const clipTop = this.scrollY;
    const clipBottom = this.scrollY + this.listViewH;
    for (const { obj, topY, height } of this.clipItems) {
      const top = Math.max(0, clipTop - topY);
      const bottom = Math.min(height, clipBottom - topY);
      if (bottom <= top) {
        obj.setVisible(false);
      } else {
        obj.setVisible(true);
        if (top <= 0 && bottom >= height) obj.setCrop();
        else obj.setCrop(0, top / obj.scaleY, obj.width, (bottom - top) / obj.scaleY);
      }
    }
  }
}
