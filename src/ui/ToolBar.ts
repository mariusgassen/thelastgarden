import Phaser from 'phaser';
import { content } from '../content';
import { gameState } from '../systems/state';
import {
  AUTO_TOOL,
  DESELECT_TOOL,
  canUseAutoTool,
  describeTool,
  getEquippedTool,
  getOwnedTools,
  getSowSeed,
  getSowableSpecies,
  isAutoTool,
} from '../systems/tools';
import { itemTextureKey } from '../world/textures';
import { HudButton, drawAutoIcon, drawDeselectIcon } from './HudButton';
import { THEME } from './theme';
import { prefersReducedMotion, type SafeArea } from './viewport';

const GAP = 6;
const PAD = 8;
const SEED_GAP = 5;
const SEED_PAD = 6;

export type ToolBarPick = { tool?: string; seed?: string } | null | undefined;

interface ToolSlotView {
  id: string;
  frame: Phaser.GameObjects.Image;
  activeGlow: Phaser.GameObjects.Graphics;
  equippedPip: Phaser.GameObjects.Arc;
  icon: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;
  num?: Phaser.GameObjects.Text;
  baseIconScale: number;
  y: number;
}

interface SeedSlotHit {
  plantId: string;
  x: number;
  y: number;
  size: number;
}

/**
 * Parallel vertical tool picker next to the right HUD button column. Animates out of
 * the tool button, supports tap or press-hold-drag selection, expands a horizontal seed
 * strip beside the Saatbeutel when multiple seeds exist, and highlights active slots clearly.
 */
export class ToolBar {
  private readonly container: Phaser.GameObjects.Container;
  private readonly seedStrip: Phaser.GameObjects.Container;
  private readonly callout: Phaser.GameObjects.Container;
  private readonly calloutBg: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly slots: ToolSlotView[] = [];
  private readonly seedBadge: Phaser.GameObjects.Image;
  /** Every tool, then the all-round hand, then the deselect slot (top to bottom). */
  private readonly ids = [...content.tools.all().map((t) => t.id), AUTO_TOOL, DESELECT_TOOL];
  private readonly slot: number;
  private readonly seedSlot: number;
  private readonly width: number;
  private readonly controls = '1–6 oder Klick · T / Esc: schließen';
  private readonly touch: boolean;
  private shown = false;
  private animating = false;
  private previewId: string | null = null;
  private previewSeed: string | null = null;
  private seedSlots: SeedSlotHit[] = [];
  private seedBounds: { left: number; right: number; top: number; bottom: number } | null = null;
  private anchor: { x: number; y: number } | null = null;
  private restX = 0;
  private restY = 0;
  private restScale = 1;

