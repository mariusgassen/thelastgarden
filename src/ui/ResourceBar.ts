import Phaser from 'phaser';
import { content } from '../content';
import type { ItemCategory } from '../content/types';
import { gameState } from '../systems/state';
import { THEME } from './theme';

const SEED_COLOR = 0xc49a6c;
const PRODUCE_COLOR = 0x9ccf6a;
const ROW_GAP = 48;

interface Row {
  itemId: string | '__seeds__' | '__produce__';
  dot: Phaser.GameObjects.Arc;
  text: Phaser.GameObjects.Text;
}

/** Compact, always-visible resource/seed/harvest counts. Top-left, never intercepts touches (no hit area). */
export class ResourceBar {
  private readonly container: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly rows: Row[];
  private pillW = 0;

  constructor(scene: Phaser.Scene) {
    this.bg = scene.add.graphics();
    const specs: { itemId: Row['itemId']; color: number }[] = [
      { itemId: 'resource-sunlight', color: content.items.get('resource-sunlight').color },
      { itemId: 'resource-dew', color: content.items.get('resource-dew').color },
      { itemId: 'resource-curio', color: content.items.get('resource-curio').color },
      { itemId: '__seeds__', color: SEED_COLOR },
      { itemId: '__produce__', color: PRODUCE_COLOR },
    ];
    this.rows = specs.map((spec, i) => ({
      itemId: spec.itemId,
      dot: scene.add.circle(i * ROW_GAP, 0, 6, spec.color),
      text: scene.add
        .text(i * ROW_GAP + 10, 0, '0', {
          fontFamily: THEME.font,
          fontSize: '14px',
          fontStyle: 'bold',
          color: THEME.creamCss,
        })
        .setOrigin(0, 0.5),
    }));
    this.container = scene.add
      .container(0, 0, [this.bg, ...this.rows.flatMap((r) => [r.dot, r.text])])
      .setDepth(90_000);
    this.refresh();
  }

  get rightEdge(): number {
    return this.container.x - 14 + this.pillW;
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  refresh(): void {
    const totalOf = (category: ItemCategory): number =>
      content.items
        .all()
        .filter((i) => i.category === category)
        .reduce((sum, i) => sum + gameState.getItemCount(i.id), 0);
    for (const row of this.rows) {
      const count =
        row.itemId === '__seeds__'
          ? totalOf('seed')
          : row.itemId === '__produce__'
            ? totalOf('produce')
            : gameState.getItemCount(row.itemId);
      row.text.setText(String(count));
    }
    this.pillW = (this.rows.length - 1) * ROW_GAP + 54;
    const h = 30;
    this.bg.clear();
    this.bg.fillStyle(THEME.panel, THEME.panelAlpha * 0.85);
    this.bg.fillRoundedRect(-14, -h / 2, this.pillW, h, h / 2);
  }
}
