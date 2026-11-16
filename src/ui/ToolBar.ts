import Phaser from 'phaser';
import { content } from '../content';
import { describeTool, getEquippedTool, getOwnedTools } from '../systems/tools';
import { itemTextureKey } from '../world/textures';
import { THEME } from './theme';
import type { SafeArea } from './viewport';

const SLOT = 50;
const GAP = 6;
const PAD = 10;
const TEXT_H = 68;
const MIN_WIDTH = 360;

/**
 * The tool mode's picker: a row with every tool (the ones not made yet stay dim), the tool in
 * hand's name and a short how-to above it. UIScene does the hit-testing through `pointerDown`,
 * so a press never starts the joystick.
 */
export class ToolBar {
  private readonly container: Phaser.GameObjects.Container;
  private readonly title: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly slots: { id: string; frame: Phaser.GameObjects.Image; icon: Phaser.GameObjects.Image; x: number }[] = [];
  private readonly tools = content.tools.all();
  private readonly width = Math.max(MIN_WIDTH, PAD * 2 + this.tools.length * SLOT + (this.tools.length - 1) * GAP);
  private readonly controls: string;
  private shown = false;

  constructor(scene: Phaser.Scene, touch: boolean) {
    this.controls = touch ? 'Antippen: benutzen · Knopf: fertig' : 'E oder Klick: benutzen · T: fertig';
    const bg = scene.add.graphics();
    bg.fillStyle(THEME.panel, THEME.panelAlpha);
    bg.fillRoundedRect(-this.width / 2, 0, this.width, this.height, 14);
    bg.lineStyle(1.5, THEME.sun, 0.7);
    bg.strokeRoundedRect(-this.width / 2, 0, this.width, this.height, 14);
    this.title = scene.add
      .text(0, 8, '', { fontFamily: THEME.font, fontSize: '14px', fontStyle: 'bold', color: THEME.creamCss })
      .setOrigin(0.5, 0);
    this.hint = scene.add
      .text(0, 27, '', {
        fontFamily: THEME.font,
        fontSize: '11px',
        color: THEME.creamCss,
        align: 'center',
        wordWrap: { width: this.width - 20 },
      })
      .setOrigin(0.5, 0)
      .setAlpha(0.8);
    const parts: Phaser.GameObjects.GameObject[] = [bg, this.title, this.hint];
    const rowW = this.tools.length * SLOT + (this.tools.length - 1) * GAP;
    this.tools.forEach((tool, i) => {
      const x = -rowW / 2 + i * (SLOT + GAP) + SLOT / 2;
      const y = TEXT_H + PAD / 2 + SLOT / 2;
      const frame = scene.add.image(x, y, 'ui-slot').setDisplaySize(SLOT, SLOT);
      const icon = scene.add.image(x, y, itemTextureKey(tool.id));
      icon.setScale(Math.min(1, (SLOT - 12) / Math.max(icon.width, icon.height)));
      parts.push(frame, icon);
      if (!touch) {
        parts.push(
          scene.add
            .text(x - SLOT / 2 + 5, y - SLOT / 2 + 3, String(i + 1), { fontFamily: THEME.font, fontSize: '10px', color: THEME.creamCss })
            .setAlpha(0.7),
        );
      }
      this.slots.push({ id: tool.id, frame, icon, x });
    });
    this.container = scene.add.container(0, 0, parts).setDepth(90_500).setVisible(false);
    this.refresh();
  }

  get visible(): boolean {
    return this.shown;
  }

  /** Total height in CSS px, including the text lines. */
  get height(): number {
    return TEXT_H + SLOT + PAD * 1.5;
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

  /** Redraws ownership, the tool in hand and the text lines. */
  refresh(): void {
    const owned = new Set(getOwnedTools().map((t) => t.id));
    const inHand = getEquippedTool();
    for (const slot of this.slots) {
      const has = owned.has(slot.id);
      slot.frame.setTexture(slot.id === inHand?.id ? 'ui-slot-selected' : has ? 'ui-slot' : 'ui-slot-dim');
      slot.icon.setAlpha(has ? 1 : 0.22);
    }
    if (inHand) {
      const { title, hint } = describeTool(inHand.id);
      this.title.setText(title);
      this.hint.setText(`${hint}\n${this.controls}`);
    } else {
      this.title.setText('Werkzeug');
      this.hint.setText(`Wähle ein Werkzeug.\n${this.controls}`);
    }
  }

  /** Tool id of the slot with this index (number keys), if it is owned. */
  toolAt(index: number): string | undefined {
    const id = this.slots[index]?.id;
    return id && getOwnedTools().some((t) => t.id === id) ? id : undefined;
  }

  /** Returns the picked tool id for a press on a slot, `null` for a press elsewhere on the bar, `undefined` for a miss. */
  pointerDown(x: number, y: number): string | null | undefined {
    if (!this.shown) return undefined;
    const s = this.container.scaleX;
    const lx = (x - this.container.x) / s;
    const ly = (y - this.container.y) / s;
    if (Math.abs(lx) > this.width / 2 || ly < 0 || ly > this.height) return undefined;
    const slot = this.slots.find((sl) => Math.abs(lx - sl.x) <= SLOT / 2 + GAP / 2 && ly >= TEXT_H);
    return slot && this.toolAt(this.slots.indexOf(slot)) ? slot.id : null;
  }
}