  constructor(
    private readonly scene: Phaser.Scene,
    touch: boolean,
  ) {
    this.touch = touch;
    this.slot = touch ? 48 : 46;
    this.seedSlot = touch ? 40 : 38;
    this.width = PAD * 2 + this.slot;
    const SLOT = this.slot;

    const bg = scene.add.graphics();
    bg.fillStyle(THEME.panel, THEME.panelAlpha);
    bg.fillRoundedRect(-this.width / 2, -this.height, this.width, this.height, 14);
    bg.lineStyle(1.5, THEME.sun, 0.7);
    bg.strokeRoundedRect(-this.width / 2, -this.height, this.width, this.height, 14);

    this.seedStrip = scene.add.container(0, 0).setVisible(false);

    // Floating callout pill to the left of the vertical bar.
    this.calloutBg = scene.add.graphics();
    this.title = scene.add
      .text(0, 0, '', { fontFamily: THEME.font, fontSize: touch ? '13px' : '14px', fontStyle: 'bold', color: THEME.creamCss })
      .setOrigin(0, 0);
    this.hint = scene.add
      .text(0, 0, '', {
        fontFamily: THEME.font,
        fontSize: '11px',
        color: THEME.creamCss,
        wordWrap: { width: 210 },
      })
      .setOrigin(0, 0)
      .setAlpha(0.85);
    this.callout = scene.add.container(-this.width / 2 - 10, -this.height / 2, [this.calloutBg, this.title, this.hint]);

    const parts: Phaser.GameObjects.GameObject[] = [bg, this.seedStrip, this.callout];
    this.ids.forEach((id, i) => {
      const y = -this.height + PAD + SLOT / 2 + i * (SLOT + GAP);
      const frame = scene.add.image(0, y, 'ui-slot').setDisplaySize(SLOT, SLOT);

      const activeGlow = scene.add.graphics({ x: 0, y }).setVisible(false);
      activeGlow.fillStyle(0xc98626, 0.34);
      activeGlow.fillRoundedRect(-SLOT / 2 + 2, -SLOT / 2 + 2, SLOT - 4, SLOT - 4, 10);
      activeGlow.lineStyle(2.5, THEME.cream, 0.95);
      activeGlow.strokeRoundedRect(-SLOT / 2 + 1, -SLOT / 2 + 1, SLOT - 2, SLOT - 2, 10);

      let icon: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;
      let baseIconScale = 1;
      if (id === AUTO_TOOL) {
        icon = scene.add.graphics({ x: 0, y });
        drawAutoIcon(icon, THEME.cream);
      } else if (id === DESELECT_TOOL) {
        icon = scene.add.graphics({ x: 0, y });
        drawDeselectIcon(icon, THEME.cream);
      } else {
        icon = scene.add.image(0, y, itemTextureKey(id));
        baseIconScale = Math.min(1, (SLOT - 12) / Math.max(icon.width, icon.height));
        icon.setScale(baseIconScale);
      }

      const equippedPip = scene.add
        .circle(SLOT / 2 - 7, y - SLOT / 2 + 7, 4.5, THEME.sun, 1)
        .setStrokeStyle(1.5, THEME.cream, 1)
        .setVisible(false);

      parts.push(frame, activeGlow, icon, equippedPip);
      let num: Phaser.GameObjects.Text | undefined;
      if (!touch) {
        num = scene.add
          .text(-SLOT / 2 + 5, y - SLOT / 2 + 3, String(i + 1), {
            fontFamily: THEME.font,
            fontSize: '10px',
            fontStyle: 'bold',
            color: THEME.creamCss,
          })
          .setAlpha(0.75);
        parts.push(num);
      }
      this.slots.push({ id, frame, activeGlow, equippedPip, icon, num, baseIconScale, y });
    });

    this.seedBadge = scene.add.image(0, 0, itemTextureKey('tool-satchel')).setVisible(false);
    parts.push(this.seedBadge);
    this.container = scene.add.container(0, 0, parts).setDepth(90_500).setVisible(false);
    this.refresh();
  }

  get visible(): boolean {
    return this.shown;
  }

  /** Total height of the vertical column in CSS px. */
  get height(): number {
    return PAD * 2 + this.ids.length * this.slot + (this.ids.length - 1) * GAP;
  }

  /** Anchors the vertical column parallel to `toolButton` `(anchorX, anchorY)`. */
  positionNear(anchorX: number, anchorY: number, topLimit: number, viewH: number, safe: SafeArea): void {
    this.anchor = { x: anchorX, y: anchorY };
    const bottomY = Math.min(anchorY + HudButton.RADIUS, viewH - safe.bottom - 10);
    const availH = Math.max(120, bottomY - topLimit);
    this.restScale = Math.min(1, availH / this.height);
    this.restX = anchorX - HudButton.RADIUS - (this.touch ? 12 : 24) - (this.width * this.restScale) / 2;
    this.restY = bottomY;
    if (this.shown && !this.animating) {
      this.container.setPosition(this.restX, this.restY).setScale(this.restScale);
    }
  }

  setVisible(visible: boolean): void {
    if (visible === this.shown) return;
    this.shown = visible;
    if (!visible) {
      this.previewId = null;
      this.previewSeed = null;
    } else {
      this.refresh();
    }

    this.scene.tweens.killTweensOf(this.container);
    const reduced = prefersReducedMotion() || !this.anchor;
    if (visible) {
      if (reduced || !this.anchor) {
        this.animating = false;
        this.container.setPosition(this.restX, this.restY).setScale(this.restScale).setAlpha(1).setVisible(true);
      } else {
        this.animating = true;
        this.container
          .setPosition(this.anchor.x, this.anchor.y)
          .setScale(this.restScale * 0.2)
          .setAlpha(0)
          .setVisible(true);
        this.scene.tweens.add({
          targets: this.container,
          x: this.restX,
          y: this.restY,
          scaleX: this.restScale,
          scaleY: this.restScale,
          alpha: 1,
          duration: 170,
          ease: 'Back.easeOut',
          onComplete: () => {
            this.animating = false;
          },
        });
      }
      return;
    }

    if (reduced || !this.anchor) {
      this.animating = false;
      this.container.setVisible(false).setAlpha(1).setScale(this.restScale);
    } else {
      this.animating = true;
      this.scene.tweens.add({
        targets: this.container,
        x: this.anchor.x,
        y: this.anchor.y,
        scaleX: this.restScale * 0.2,
        scaleY: this.restScale * 0.2,
        alpha: 0,
        duration: 120,
        ease: 'Sine.easeIn',
        onComplete: () => {
          this.animating = false;
          if (!this.shown) this.container.setVisible(false);
        },
      });
    }
  }

