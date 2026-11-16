import Phaser from 'phaser';
import { getWikiSections, type WikiEntry } from '../systems/wiki';
import { THEME } from './theme';
import type { SafeArea } from './viewport';

const PANEL_MAX_W = 460;
const PAD = 20;
const DRAG_THRESHOLD_PX = 8;
const BACK = '__back';

interface Row {
  /** Entry key, or BACK. */
  key: string;
  top: number;
  height: number;
}

/**
 * "Almanach": modal panel listing every wiki entry by section (systems/wiki.ts), with a
 * detail view per entry. Entries the player has not discovered yet show as "???". Reads only;
 * rebuilds its list whenever it opens.
 */
export class WikiPanel {
  private readonly backdrop: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Container;
  private readonly panelBg: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly closeText: Phaser.GameObjects.Text;
  private readonly list: Phaser.GameObjects.Container;
  private panelW = 320;
  private panelH = 200;
  private listTop = 0;
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
  private detail: string | null = null;
  private selected: string | null = null;
  private rows: Row[] = [];
  private order: string[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onOpenChange: (open: boolean) => void,
  ) {
    this.backdrop = scene.add.rectangle(0, 0, 10, 10, 0x000000, 0.45).setOrigin(0).setDepth(95_999).setVisible(false);
    this.panelBg = scene.add.graphics();
    this.title = scene.add.text(PAD, PAD - 2, 'Almanach', {
      fontFamily: THEME.font,
      fontSize: '20px',
      fontStyle: 'bold',
      color: THEME.sunCss,
    });
    this.closeText = scene.add
      .text(0, PAD - 6, '×', { fontFamily: THEME.font, fontSize: '28px', color: THEME.creamCss })
      .setOrigin(1, 0);
    this.list = scene.add.container(0, 0);
    this.panel = scene.add
      .container(0, 0, [this.panelBg, this.title, this.closeText, this.list])
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
    this.panelW = Math.min(PANEL_MAX_W, Math.max(240, viewW - safe.left - safe.right - 24));
    if (this.open) this.rebuild();
    else this.place();
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
      this.detail = null;
      this.scrollY = 0;
      this.rebuild();
      this.panel.setAlpha(0).setScale(0.96);
      this.scene.tweens.add({ targets: this.panel, alpha: 1, scale: 1, duration: 160, ease: 'Back.easeOut' });
    }
    this.onOpenChange(open);
  }

  /** Esc / H: step back from an entry to the list, then close. */
  back(): void {
    if (!this.open) return;
    if (this.detail) this.showDetail(null);
    else this.setOpen(false);
  }

  /** E / Space: open the highlighted entry. */
  confirm(): void {
    if (!this.open) return;
    if (this.detail) this.showDetail(null);
    else if (this.selected) this.showDetail(this.selected);
  }

  moveSelection(dir: 1 | -1): void {
    if (!this.open || this.detail || this.order.length === 0) return;
    const i = this.selected ? this.order.indexOf(this.selected) : -1;
    const next = Phaser.Math.Clamp(i < 0 ? (dir > 0 ? 0 : this.order.length - 1) : i + dir, 0, this.order.length - 1);
    this.selected = this.order[next];
    this.rebuild();
    const row = this.rows.find((r) => r.key === this.selected);
    if (row) {
      if (row.top < this.scrollY) this.scrollY = row.top - 8;
      else if (row.top + row.height > this.scrollY + this.listViewH) this.scrollY = row.top + row.height - this.listViewH + 8;
      this.scrollBy(0);
    }
  }

  pointerDown(x: number, y: number): boolean {
    if (!this.open) return false;
    const inside = x >= this.panel.x && x <= this.panel.x + this.panelW && y >= this.panel.y && y <= this.panel.y + this.panelH;
    const onClose = x >= this.panel.x + this.panelW - 56 && y <= this.panel.y + 52;
    if (!inside || onClose) {
      this.setOpen(false);
      return true;
    }
    this.dragStartY = y;
    this.dragLastY = y;
    this.dragMoved = false;
    return true;
  }

  pointerMove(y: number): void {
    if (!this.open || this.dragLastY === null) return;
    if (Math.abs(y - this.dragStartY) > DRAG_THRESHOLD_PX) this.dragMoved = true;
    this.scrollBy(this.dragLastY - y);
    this.dragLastY = y;
  }

  pointerUp(x?: number, y?: number): void {
    if (this.open && this.dragLastY !== null && !this.dragMoved && x !== undefined && y !== undefined) {
      const contentY = y - this.panel.y - this.listTop + this.scrollY;
      const inList = y - this.panel.y >= this.listTop && y - this.panel.y <= this.listTop + this.listViewH;
      const row = inList ? this.rows.find((r) => contentY >= r.top && contentY < r.top + r.height) : undefined;
      if (row) this.showDetail(row.key === BACK ? null : row.key);
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

  private showDetail(key: string | null): void {
    this.detail = key;
    this.scrollY = 0;
    if (key) this.selected = key;
    this.rebuild();
    if (key === null && this.selected) {
      const row = this.rows.find((r) => r.key === this.selected);
      if (row) this.scrollY = Math.max(0, row.top - this.listViewH / 2);
      this.scrollBy(0);
    }
  }

  private rebuild(): void {
    this.list.removeAll(true);
    this.rows = [];
    this.order = [];
    const width = this.panelW - PAD * 2;
    let y = 0;
    const add = (text: string, style: Phaser.Types.GameObjects.Text.TextStyle, x = 0): Phaser.GameObjects.Text => {
      const t = this.scene.add.text(x, y, text, { fontFamily: THEME.font, ...style }).setWordWrapWidth(width - x, true);
      this.list.add(t);
      y += t.height;
      return t;
    };

    const sections = getWikiSections();
    const found = this.detail ? sections.flatMap((s) => s.entries).find((e) => e.entry.key === this.detail) : undefined;

    if (found) {
      this.title.setText('Almanach');
      const back = add('‹  Zurück', { fontSize: '15px', fontStyle: 'bold', color: THEME.sunCss });
      this.rows.push({ key: BACK, top: -4, height: back.height + 14 });
      y += 14;
      this.renderDetail(found.entry, add, (dy) => (y += dy));
    } else {
      this.detail = null;
      this.title.setText('Almanach');
      for (const [i, section] of sections.entries()) {
        if (i > 0) y += 14;
        const knownCount = section.entries.filter((e) => e.known).length;
        add(`${section.title}  ${knownCount}/${section.entries.length}`, { fontSize: '13px', fontStyle: 'bold', color: '#9fb98a' });
        y += 4;
        for (const { entry, known } of section.entries) {
          if (known) this.order.push(entry.key);
          const isSel = known && entry.key === this.selected;
          const top = y;
          const t = add(`${isSel ? '▸ ' : '   '}${known ? entry.title : '???'}`, {
            fontSize: '16px',
            fontStyle: isSel ? 'bold' : 'normal',
            color: isSel ? THEME.sunCss : known ? THEME.creamCss : '#6f7a66',
          });
          y += 7;
          if (known) this.rows.push({ key: entry.key, top: top - 3, height: t.height + 13 });
        }
      }
      if (this.selected && !this.order.includes(this.selected)) this.selected = null;
    }
    this.listContentH = y + 4;
    this.place();
  }

  private renderDetail(
    entry: WikiEntry,
    add: (text: string, style: Phaser.Types.GameObjects.Text.TextStyle) => Phaser.GameObjects.Text,
    gap: (dy: number) => void,
  ): void {
    add(entry.title, { fontSize: '20px', fontStyle: 'bold', color: THEME.sunCss });
    gap(10);
    for (const line of entry.lines) {
      add(line, { fontSize: '15px', color: THEME.creamCss, lineSpacing: 3 });
      gap(10);
    }
  }

  /** Size and position the panel for the current content, then redraw. */
  private place(): void {
    const { viewW, viewH, safe } = this;
    this.listTop = PAD + 36;
    const maxH = viewH - safe.top - safe.bottom - 36;
    this.panelH = Math.max(120, Math.min(maxH, this.listContentH + this.listTop + PAD));
    this.listViewH = this.panelH - this.listTop - PAD;
    this.panel.setPosition(safe.left + (viewW - safe.left - safe.right - this.panelW) / 2, safe.top + 18 + (maxH - this.panelH) / 2);
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
    this.list.setPosition(PAD, this.listTop);
    this.scrollBy(0);
    this.applyScroll();
  }

  private applyScroll(): void {
    this.list.setY(this.listTop - this.scrollY);
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
