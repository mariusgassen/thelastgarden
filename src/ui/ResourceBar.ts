import type Phaser from 'phaser';
import { drawBagIcon, drawMenuIcon, HudButton } from './HudButton';

export type TopButtonId = 'inventory' | 'menu';

const SPACING = HudButton.RADIUS * 2 + 10;

/** Top-left icon buttons: Beutel (inventory) and Menü. UIScene does the hit-testing. */
export class ResourceBar {
  private readonly inventory: HudButton;
  private readonly menu: HudButton;
  private x = 0;

  constructor(scene: Phaser.Scene) {
    this.inventory = new HudButton(scene, drawBagIcon);
    this.menu = new HudButton(scene, drawMenuIcon);
    this.inventory.setVisible(true);
    this.menu.setVisible(true);
  }

  get rightEdge(): number {
    return this.x + SPACING + HudButton.RADIUS;
  }

  hit(x: number, y: number): TopButtonId | null {
    if (this.inventory.contains(x, y)) return 'inventory';
    if (this.menu.contains(x, y)) return 'menu';
    return null;
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.inventory.setPosition(x, y);
    this.menu.setPosition(x + SPACING, y);
  }

  refresh(): void {}
}