  /** Highlights a tool or seed slot while hovering or sliding across the bar during a press-and-hold gesture. */
  setPreview(toolId: string | null, seedId: string | null = null): void {
    if (this.previewId === toolId && this.previewSeed === seedId) return;
    this.previewId = toolId;
    this.previewSeed = seedId;
    if (this.shown) this.refresh();
  }

  /** Redraws ownership, equipped/hovered highlights, badges, the seed strip, and the callout label. */
  refresh(): void {
    const owned = new Set(getOwnedTools().map((t) => t.id));
    if (canUseAutoTool()) owned.add(AUTO_TOOL);
    const inHand = isAutoTool() ? AUTO_TOOL : getEquippedTool()?.id;
    if (inHand) owned.add(DESELECT_TOOL);
    const shownPick = this.previewId ?? (this.previewSeed ? 'tool-satchel' : inHand) ?? null;

    for (const sl of this.slots) {
      const has = owned.has(sl.id);
      const picked = has && sl.id === shownPick;
      const equipped = has && sl.id === inHand;
      const s = picked ? 1.08 : has ? 1 : 0.94;
      sl.frame
        .setTexture(picked ? 'ui-slot-selected' : has ? 'ui-slot' : 'ui-slot-dim')
        .setDisplaySize(this.slot * s, this.slot * s)
        .setAlpha(has ? 1 : 0.65);
      sl.activeGlow.setVisible(picked).setScale(s);
      sl.icon.setAlpha(picked ? 1 : has ? 0.88 : 0.22).setScale(sl.baseIconScale * s);
      sl.equippedPip.setVisible(equipped && !picked);
      if (sl.num) {
        sl.num.setColor(picked ? THEME.sunCss : THEME.creamCss).setAlpha(has ? (picked ? 1 : 0.7) : 0.25);
      }
    }

    // Seed & carried-plant badges sit on the bottom-right corner of satchel / shovel.
    const satchel = this.slots.find((sl) => sl.id === 'tool-satchel');
    const seed = getSowSeed();
    const seedItem = seed ? content.plants.get(seed).seedItemId : undefined;
    if (satchel && seedItem && owned.has(satchel.id)) {
      const s = satchel.id === shownPick ? 1.08 : 1;
      const size = this.slot * 0.42;
      this.seedBadge
        .setTexture(itemTextureKey(seedItem))
        .setPosition((this.slot / 2 - size / 2 - 3) * s, satchel.y + (this.slot / 2 - size / 2 - 3) * s)
        .setDisplaySize(size, size)
        .setVisible(true);
    } else {
      this.seedBadge.setVisible(false);
    }

    this.refreshSeedStrip(satchel, owned.has('tool-satchel'), seed);
    this.refreshCallout(shownPick, satchel);
  }

