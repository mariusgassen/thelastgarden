import Phaser from 'phaser';
import { content } from '../content';
import { costLabel, getBuildMode, getMissingCost } from '../systems/building';
import { buildTextureKey } from '../systems/buildLayer';
import { THEME } from './theme';
import type { SafeArea } from './viewport';

const SLOT = 44;
const GAP = 6;
const PAD = 10;
const TEXT_H = 40;
/** Slots per row; more pieces wrap into further rows so the bar stays readable on a phone. */
const COLS = 6;

/**
 * The build mode's piece picker: a row of slots at the bottom of the screen with the picked
 * piece's name, cost and a one-line how-to above it. UIScene does the hit-testing through
 * `pointerDown`, so a press never starts the joystick.
 */
export class BuildBar {
  private readonly container: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly slots: { id: string; frame: Phaser.GameObjects.Image; icon: Phaser.GameObjects.Image; x: number; y: number }[] = [];
  private readonly pieces = content.buildables.all();
  private readonly cols = Math.min(COLS, this.pieces.length);
  private readonly rows = Math.ceil(this.pieces.length / COLS);
  private readonly width = PAD * 2 + this.cols * SLOT + (this.cols - 1) * GAP;
  private shown = false;

  constructor(scene: Phaser.Scene, touch: boolean) {
    this.bg = scene.add.graphics();
    this.bg.fillStyle(THEME.panel, THEME.panelAlpha);
    this.bg.fillRoundedRect(-this.width / 2, 0, this.width, this.height, 14);
    this.bg.lineStyle(1.5, THEME.sun, 0.7);
    this.bg.strokeRoundedRect(-this.width / 2, 0, this.width, this.height, 14);
    this.title = scene.add
      .text(0, 8, '', { fontFamily: THEME.font, fontSize: '14px', fontStyle: 'bold', color: THEME.creamCss })
      .setOrigin(0.5, 0);
    this.hint = scene.add
      .text(0, 27, touch ? 'Feld antippen: bauen · Gebautes antippen: abbauen' : 'Klick oder E: bauen · auf Gebautem: abbauen · B: fertig', {
        fontFamily: THEME.font,
        fontSize: '11px',
        color: THEME.creamCss,
      })
      .setOrigin(0.5, 0)
      .setAlpha(0.8);
    const parts: Phaser.GameObjects.GameObject[] = [this.bg, this.title, this.hint];
    this.pieces.forEach((piece, i) => {
      const x = -this.width / 2 + PAD + (i % COLS) * (SLOT + GAP) + SLOT / 2;
      const y = TEXT_H + PAD / 2 + Math.floor(i / COLS) * (SLOT + GAP) + SLOT / 2;
      const frame = scene.add.image(x, y, 'ui-slot').setDisplaySize(SLOT, SLOT);
      const icon = scene.add.image(x, y, buildTextureKey(piece.id));
      icon.setScale(Math.min(1, (SLOT - 12) / Math.max(icon.width, icon.height)));
      parts.push(frame, icon);
      if (!touch && i < 9) {
        parts.push(
          scene.add
            .text(x - SLOT / 2 + 5, y - SLOT / 2 + 3, String(i + 1), { fontFamily: THEME.font, fontSize: '10px', color: THEME.creamCss })
            .setAlpha(0.7),
        );
      }
      this.slots.push({ id: piece.id, frame, icon, x, y });
    });
    this.container = scene.add.container(0, 0, parts).setDepth(90_500).setVisible(false);
    this.refresh();
  }

  get visible(): boolean {
    return this.shown;
  }

  /** Total height in CSS px, including the text lines. */
  get height(): number {
    return TEXT_H + this.rows * SLOT + (this.rows - 1) * GAP + PAD * 1.5;
  }

  layout(viewW: number, viewH: number, safe: SafeArea): void {
    const room = viewW - safe.left - safe.right - 12;
    this.container.setScale(Math.min(1, room / this.width));
    this.container.setPosition(
      safe.left + (viewW - safe.left - safe.right) / 2,
      viewH - safe.bottom - 10 - this.height * this.container.scaleY,
    );
  }

  setVisible(visible: boolean): void {
    if (visible === this.shown) return;
    this.shown = visible;
    this.container.setVisible(visible);
    if (visible) this.refresh();
  }

  /** Redraws selection, affordability and the title line. */
  refresh(): void {
    const mode = getBuildMode();
    for (const slot of this.slots) {
      const def = content.buildables.get(slot.id);
      const affordable = getMissingCost(def).length === 0;
      slot.frame.setTexture(slot.id === mode.pieceId ? 'ui-slot-selected' : affordable ? 'ui-slot' : 'ui-slot-dim');
      slot.icon.setAlpha(affordable ? 1 : 0.45);
    }
    const picked = content.buildables.get(mode.pieceId);
    this.title.setText(`${picked.name} · ${costLabel(picked)}`);
    this.title.setColor(getMissingCost(picked).length === 0 ? THEME.creamCss : '#f0a48f');
  }

  /** Piece id of the slot with this index (number keys), if any. */
  pieceAt(index: number): string | undefined {
    return this.slots[index]?.id;
  }

  /** Returns the picked piece id for a press on a slot, `null` for a press elsewhere on the bar, `undefined` for a miss. */
  pointerDown(x: number, y: number): string | null | undefined {
    if (!this.shown) return undefined;
    const s = this.container.scaleX;
    const lx = (x - this.container.x) / s;
    const ly = (y - this.container.y) / s;
    if (Math.abs(lx) > this.width / 2 || ly < 0 || ly > this.height) return undefined;
    const slot = this.slots.find((sl) => Math.abs(lx - sl.x) <= SLOT / 2 + GAP / 2 && Math.abs(ly - sl.y) <= SLOT / 2 + GAP / 2 && ly >= TEXT_H);
    return slot ? slot.id : null;
  }
}
