import type Phaser from 'phaser';
import { drawBagIcon, drawMapIcon, drawMenuIcon, HudButton } from './HudButton';

export type TopButtonId = 'inventory' | 'menu' | 'map';

const SPACING = HudButton.RADIUS * 2 + 10;

/** Top-left icon buttons: Menü (leftmost), Beutel (inventory), and Karte (map once unlocked). UIScene does the hit-testing. */
export class ResourceBar {
  private readonly menu: HudButton;
  private readonly inventory: HudButton;
  private readonly map: HudButton;
  private x = 0;

  constructor(scene: Phaser.Scene) {
    this.menu = new HudButton(scene, drawMenuIcon);
    this.inventory = new HudButton(scene, drawBagIcon);
    this.map = new HudButton(scene, drawMapIcon);
    this.menu.setVisible(true);
    this.inventory.setVisible(true);
    this.map.setVisible(false);
  }

  get rightEdge(): number {
    return this.x + (this.map.visible ? SPACING * 2 : SPACING) + HudButton.RADIUS;
  }

  setMapVisible(visible: boolean): void {
    this.map.setVisible(visible);
  }

  hit(x: number, y: number): TopButtonId | null {
    if (this.menu.contains(x, y)) return 'menu';
    if (this.inventory.contains(x, y)) return 'inventory';
    if (this.map.contains(x, y)) return 'map';
    return null;
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.menu.setPosition(x, y);
    this.inventory.setPosition(x + SPACING, y);
    this.map.setPosition(x + SPACING * 2, y);
  }

  refresh(): void {}
}