  /** Renders a horizontal seed picker branching left from the Saatbeutel slot whenever 2+ seed kinds exist. */
  private refreshSeedStrip(satchel: ToolSlotView | undefined, hasSatchel: boolean, activeSeed: string | undefined): void {
    this.seedStrip.removeAll(true);
    this.seedSlots = [];
    this.seedBounds = null;

    const species = hasSatchel ? getSowableSpecies() : [];
    if (!satchel || species.length <= 1) {
      this.seedStrip.setVisible(false);
      return;
    }

    const colsMax = this.touch ? 4 : 5;
    const cols = Math.min(colsMax, species.length);
    const rows = Math.ceil(species.length / colsMax);
    const sw = SEED_PAD * 2 + cols * this.seedSlot + (cols - 1) * SEED_GAP;
    const sh = SEED_PAD * 2 + rows * this.seedSlot + (rows - 1) * SEED_GAP;
    const right = -this.width / 2 - 8;
    const left = right - sw;
    const cy = Phaser.Math.Clamp(satchel.y, -this.height + sh / 2, -sh / 2);
    const top = cy - sh / 2;
    this.seedBounds = { left, right, top, bottom: cy + sh / 2 };

    const bg = this.scene.add.graphics();
    bg.fillStyle(THEME.panel, THEME.panelAlpha);
    bg.fillRoundedRect(left, top, sw, sh, 12);
    bg.lineStyle(1.5, THEME.sun, 0.7);
    bg.strokeRoundedRect(left, top, sw, sh, 12);
    this.seedStrip.add(bg);

    const shownSeed = this.previewSeed ?? activeSeed ?? null;
    species.forEach((plantId, i) => {
      const col = i % colsMax;
      const row = Math.floor(i / colsMax);
      const sx = left + SEED_PAD + this.seedSlot / 2 + col * (this.seedSlot + SEED_GAP);
      const sy = top + SEED_PAD + this.seedSlot / 2 + row * (this.seedSlot + SEED_GAP);
      const picked = plantId === shownSeed;
      const s = picked ? 1.08 : 1;

      const frame = this.scene.add
        .image(sx, sy, picked ? 'ui-slot-selected' : 'ui-slot')
        .setDisplaySize(this.seedSlot * s, this.seedSlot * s);
      this.seedStrip.add(frame);

      if (picked) {
        const glow = this.scene.add.graphics({ x: sx, y: sy });
        glow.fillStyle(0xc98626, 0.3);
        glow.fillRoundedRect((-this.seedSlot / 2 + 2) * s, (-this.seedSlot / 2 + 2) * s, (this.seedSlot - 4) * s, (this.seedSlot - 4) * s, 9);
        glow.lineStyle(2, THEME.cream, 0.95);
        glow.strokeRoundedRect((-this.seedSlot / 2 + 1) * s, (-this.seedSlot / 2 + 1) * s, (this.seedSlot - 2) * s, (this.seedSlot - 2) * s, 9);
        this.seedStrip.add(glow);
      }

      const plant = content.plants.get(plantId);
      const seedItem = plant.seedItemId as string;
      const icon = this.scene.add.image(sx, sy, itemTextureKey(seedItem));
      const baseScale = Math.min(1, (this.seedSlot - 10) / Math.max(icon.width, icon.height));
      icon.setScale(baseScale * s).setAlpha(picked ? 1 : 0.9);
      this.seedStrip.add(icon);

      const count = gameState.getItemCount(seedItem);
      const badge = this.scene.add
        .text(sx + (this.seedSlot / 2 - 3) * s, sy + (this.seedSlot / 2 - 2) * s, String(count), {
          fontFamily: THEME.font,
          fontSize: '10px',
          fontStyle: 'bold',
          color: picked ? THEME.sunCss : THEME.creamCss,
          stroke: '#151e13',
          strokeThickness: 3,
        })
        .setOrigin(1, 1);
      this.seedStrip.add(badge);

      this.seedSlots.push({ plantId, x: sx, y: sy, size: this.seedSlot });
    });

    this.seedStrip.setVisible(true);
  }

  private refreshCallout(shownPick: string | null, satchel: ToolSlotView | undefined): void {
    let info: { title: string; hint: string };
    if (this.previewSeed) {
      const plant = content.plants.get(this.previewSeed);
      const count = plant.seedItemId ? gameState.getItemCount(plant.seedItemId) : 0;
      info = { title: `${plant.name} (${count})`, hint: 'Als Saat für den Saatbeutel wählen.' };
    } else {
      info = shownPick ? describeTool(shownPick) : { title: 'Werkzeug', hint: 'Wähle ein Werkzeug.' };
    }
    this.title.setText(info.title);
    const body = this.touch ? '' : `${info.hint}\n${this.controls}`;
    this.hint.setText(body).setVisible(body.length > 0);

    const padX = 10;
    const padY = 7;
    const textW = Math.max(this.title.width, body ? this.hint.width : 0);
    const boxW = textW + padX * 2;
    const boxH = padY * 2 + this.title.height + (body ? 4 + this.hint.height : 0);

    this.title.setPosition(-boxW + padX, -boxH / 2 + padY);
    if (body) this.hint.setPosition(-boxW + padX, -boxH / 2 + padY + this.title.height + 4);

    this.calloutBg.clear();
    this.calloutBg.fillStyle(THEME.panel, 0.94);
    this.calloutBg.fillRoundedRect(-boxW, -boxH / 2, boxW, boxH, 10);
    this.calloutBg.lineStyle(1.5, shownPick ? THEME.sun : 0x5c7a4d, shownPick ? 0.9 : 0.7);
    this.calloutBg.strokeRoundedRect(-boxW, -boxH / 2, boxW, boxH, 10);

    const slot = shownPick ? this.slots.find((sl) => sl.id === shownPick) : undefined;
    const targetY = this.previewSeed && this.seedBounds ? this.seedBounds.top - 8 - boxH / 2 : slot ? slot.y : -this.slot / 2 - PAD;
    let clampedY = Phaser.Math.Clamp(targetY, -this.height + boxH / 2, -boxH / 2);
    if (this.seedBounds && clampedY + boxH / 2 > this.seedBounds.top - 6 && clampedY - boxH / 2 < this.seedBounds.bottom + 6) {
      const satchelY = satchel?.y ?? (this.seedBounds.top + this.seedBounds.bottom) / 2;
      clampedY = targetY <= satchelY ? this.seedBounds.top - 8 - boxH / 2 : Math.max(clampedY, this.seedBounds.bottom + 8 + boxH / 2);
    }
    this.callout.setPosition(-this.width / 2 - 10, clampedY);
  }

