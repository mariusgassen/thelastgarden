import Phaser from 'phaser';
import { content } from '../content';
import type { RecipeDef } from '../content/types';
import { getMissing, getUnlockedRecipes } from '../systems/crafting';
import { bus } from '../systems/events';
import { gameState } from '../systems/state';
import { itemTextureKey, recipeTextureKey } from '../world/textures';
import { THEME } from './theme';
import type { SafeArea } from './viewport';

const PANEL_MAX_W = 460;
const PAD = 20;
const LIST_TOP = PAD + 36;
const FOOTER_H = 98;
const SLOT_GAP = 10;
const COLS = 4;
const CRAFT_BTN_W = 110;
const CRAFT_BTN_H = 34;
const DRAG_THRESHOLD_PX = 6;

interface RecipeSlot {
  recipe: RecipeDef;
  craftable: boolean;
  x: number;
  y: number;
  size: number;
  row: number;
  col: number;
  bg: Phaser.GameObjects.Image;
}

interface IngredientChipHit {
  itemId: string;
  have: number;
  need: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ClipItem {
  obj: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
  topY: number;
  height: number;
}

/**
 * "Werkbank": a visual recipe grid with craftability badges and a compact bottom bar
 * showing the selected recipe's ingredient icons/counts and a "Herstellen" button.
 * Reads state only; crafting is delegated to the scene through `onCraftRecipe`.
 */
export class CraftingPanel {
  private readonly backdrop: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Container;
  private readonly panelBg: Phaser.GameObjects.Graphics;
  private readonly closeText: Phaser.GameObjects.Text;
  private readonly list: Phaser.GameObjects.Container;
  private readonly footer: Phaser.GameObjects.Container;
  private readonly footerBg: Phaser.GameObjects.Graphics;
  private readonly footerDynamic: Phaser.GameObjects.Container;
  private readonly craftBtnText: Phaser.GameObjects.Text;