  /** Tool id of the slot with this index (number keys), if it is usable right now. */
  toolAt(index: number): string | undefined {
    const id = this.slots[index]?.id;
    if (id === DESELECT_TOOL) return isAutoTool() || getEquippedTool() ? id : undefined;
    if (id === AUTO_TOOL) return canUseAutoTool() ? id : undefined;
    return id && getOwnedTools().some((t) => t.id === id) ? id : undefined;
  }

  /** Returns the enabled tool id under `(x, y)` in CSS px, or `undefined` if none matches. */
  slotAt(x: number, y: number, generous = false): string | undefined {
    if (!this.shown) return undefined;
    const lx = (x - this.restX) / this.restScale;
    const ly = (y - this.restY) / this.restScale;
    const minX = generous ? -this.width / 2 - 48 : -this.width / 2;
    const maxX = generous ? this.width / 2 + 10 : this.width / 2;
    const minY = generous ? -this.height - 20 : -this.height;
    const maxY = generous ? 20 : 0;
    if (lx < minX || lx > maxX || ly < minY || ly > maxY) return undefined;
    let bestIdx = -1;
    let bestDist = Infinity;
    this.slots.forEach((sl, idx) => {
      const d = Math.abs(ly - sl.y);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = idx;
      }
    });
    if (bestIdx < 0) return undefined;
    if (!generous && bestDist > this.slot / 2 + GAP / 2) return undefined;
    return this.toolAt(bestIdx);
  }

  /** Returns the sowable plant id under `(x, y)` in the seed sub-strip, or `undefined` if none matches. */
  seedAt(x: number, y: number, generous = false): string | undefined {
    if (!this.shown || !this.seedBounds || this.seedSlots.length === 0) return undefined;
    const lx = (x - this.restX) / this.restScale;
    const ly = (y - this.restY) / this.restScale;
    const pad = generous ? 16 : 0;
    if (
      lx < this.seedBounds.left - pad ||
      lx > this.seedBounds.right + pad ||
      ly < this.seedBounds.top - pad ||
      ly > this.seedBounds.bottom + pad
    ) {
      return undefined;
    }
    let best: SeedSlotHit | undefined;
    let bestDist = Infinity;
    for (const sl of this.seedSlots) {
      const d = Math.hypot(lx - sl.x, ly - sl.y);
      if (d < bestDist) {
        bestDist = d;
        best = sl;
      }
    }
    if (!best) return undefined;
    if (!generous && (Math.abs(lx - best.x) > best.size / 2 + SEED_GAP / 2 || Math.abs(ly - best.y) > best.size / 2 + SEED_GAP / 2)) {
      return undefined;
    }
    return best.plantId;
  }

  /** Returns `{ tool }` or `{ seed }` for a press on a slot, `null` for empty padding inside the bar/strip, or `undefined` for a miss. */
  pointerDown(x: number, y: number): ToolBarPick {
    if (!this.shown) return undefined;
    const lx = (x - this.restX) / this.restScale;
    const ly = (y - this.restY) / this.restScale;
    if (this.seedBounds && lx >= this.seedBounds.left && lx <= this.seedBounds.right && ly >= this.seedBounds.top && ly <= this.seedBounds.bottom) {
      const seed = this.seedAt(x, y, false);
      return seed ? { seed } : null;
    }
    if (Math.abs(lx) > this.width / 2 || ly < -this.height || ly > 0) return undefined;
    const tool = this.slotAt(x, y, false);
    return tool ? { tool } : null;
  }
}