  private slots: RecipeSlot[] = [];
  private clipItems: ClipItem[] = [];
  private chipHits: IngredientChipHit[] = [];
  private selectedId: string | null = null;
  private panelW = 320;
  private panelH = 240;
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
    private readonly touch: boolean,
    private readonly onOpenChange: (open: boolean) => void,
    private readonly onCraftRecipe: (recipeId: string) => void,
  ) {
    this.backdrop = scene.add.rectangle(0, 0, 10, 10, 0x000000, 0.45).setOrigin(0).setDepth(95_999).setVisible(false);
    this.panelBg = scene.add.graphics();
    const title = scene.add.text(PAD, PAD - 2, 'Werkbank', {
      fontFamily: THEME.font,
      fontSize: '20px',
      fontStyle: 'bold',
      color: THEME.sunCss,
    });
    this.closeText = scene.add
      .text(0, PAD - 6, '×', { fontFamily: THEME.font, fontSize: '28px', color: THEME.creamCss })
      .setOrigin(1, 0);
    this.list = scene.add.container(0, 0);

    this.footerBg = scene.add.graphics();
    this.footerDynamic = scene.add.container(0, 0);
    this.craftBtnText = scene.add
      .text(0, 0, 'Herstellen', { fontFamily: THEME.font, fontSize: '14px', fontStyle: 'bold', color: THEME.inkCss })
      .setOrigin(0.5);
    this.footer = scene.add
      .container(0, 0, [this.footerBg, this.footerDynamic, this.craftBtnText])
      .setVisible(false);

    this.panel = scene.add
      .container(0, 0, [this.panelBg, title, this.closeText, this.list, this.footer])
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
    const panelW = Math.min(PANEL_MAX_W, Math.max(250, viewW - safe.left - safe.right - 24));
    if (panelW !== this.panelW) {
      this.panelW = panelW;
      this.rebuildList();
    } else {
      this.updateFooter();
    }
    const footerSpace = this.footer.visible ? FOOTER_H : PAD / 2;
    const maxH = viewH - safe.top - safe.bottom - 36;
    const minListH = Math.min(this.listContentH, 96);
    this.panelH = Math.min(maxH, Math.max(LIST_TOP + minListH + footerSpace, this.listContentH + LIST_TOP + footerSpace));
    this.listViewH = Math.max(40, this.panelH - LIST_TOP - footerSpace);
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, Math.max(0, this.listContentH - this.listViewH));
    this.panel.setPosition(
      safe.left + (viewW - safe.left - safe.right - this.panelW) / 2,
      safe.top + 18 + (maxH - this.panelH) / 2,
    );
    this.drawPanel();
  }

  setOpen(open: boolean): void {
    if (this.open === open) return;
    this.open = open;
    this.backdrop.setVisible(open);
    this.panel.setVisible(open);
    if (open) {
      this.scrollY = 0;
      const recipes = getUnlockedRecipes();
      const firstReady = recipes.find((r) => getMissing(r).length === 0);
      this.selectedId = firstReady?.id ?? recipes[0]?.id ?? null;
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

  /** Rebuilds the recipe grid and footer from current inventory (no-op while closed). */
  refresh(): void {
    if (!this.open) return;
    this.rebuildList();
    this.layout(this.viewW, this.viewH, this.safe);
  }

  /** Keyboard: step through the recipe grid. */
  moveSelection(dx: number, dy: number): void {
    if (!this.open || this.slots.length === 0) return;
    const curIdx = Math.max(
      0,
      this.slots.findIndex((s) => s.recipe.id === this.selectedId),
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

  /** Keyboard: 1–9 selects that recipe and crafts it immediately. */
  craftIndex(index: number): void {
    if (!this.open) return;
    const slot = this.slots[index];
    if (!slot) return;
    this.selectSlot(slot);
    this.onCraftRecipe(slot.recipe.id);
  }

  /** Keyboard: E / Space / Enter crafts the selected recipe. */
  confirm(): void {
    if (!this.open || !this.selectedId) return;
    this.onCraftRecipe(this.selectedId);
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

    if (this.footer.visible) {
      const fy = ly - (this.panelH - FOOTER_H);
      if (fy >= 0) {
        const btn = this.craftBtnRect();
        if (lx >= btn.x - 6 && lx <= btn.x + btn.w + 6 && fy >= btn.y - 6 && fy <= btn.y + btn.h + 6) {
          if (this.selectedId) this.onCraftRecipe(this.selectedId);
          return true;
        }
        const chip = this.chipHits.find((c) => lx >= c.x && lx <= c.x + c.w && fy >= c.y && fy <= c.y + c.h);
        if (chip) {
          bus.emit('toast', { text: `${content.items.get(chip.itemId).name}: ${chip.have}/${chip.need}` });
          return true;
        }
        return true;
      }
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

  private selectSlot(slot: RecipeSlot): void {
    if (this.selectedId === slot.recipe.id) return;
    this.selectedId = slot.recipe.id;
    for (const s of this.slots) {
      s.bg.setTexture(this.slotTexture(s.recipe.id === this.selectedId, s.craftable));
    }
    if (slot.y < this.scrollY) this.scrollY = slot.y;
    else if (slot.y + slot.size > this.scrollY + this.listViewH) {
      this.scrollY = slot.y + slot.size - this.listViewH;
    }
    this.updateFooter();
    this.applyScroll();
  }

  private slotTexture(selected: boolean, craftable: boolean): string {
    if (selected) return 'ui-slot-selected';
    return craftable ? 'ui-slot-ready' : 'ui-slot-dim';
  }

  private itemIconKey(itemId: string): string {
    const key = itemTextureKey(itemId);
    return this.scene.textures.exists(key) ? key : 'item-fallback';
  }

  private recipeIconKey(recipe: RecipeDef): string {
    const specific = recipeTextureKey(recipe.id);
    if (this.scene.textures.exists(specific)) return specific;
    return this.itemIconKey(recipe.result[0].itemId);
  }

  private craftBtnRect(): { x: number; y: number; w: number; h: number } {
    return { x: this.panelW - PAD - CRAFT_BTN_W, y: 48, w: CRAFT_BTN_W, h: CRAFT_BTN_H };
  }

  private rebuildList(): void {
    this.list.removeAll(true);
    this.slots = [];
    this.clipItems = [];

    const innerW = this.panelW - PAD * 2;
    const recipes = getUnlockedRecipes();

    if (recipes.length === 0) {
      this.selectedId = null;
      const empty = this.scene.add
        .text(0, 6, 'Du kennst noch kein Rezept.', {
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

    if (!this.selectedId || !recipes.some((r) => r.id === this.selectedId)) {
      this.selectedId = recipes[0].id;
    }

    const slotSize = Math.min(76, Math.floor((innerW - (COLS - 1) * SLOT_GAP) / COLS));
    const gridW = COLS * slotSize + (COLS - 1) * SLOT_GAP;
    const offsetX = Math.floor((innerW - gridW) / 2);
    const iconSize = Math.min(42, Math.round(slotSize * 0.58));

    recipes.forEach((recipe, idx) => {
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const sx = offsetX + col * (slotSize + SLOT_GAP);
      const sy = 4 + row * (slotSize + SLOT_GAP);
      const craftable = getMissing(recipe).length === 0;
      const selected = recipe.id === this.selectedId;

      const bg = this.scene.add
        .image(sx, sy, this.slotTexture(selected, craftable))
        .setOrigin(0)
        .setDisplaySize(slotSize, slotSize);
      const icon = this.scene.add
        .image(sx + slotSize / 2, sy + slotSize / 2, this.recipeIconKey(recipe))
        .setOrigin(0.5)
        .setDisplaySize(iconSize, iconSize)
        .setAlpha(craftable ? 1 : 0.52);

      this.list.add([bg, icon]);
      this.clipItems.push(
        { obj: bg, topY: sy, height: slotSize },
        { obj: icon, topY: sy + (slotSize - iconSize) / 2, height: iconSize },
      );

      if (craftable) {
        const badgeSize = 15;
        const bx = sx + slotSize - 4 - badgeSize;
        const by = sy + 4;
        const check = this.scene.add
          .image(bx, by, 'ui-badge-check')
          .setOrigin(0)
          .setDisplaySize(badgeSize, badgeSize);
        this.list.add(check);
        this.clipItems.push({ obj: check, topY: by, height: badgeSize });
      }

      if (!this.touch && idx < 9) {
        const keyHint = this.scene.add.text(sx + 6, sy + 4, String(idx + 1), {
          fontFamily: THEME.font,
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#d6cfb6',
          stroke: '#151e13',
          strokeThickness: 2.5,
        });
        this.list.add(keyHint);
        this.clipItems.push({ obj: keyHint, topY: sy + 4, height: keyHint.height });
      }

      const totalOut = recipe.result.reduce((sum, r) => sum + r.count, 0);
      if (totalOut > 1) {
        const outBadge = this.scene.add
          .text(sx + slotSize - 5, sy + slotSize - 4, `×${totalOut}`, {
            fontFamily: THEME.font,
            fontSize: '12px',
            fontStyle: 'bold',
            color: THEME.creamCss,
            stroke: '#151e13',
            strokeThickness: 3,
          })
          .setOrigin(1, 1);
        this.list.add(outBadge);
        this.clipItems.push({ obj: outBadge, topY: sy + slotSize - 4 - outBadge.height, height: outBadge.height });
      }

      this.slots.push({ recipe, craftable, x: sx, y: sy, size: slotSize, row, col, bg });
    });

    const rowsUsed = Math.ceil(recipes.length / COLS);
    this.listContentH = 4 + rowsUsed * (slotSize + SLOT_GAP) - SLOT_GAP + 12;
    this.updateFooter();
  }

  private updateFooter(): void {
    this.footerDynamic.removeAll(true);
    this.footerBg.clear();
    this.chipHits = [];

    const slot = this.slots.find((s) => s.recipe.id === this.selectedId);
    if (!slot) {
      this.footer.setVisible(false);
      return;
    }

    this.footer.setVisible(true);
    const { recipe, craftable } = slot;

    // Row 1: result icon + recipe name (+ mini output icons if multiple items)
    const icon = this.scene.add
      .image(PAD + 14, 24, this.recipeIconKey(recipe))
      .setOrigin(0.5)
      .setDisplaySize(28, 28);
    const title = this.scene.add
      .text(PAD + 34, 24, recipe.name, {
        fontFamily: THEME.font,
        fontSize: '16px',
        fontStyle: 'bold',
        color: THEME.sunCss,
      })
      .setOrigin(0, 0.5);
    this.footerDynamic.add([icon, title]);

    if (recipe.result.length > 1) {
      let rx = PAD + 34 + Math.ceil(title.width) + 10;
      const arrow = this.scene.add
        .text(rx, 24, '→', { fontFamily: THEME.font, fontSize: '13px', color: '#d6cfb6' })
        .setOrigin(0, 0.5);
      this.footerDynamic.add(arrow);
      rx += Math.ceil(arrow.width) + 6;
      for (const r of recipe.result) {
        if (rx + 20 > this.panelW - PAD) break;
        const outIcon = this.scene.add
          .image(rx + 9, 24, this.itemIconKey(r.itemId))
          .setOrigin(0.5)
          .setDisplaySize(20, 20);
        this.footerDynamic.add(outIcon);
        rx += 22;
      }
    }

    // Row 2: ingredient chips on the left + Herstellen button on the right
    const btn = this.craftBtnRect();
    const chipGap = 6;
    const availW = btn.x - PAD - 8;
    const chipW = Math.min(64, Math.floor((availW - (recipe.cost.length - 1) * chipGap) / Math.max(1, recipe.cost.length)));
    const chipH = 32;
    const chipY = 49;

    recipe.cost.forEach((c, i) => {
      const cx = PAD + i * (chipW + chipGap);
      const have = gameState.getItemCount(c.itemId);
      const ok = have >= c.count;

      this.footerBg.fillStyle(0x1d291a, 0.95);
      this.footerBg.fillRoundedRect(cx, chipY, chipW, chipH, 8);
      this.footerBg.lineStyle(1.4, ok ? 0x6ea84b : 0xa35346, 0.75);
      this.footerBg.strokeRoundedRect(cx, chipY, chipW, chipH, 8);

      const ingIcon = this.scene.add
        .image(cx + 14, chipY + chipH / 2, this.itemIconKey(c.itemId))
        .setOrigin(0.5)
        .setDisplaySize(20, 20);
      const ratio = this.scene.add
        .text(cx + chipW - 6, chipY + chipH / 2, `${have}/${c.count}`, {
          fontFamily: THEME.font,
          fontSize: '12px',
          fontStyle: 'bold',
          color: ok ? '#a9d48b' : '#f08b78',
        })
        .setOrigin(1, 0.5);

      this.footerDynamic.add([ingIcon, ratio]);
      this.chipHits.push({ itemId: c.itemId, have, need: c.count, x: cx, y: chipY, w: chipW, h: chipH });
    });

    // Craft button
    if (craftable) {
      this.footerBg.fillStyle(THEME.cream, 0.96);
      this.footerBg.fillRoundedRect(btn.x, btn.y, btn.w, btn.h, btn.h / 2);
      this.footerBg.lineStyle(2, THEME.sun, 1);
      this.footerBg.strokeRoundedRect(btn.x, btn.y, btn.w, btn.h, btn.h / 2);
      this.craftBtnText.setColor(THEME.inkCss);
    } else {
      this.footerBg.fillStyle(0x283624, 0.9);
      this.footerBg.fillRoundedRect(btn.x, btn.y, btn.w, btn.h, btn.h / 2);
      this.footerBg.lineStyle(1.5, 0x5c7a4d, 0.55);
      this.footerBg.strokeRoundedRect(btn.x, btn.y, btn.w, btn.h, btn.h / 2);
      this.craftBtnText.setColor('#9ca894');
    }
    this.craftBtnText.setPosition(btn.x + btn.w / 2, btn.y + btn.h / 2);
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
      const footerY = this.panelH - FOOTER_H;
      this.panelBg.lineBetween(PAD, footerY, this.panelW - PAD, footerY);
      this.footer.setPosition(0, footerY);
    }
    this.closeText.setX(this.panelW - PAD + 6);
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
