import Phaser from 'phaser';
import type { VillagerLook } from '../content/types';
import { VILLAGERS } from '../content/village';
import { seededRandom } from './grid';
import { TILE_IDS, TILE_SIZE, TILES, TILESET_MARGIN, TILESET_SPACING, type TileDef } from './tiles';

type G = Phaser.GameObjects.Graphics;

export function itemTextureKey(itemId: string): string {
  return `item-${itemId}`;
}

export function recipeTextureKey(recipeId: string): string {
  return recipeId === 'seed-mix' ? 'recipe-seed-mix' : `recipe-${recipeId}`;
}

/**
 * Generates every texture the game uses from code (no external art).
 * Keys: 'tiles' (tileset strip) plus one key per prop/sprite/item.
 */
export function generateTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  const make = (key: string, w: number, h: number, draw: (g: G) => void) => {
    g.clear();
    draw(g);
    g.generateTexture(key, w, h);
  };

  generateTileset(g);
  generateItemAndUiTextures(make);
  generateBuildAndBlightTextures(make);
  generateCropTextures(make);
  generateVillageTextures(make);

  make('shadow', 32, 12, (g) => {
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(16, 6, 30, 10);
  });

  make('player', 28, 40, (g) => drawGardener(g, 0, 0, true));

  // Mohn, the garden's mare (NPC id `mohn`), and the gardener on her back (systems/player.ts).
  make('mohn', 66, 52, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(31, 49, 50, 6);
    drawHorse(g, 0, 2);
  });
  make('player-riding', 66, 70, (g) => {
    drawHorse(g, 0, 20);
    drawGardener(g, 15, 5, false);
    g.fillStyle(0x3f5f3a, 1); // near leg over the saddle blanket
    g.fillRoundedRect(27, 33, 6, 14, 3);
    g.fillStyle(0x3a2a1e, 1);
    g.fillRoundedRect(27, 44, 8, 4, 2);
  });
  make('fence-post', 14, 36, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(7, 33, 12, 5);
    g.fillStyle(0x6d4a30, 1);
    g.fillRoundedRect(4, 2, 6, 31, 2);
    g.fillStyle(0x8a603d, 1);
    g.fillRect(5, 3, 2, 29);
  });

  make('marker', 22, 22, (g) => {
    g.fillStyle(0x1f2e1d, 0.35);
    g.fillCircle(11, 12, 9);
    g.fillStyle(0xfff6d8, 1);
    g.fillCircle(11, 10, 8);
    g.fillStyle(0xe9a23b, 1);
    g.fillTriangle(7, 8, 15, 8, 11, 13);
  });

  make('tree', 84, 96, (g) => drawTree(g, 84, 96, 0x3f6b35, 0x5b8a45, 0x77a957));
  make('tree-dark', 84, 96, (g) => drawTree(g, 84, 96, 0x2f5530, 0x426f3c, 0x5c8a4a));
  make('bush', 40, 30, (g) => {
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(20, 26, 36, 8);
    g.fillStyle(0x4c7a3d, 1);
    g.fillCircle(12, 18, 10);
    g.fillCircle(27, 17, 11);
    g.fillStyle(0x6a9a4e, 1);
    g.fillCircle(20, 13, 10);
    g.fillStyle(0x8fbd66, 0.7);
    g.fillCircle(17, 9, 3);
  });

  ['#f4d35e', '#ee8f8f', '#c8b6ff', '#ffffff'].forEach((c, i) =>
    make(`flower-${i}`, 10, 10, (g) => {
      const col = Phaser.Display.Color.HexStringToColor(c).color;
      g.fillStyle(col, 1);
      for (let a = 0; a < 5; a++) {
        const r = (a / 5) * Math.PI * 2;
        g.fillCircle(5 + Math.cos(r) * 2.6, 5 + Math.sin(r) * 2.6, 1.8);
      }
      g.fillStyle(0xe9a23b, 1);
      g.fillCircle(5, 5, 1.4);
    }),
  );
  make('grass-tuft', 16, 12, (g) => {
    g.lineStyle(2, 0x5b8a3c, 1);
    g.lineBetween(4, 12, 2, 3);
    g.lineBetween(8, 12, 8, 1);
    g.lineBetween(12, 12, 14, 4);
  });

  // Obstacles (displayed scaled to their ObstacleDef rect)
  make('obstacle-bramble', 96, 120, (g) => {
    const rnd = seededRandom(7);
    for (let i = 0; i < 22; i++) {
      g.fillStyle(i % 3 === 0 ? 0x3b4f2a : 0x4a3a3f, 1);
      g.fillCircle(14 + rnd() * 68, 14 + rnd() * 94, 10 + rnd() * 10);
    }
    g.lineStyle(2, 0x6b3d4f, 1);
    for (let i = 0; i < 18; i++) {
      const x = 8 + rnd() * 80;
      const y = 8 + rnd() * 104;
      g.lineBetween(x, y, x + (rnd() - 0.5) * 40, y + (rnd() - 0.5) * 40);
    }
    g.fillStyle(0x2a1730, 1);
    for (let i = 0; i < 14; i++) g.fillCircle(10 + rnd() * 76, 10 + rnd() * 100, 2.4);
    g.fillStyle(0xd84a5f, 1);
    for (let i = 0; i < 5; i++) g.fillCircle(10 + rnd() * 76, 10 + rnd() * 100, 2);
  });
  make('obstacle-fallenTree', 128, 64, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(64, 52, 124, 18);
    g.fillStyle(0x6e4a2f, 1);
    g.fillRoundedRect(8, 22, 112, 26, 12);
    g.fillStyle(0x8a603d, 1);
    g.fillRoundedRect(8, 24, 112, 10, 6);
    g.fillStyle(0xc9a47a, 1);
    g.fillEllipse(116, 35, 14, 24);
    g.lineStyle(1.5, 0x8a603d, 1);
    g.strokeEllipse(116, 35, 8, 14);
    g.fillStyle(0x4c7a3d, 1);
    g.fillCircle(20, 22, 10);
    g.fillCircle(30, 46, 8);
    g.fillCircle(70, 20, 7);
    g.fillStyle(0x6a9a4e, 1);
    g.fillCircle(24, 18, 6);
    g.fillCircle(86, 46, 6);
  });
  make('obstacle-tallGrass', 96, 120, (g) => {
    const rnd = seededRandom(13);
    g.fillStyle(0x6f8f3c, 1);
    g.fillRoundedRect(4, 10, 88, 106, 20);
    for (let i = 0; i < 70; i++) {
      const x = 6 + rnd() * 84;
      const y = 30 + rnd() * 88;
      g.lineStyle(2, rnd() > 0.5 ? 0x9bb85a : 0x587a2e, 1);
      g.lineBetween(x, y, x + (rnd() - 0.5) * 12, y - 18 - rnd() * 16);
    }
    g.fillStyle(0xe2d48a, 1);
    for (let i = 0; i < 10; i++) g.fillEllipse(8 + rnd() * 80, 6 + rnd() * 50, 4, 9);
    g.fillStyle(0xa77bc4, 1);
    for (let i = 0; i < 4; i++) g.fillCircle(10 + rnd() * 76, 20 + rnd() * 80, 3);
  });

  // Resource pickups & plant growth feedback (Wave 2)
  make('pickup-orb', 28, 28, (g) => {
    g.fillStyle(0xffffff, 0.18);
    g.fillCircle(14, 14, 13);
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(14, 14, 9);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(14, 14, 5);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(12, 11, 2);
  });
  make('sparkle', 10, 10, (g) => {
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(5, 5, 4);
    g.fillStyle(0xfff6d8, 1);
    g.fillCircle(5, 5, 2.4);
  });
  make('firefly', 8, 8, (g) => {
    g.fillStyle(0xfff0a0, 0.5);
    g.fillCircle(4, 4, 4);
    g.fillStyle(0xfff6c8, 1);
    g.fillCircle(4, 4, 2);
  });

  make('plant-bramble-vine-sprout', 18, 18, (g) => {
    g.fillStyle(0x3f6b35, 1);
    g.fillRect(8, 8, 2, 10);
    g.fillStyle(0x5b8a45, 1);
    g.fillCircle(6, 8, 3);
    g.fillCircle(12, 7, 3);
  });
  make('plant-bramble-vine-growing', 30, 46, (g) => {
    g.fillStyle(0x3f6b35, 1);
    g.fillRect(13, 10, 3, 36);
    g.lineStyle(2, 0x5b8a45, 1);
    g.lineBetween(14, 36, 6, 26);
    g.lineBetween(15, 24, 24, 16);
    g.fillStyle(0x6b2e4a, 1);
    g.fillCircle(6, 26, 3);
    g.fillCircle(24, 16, 3);
  });
  make('plant-bramble-vine-mature', 38, 60, (g) => {
    g.fillStyle(0x5c3b25, 1);
    g.fillRect(17, 6, 4, 50);
    g.lineStyle(3, 0x3f6b35, 1);
    g.lineBetween(19, 54, 6, 42);
    g.lineBetween(19, 42, 32, 30);
    g.lineBetween(19, 30, 6, 18);
    g.lineBetween(19, 18, 30, 8);
    g.fillStyle(0x6b2e4a, 1);
    for (const [x, y] of [
      [6, 42],
      [32, 30],
      [6, 18],
      [30, 8],
      [19, 36],
    ])
      g.fillCircle(x, y, 3.2);
    g.fillStyle(0x9c4a5f, 1);
    for (const [x, y] of [
      [6, 42],
      [32, 30],
      [6, 18],
    ])
      g.fillCircle(x, y, 1.3);
  });

  make('plant-glow-lily-sprout', 16, 16, (g) => {
    g.fillStyle(0x3f6b35, 1);
    g.fillRect(7, 6, 2, 9);
    g.fillStyle(0xf3e38a, 1);
    g.fillCircle(8, 5, 2.4);
  });
  make('plant-glow-lily-growing', 22, 32, (g) => {
    g.fillStyle(0x3f6b35, 1);
    g.fillRect(10, 8, 2, 22);
    g.fillStyle(0xf3e38a, 1);
    g.fillEllipse(11, 8, 7, 11);
  });
  make('plant-glow-lily-mature', 34, 42, (g) => {
    g.fillStyle(0x3f6b35, 1);
    g.fillRect(16, 16, 2, 24);
    g.fillStyle(0xf3e38a, 0.35);
    g.fillCircle(17, 14, 15);
    g.fillStyle(0xf3e38a, 1);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.fillEllipse(17 + Math.cos(a) * 8, 14 + Math.sin(a) * 8, 7, 10);
    }
    g.fillStyle(0xfff6d8, 1);
    g.fillCircle(17, 14, 4);
  });

  make('plant-lavender-sprout', 16, 16, (g) => {
    g.fillStyle(0x3f6b35, 1);
    g.fillRect(7, 7, 2, 8);
    g.fillStyle(0x9b84d6, 1);
    g.fillCircle(8, 6, 2);
  });
  make('plant-lavender-growing', 24, 30, (g) => {
    g.fillStyle(0x4c7a3d, 1);
    g.fillCircle(12, 22, 8);
    g.fillStyle(0x9b84d6, 1);
    g.fillCircle(7, 10, 2);
    g.fillCircle(12, 6, 2.2);
    g.fillCircle(17, 11, 2);
  });
  make('plant-lavender-mature', 30, 44, (g) => {
    g.fillStyle(0x4c7a3d, 1);
    g.fillCircle(15, 36, 11);
    g.fillStyle(0x3f6b35, 1);
    g.fillRect(13, 10, 2, 24);
    g.fillRect(8, 16, 2, 20);
    g.fillRect(19, 16, 2, 20);
    g.fillStyle(0x9b84d6, 1);
    for (let i = 0; i < 5; i++) g.fillEllipse(14, 8 + i * 3, 5, 3);
    for (let i = 0; i < 4; i++) g.fillEllipse(9, 14 + i * 3, 4, 2.6);
    for (let i = 0; i < 4; i++) g.fillEllipse(20, 14 + i * 3, 4, 2.6);
  });

  make('light-halo', 128, 128, (g) => {
    for (let i = 16; i >= 1; i--) {
      const r = (i / 16) * 64;
      g.fillStyle(0xffffff, 0.08);
      g.fillCircle(64, 64, r);
    }
  });

  make('plant-moon-fern-sprout', 18, 18, (g) => {
    g.fillStyle(0x2d6b5e, 1);
    g.fillRect(8, 8, 2, 9);
    g.fillStyle(0x7ae7c7, 1);
    g.fillCircle(9, 7, 3.2);
    g.fillStyle(0xdffcf4, 1);
    g.fillCircle(10, 6, 1.4);
  });
  make('plant-moon-fern-growing', 30, 36, (g) => {
    g.fillStyle(0x265c52, 1);
    g.fillEllipse(15, 29, 14, 7);
    g.lineStyle(2.5, 0x439c88, 1);
    g.lineBetween(15, 31, 6, 15);
    g.lineBetween(15, 31, 15, 8);
    g.lineBetween(15, 31, 24, 15);
    g.fillStyle(0x7ae7c7, 1);
    g.fillCircle(6, 14, 3);
    g.fillCircle(15, 7, 3.2);
    g.fillCircle(24, 14, 3);
    g.fillStyle(0xdffcf4, 0.9);
    g.fillCircle(15, 7, 1.4);
  });
  make('plant-moon-fern-mature', 40, 46, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(20, 42, 26, 7);
    g.fillStyle(0x265c52, 1);
    g.fillEllipse(20, 34, 24, 12);
    g.lineStyle(3, 0x439c88, 1);
    g.lineBetween(20, 36, 5, 22);
    g.lineBetween(20, 36, 10, 10);
    g.lineBetween(20, 36, 20, 6);
    g.lineBetween(20, 36, 30, 10);
    g.lineBetween(20, 36, 35, 22);
    g.fillStyle(0x7ae7c7, 1);
    for (const [fx, fy] of [
      [5, 22],
      [10, 10],
      [20, 6],
      [30, 10],
      [35, 22],
    ]) {
      g.fillCircle(fx, fy, 3.6);
    }
    g.fillStyle(0xdffcf4, 0.95);
    g.fillCircle(20, 23, 5);
    g.fillCircle(10, 10, 1.5);
    g.fillCircle(20, 6, 1.8);
    g.fillCircle(30, 10, 1.5);
  });

  // Buildings & props
  make('greenhouse-door', 64, 44, (g) => {
    g.fillStyle(0x4d6b66, 1);
    g.fillRoundedRect(4, 0, 56, 44, { tl: 18, tr: 18, bl: 0, br: 0 });
    g.fillStyle(0x7fb2ac, 1);
    g.fillRoundedRect(9, 5, 21, 39, { tl: 12, tr: 0, bl: 0, br: 0 });
    g.fillRoundedRect(34, 5, 21, 39, { tl: 0, tr: 12, bl: 0, br: 0 });
    g.lineStyle(3, 0x8a7b62, 1); // chain
    g.lineBetween(14, 24, 50, 28);
    g.lineBetween(14, 28, 50, 24);
    g.fillStyle(0xc9a227, 1); // padlock
    g.fillRoundedRect(27, 24, 10, 10, 2);
    g.lineStyle(2, 0xc9a227, 1);
    g.strokeCircle(32, 23, 3.5);
  });
  make('hut-roof', 236, 124, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillRect(10, 108, 216, 14);
    g.fillStyle(0x9c4a32, 1);
    g.fillRoundedRect(4, 0, 228, 112, 8);
    g.fillStyle(0xb85c3e, 1);
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 12; col++) {
        const x = 6 + col * 19 + (row % 2) * 9;
        if (x > 216) continue;
        g.fillRoundedRect(x, 4 + row * 15, 16, 12, 3);
      }
    }
    g.fillStyle(0x7d3a27, 1);
    g.fillRect(4, 52, 228, 6); // ridge
    g.fillStyle(0x6a6a66, 1);
    g.fillRect(176, 14, 16, 22); // chimney
  });
  make('hut-door', 48, 40, (g) => {
    g.fillStyle(0x4a2e1c, 1);
    g.fillRect(6, 0, 36, 40);
    g.fillStyle(0x6e4529, 1);
    g.fillRect(10, 3, 28, 37);
    g.lineStyle(1, 0x4a2e1c, 1);
    g.lineBetween(19, 3, 19, 40);
    g.lineBetween(29, 3, 29, 40);
    g.fillStyle(0xd8b04a, 1);
    g.fillCircle(34, 22, 2);
  });
  make('sign', 34, 44, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(17, 41, 20, 6);
    g.fillStyle(0x6e4529, 1);
    g.fillRect(15, 14, 4, 28);
    g.fillStyle(0xc49a6c, 1);
    g.fillRoundedRect(1, 2, 32, 18, 3);
    g.lineStyle(2, 0x8a603d, 1);
    g.strokeRoundedRect(1, 2, 32, 18, 3);
    g.fillStyle(0x6e4529, 1);
    g.fillRect(7, 8, 20, 2);
    g.fillRect(7, 13, 14, 2);
  });
  make('bench', 76, 36, (g) => {
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(38, 32, 72, 8);
    g.fillStyle(0x4a4a46, 1);
    g.fillRect(8, 14, 4, 18);
    g.fillRect(64, 14, 4, 18);
    g.fillStyle(0xa8753f, 1);
    g.fillRoundedRect(2, 2, 72, 8, 3);
    g.fillRoundedRect(2, 14, 72, 10, 3);
    g.fillStyle(0x6a9a4e, 0.9); // moss
    g.fillCircle(14, 4, 4);
    g.fillCircle(60, 18, 3);
  });
  make('well', 60, 64, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(30, 58, 56, 12);
    g.fillStyle(0x8f877a, 1);
    g.fillEllipse(30, 44, 52, 26);
    g.fillStyle(0x2a3a44, 1);
    g.fillEllipse(30, 41, 36, 14);
    g.fillStyle(0x5c3b25, 1);
    g.fillRect(6, 6, 5, 40);
    g.fillRect(49, 6, 5, 40);
    g.fillStyle(0x9c4a32, 1);
    g.fillTriangle(0, 10, 60, 10, 30, 0);
    g.fillStyle(0x5d8a45, 1);
    g.fillCircle(12, 50, 6);
    g.fillCircle(46, 48, 5);
  });
  make('lily-pad', 30, 20, (g) => {
    g.fillStyle(0x4f8c4a, 1);
    g.slice(15, 10, 11, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(340), false);
    g.fillPath();
    g.fillStyle(0xf6c9d8, 1);
    g.fillCircle(19, 8, 3);
  });
  make('bus-shelter', 136, 88, (g) => {
    g.fillStyle(0x000000, 0.22);
    g.fillRect(6, 74, 124, 12);
    g.fillStyle(0x5a6a6e, 1);
    g.fillRect(8, 22, 5, 58);
    g.fillRect(123, 22, 5, 58);
    g.fillStyle(0x9fc5c9, 0.55);
    g.fillRect(13, 26, 110, 34);
    g.fillStyle(0x6f8f3c, 1); // ivy
    g.fillCircle(16, 30, 9);
    g.fillCircle(24, 44, 8);
    g.fillCircle(118, 54, 9);
    g.fillStyle(0x3f4b4e, 1);
    g.fillRoundedRect(0, 8, 136, 18, 4);
    g.fillStyle(0x7a5a3c, 1);
    g.fillRect(28, 62, 80, 8);
    g.fillStyle(0x87b25c, 1);
    g.fillCircle(30, 10, 8);
    g.fillCircle(42, 6, 6);
  });
  make('bus-sign', 22, 64, (g) => {
    g.fillStyle(0x6a6a66, 1);
    g.fillRect(9, 16, 4, 48);
    g.fillStyle(0xe6c34a, 1);
    g.fillCircle(11, 11, 10);
    g.fillStyle(0x2f6b3a, 1);
    g.fillCircle(11, 11, 7);
    g.fillStyle(0xe6c34a, 1);
    g.fillRect(7, 7, 8, 8);
  });
  make('workbench', 136, 64, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillRect(4, 54, 128, 8);
    g.fillStyle(0x5e3d29, 1);
    g.fillRect(8, 26, 8, 32);
    g.fillRect(120, 26, 8, 32);
    g.fillStyle(0xa8753f, 1);
    g.fillRect(2, 14, 132, 18);
    g.fillStyle(0xc0784a, 1); // pots
    g.fillRect(14, 2, 14, 14);
    g.fillRect(32, 6, 12, 10);
    g.fillStyle(0xf1e6c8, 1); // notes
    g.fillRect(60, 10, 22, 8);
    g.fillRect(66, 6, 18, 8);
    g.fillStyle(0x8a8f96, 1); // trowel
    g.fillRect(96, 10, 22, 3);
    g.fillStyle(0xd7c06a, 1);
    g.fillCircle(110, 8, 5);
  });
  make('shelf', 92, 76, (g) => {
    g.fillStyle(0x4b2f1f, 1);
    g.fillRect(0, 0, 92, 70);
    g.fillStyle(0x6e4529, 1);
    for (let i = 0; i < 3; i++) g.fillRect(4, 6 + i * 22, 84, 18);
    const colors = [0xe2d48a, 0xd9a07a, 0xb7c98a, 0xc8b6ff, 0xf1e6c8];
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 6; j++) {
        if ((i + j) % 3 === 2) continue;
        g.fillStyle(colors[(i * 6 + j) % colors.length], 1);
        g.fillRect(8 + j * 13, 9 + i * 22, 9, 14);
      }
  });
  make('pots', 48, 32, (g) => {
    g.fillStyle(0xb5633c, 1);
    g.fillRect(4, 12, 14, 16);
    g.fillRect(22, 8, 18, 20);
    g.fillStyle(0x4c7a3d, 1);
    g.fillCircle(31, 6, 7);
    g.fillCircle(11, 10, 5);
  });
  make('rug', 104, 60, (g) => {
    g.fillStyle(0x8a3f3a, 1);
    g.fillRoundedRect(0, 0, 104, 60, 10);
    g.lineStyle(3, 0xd8b04a, 1);
    g.strokeRoundedRect(8, 8, 88, 44, 8);
    g.fillStyle(0xd8b04a, 1);
    g.fillCircle(52, 30, 6);
  });

  // Story (Wave 3): crow, journal pages, quest pins, greenhouse vestibule, night remnants
  make('crow', 34, 30, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(17, 28, 24, 5);
    g.fillStyle(0x2b2b33, 1);
    g.fillEllipse(15, 18, 22, 14); // body
    g.fillTriangle(4, 16, 0, 26, 10, 22); // tail
    g.fillCircle(24, 10, 7); // head
    g.fillStyle(0x3a3a46, 1);
    g.fillEllipse(13, 17, 14, 8); // wing
    g.fillStyle(0x4a4a56, 1);
    g.fillTriangle(29, 9, 34, 11, 29, 13); // beak
    g.fillStyle(0xf4f0e6, 1);
    g.fillCircle(26, 9, 2);
    g.fillStyle(0x1a1a22, 1);
    g.fillCircle(26.6, 9, 1.1);
    g.lineStyle(2, 0x4a4a56, 1); // legs
    g.lineBetween(13, 24, 12, 29);
    g.lineBetween(19, 24, 20, 29);
  });
  make('portrait-crow', 64, 64, (g) => {
    g.fillStyle(0x3f5f3a, 1);
    g.fillRoundedRect(0, 0, 64, 64, 10);
    g.fillStyle(0x5b8a45, 0.5);
    g.fillCircle(48, 14, 14);
    g.fillStyle(0x2b2b33, 1);
    g.fillEllipse(30, 44, 40, 26);
    g.fillCircle(42, 24, 13);
    g.fillStyle(0x4a4a56, 1);
    g.fillTriangle(52, 22, 64, 26, 52, 30);
    g.fillStyle(0xf4f0e6, 1);
    g.fillCircle(45, 22, 4);
    g.fillStyle(0x1a1a22, 1);
    g.fillCircle(46, 22, 2.2);
    g.fillStyle(0x3a3a46, 1);
    g.fillEllipse(22, 44, 24, 12);
  });
  make('stump', 36, 28, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(18, 25, 32, 7);
    g.fillStyle(0x5c3b25, 1);
    g.fillRoundedRect(4, 8, 28, 18, 4);
    g.fillStyle(0x8a603d, 1);
    g.fillEllipse(18, 9, 28, 12);
    g.lineStyle(1, 0xa8753f, 1);
    g.strokeEllipse(18, 9, 18, 7);
    g.strokeEllipse(18, 9, 9, 3.5);
    g.fillStyle(0x6a9a4e, 1);
    g.fillCircle(7, 22, 4);
  });
  make('journal-page', 24, 26, (g) => {
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(12, 24, 22, 5);
    g.fillStyle(0xf1e6c8, 1);
    g.fillRoundedRect(3, 2, 18, 22, 2);
    g.fillStyle(0xd8c9a0, 1);
    g.fillTriangle(21, 2, 21, 7, 16, 2);
    g.fillStyle(0x6e5a3c, 0.8);
    for (let i = 0; i < 5; i++) g.fillRect(6, 7 + i * 3.4, 11 - (i % 2) * 3, 1.2);
    g.fillStyle(0x8f877a, 1);
    g.fillEllipse(8, 20, 7, 5); // pebble weight
  });
  make('quest-pin', 26, 34, (g) => {
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(13, 32, 14, 4);
    g.fillStyle(0xe9a23b, 1);
    g.fillCircle(13, 12, 11);
    g.fillTriangle(4, 18, 22, 18, 13, 30);
    g.fillStyle(0xfff6d8, 1);
    g.fillCircle(13, 12, 8);
    g.fillStyle(0x2c2418, 1);
    g.fillRoundedRect(11.5, 6, 3, 8, 1.5);
    g.fillCircle(13, 17, 1.7);
  });
  make('greenhouse-door-open', 64, 44, (g) => {
    g.fillStyle(0x4d6b66, 1);
    g.fillRoundedRect(4, 0, 56, 44, { tl: 18, tr: 18, bl: 0, br: 0 });
    g.fillStyle(0x1f3a30, 1); // dark opening
    g.fillRoundedRect(14, 8, 36, 36, { tl: 14, tr: 14, bl: 0, br: 0 });
    g.fillStyle(0x7fb2ac, 1); // door leaves swung inward
    g.fillRect(9, 10, 7, 34);
    g.fillRect(48, 10, 7, 34);
    g.fillStyle(0x6a9a4e, 1);
    g.fillCircle(22, 36, 5);
    g.fillCircle(40, 30, 4);
    g.fillStyle(0xf3e38a, 0.6);
    g.fillCircle(32, 22, 5);
  });
  make('map-board', 72, 52, (g) => {
    g.fillStyle(0x4b2f1f, 1);
    g.fillRoundedRect(0, 0, 72, 48, 3);
    g.fillStyle(0xf1e6c8, 1);
    g.fillRect(5, 5, 62, 38);
    g.lineStyle(1.5, 0x8f877a, 1); // streets
    g.lineBetween(8, 30, 64, 30);
    g.lineBetween(30, 8, 30, 40);
    g.lineBetween(44, 8, 50, 40);
    g.fillStyle(0x6a9a4e, 1); // the garden
    g.fillCircle(16, 20, 6);
    g.lineStyle(2.5, 0xd84a5f, 1); // pencil line along line 3
    g.lineBetween(16, 20, 30, 30);
    g.lineBetween(30, 30, 58, 14);
    g.fillStyle(0x5a6a6e, 1); // water tower
    g.fillRect(56, 10, 5, 9);
    g.fillCircle(58.5, 10, 4);
    g.fillStyle(0x4b2f1f, 1);
    g.fillRect(34, 48, 4, 4);
  });
  make('inner-door', 48, 40, (g) => {
    g.fillStyle(0x4d6b66, 1);
    g.fillRect(4, 0, 40, 40);
    g.fillStyle(0x2a4a3c, 1);
    g.fillRoundedRect(9, 4, 30, 36, { tl: 12, tr: 12, bl: 0, br: 0 });
    g.lineStyle(3, 0x3f6b35, 1); // vines across
    g.lineBetween(8, 12, 40, 20);
    g.lineBetween(10, 30, 38, 24);
    g.lineBetween(20, 4, 26, 40);
    g.fillStyle(0x6a9a4e, 1);
    g.fillCircle(14, 13, 3);
    g.fillCircle(36, 22, 3);
    g.fillCircle(24, 36, 3);
  });
  make('planter-table', 90, 50, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillRect(4, 42, 82, 8);
    g.fillStyle(0x5e3d29, 1);
    g.fillRect(8, 22, 6, 24);
    g.fillRect(76, 22, 6, 24);
    g.fillStyle(0xa8753f, 1);
    g.fillRect(2, 14, 86, 12);
    g.fillStyle(0x7a5a3c, 1); // soil trays
    g.fillRect(8, 6, 26, 10);
    g.fillRect(40, 6, 26, 10);
    g.fillStyle(0x6a9a4e, 1);
    g.fillCircle(14, 6, 3);
    g.fillCircle(24, 5, 3);
    g.fillStyle(0x9b84d6, 1);
    g.fillCircle(48, 5, 2.5);
    g.fillCircle(58, 6, 2.5);
    g.fillStyle(0xf1e6c8, 1); // seed packets
    g.fillRect(70, 8, 10, 7);
  });
  make('snail', 18, 14, (g) => {
    g.fillStyle(0xc9b48a, 1);
    g.fillEllipse(8, 11, 15, 5);
    g.fillStyle(0x8a603d, 1);
    g.fillCircle(11, 7, 5.5);
    g.lineStyle(1.2, 0x5c3b25, 1);
    g.strokeCircle(11, 7, 3);
    g.lineStyle(1, 0xc9b48a, 1);
    g.lineBetween(3, 9, 1, 4);
    g.lineBetween(4, 9, 4, 4);
  });
  make('mole-mound', 30, 18, (g) => {
    g.fillStyle(0x000000, 0.15);
    g.fillEllipse(15, 16, 28, 5);
    g.fillStyle(0x5a4028, 1);
    g.fillEllipse(15, 11, 28, 12);
    g.fillStyle(0x7a5a3c, 1);
    g.fillEllipse(14, 8, 18, 8);
    g.fillStyle(0x3a2a1e, 1);
    g.fillEllipse(15, 10, 7, 3);
  });
  make('feather', 10, 18, (g) => {
    g.fillStyle(0x2b2b33, 1);
    g.fillEllipse(5, 7, 7, 13);
    g.lineStyle(1, 0x6a6a78, 1);
    g.lineBetween(5, 1, 5, 17);
  });
  make('puddle', 34, 16, (g) => {
    g.fillStyle(0x4f8fa6, 0.45);
    g.fillEllipse(17, 8, 32, 13);
    g.fillStyle(0xffffff, 0.25);
    g.fillEllipse(12, 6, 10, 4);
  });

  // Episode 2: owl, tramline, water tower, greenhouse heart
  make('owl', 34, 38, (g) => {
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(17, 35, 22, 6);
    g.fillStyle(0x8e6b4c, 1); // tawny cloak & wings
    g.fillEllipse(17, 23, 24, 22);
    g.fillStyle(0xe8dcc4, 1); // cream speckled breast
    g.fillEllipse(17, 25, 14, 16);
    g.fillStyle(0xa8825c, 1); // wing feather accents
    g.fillCircle(8, 22, 2);
    g.fillCircle(26, 22, 2);
    g.fillCircle(17, 27, 1.2);
    g.fillCircle(14, 24, 1.2);
    g.fillCircle(20, 24, 1.2);
    g.fillStyle(0xb8946e, 1); // head outline
    g.fillCircle(17, 11, 10);
    g.fillStyle(0xf5ebd6, 1); // barn-owl heart face disc
    g.fillCircle(13, 10, 5.2);
    g.fillCircle(21, 10, 5.2);
    g.fillTriangle(9, 12, 25, 12, 17, 19);
    g.fillStyle(0x1e1815, 1); // dark eyes
    g.fillCircle(13.5, 10.5, 2);
    g.fillCircle(20.5, 10.5, 2);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(14, 9.8, 0.7);
    g.fillCircle(21, 9.8, 0.7);
    g.fillStyle(0xc99c58, 1); // small beak
    g.fillTriangle(15.5, 12, 18.5, 12, 17, 15.5);
    g.lineStyle(2, 0xc99c58, 1); // claws
    g.lineBetween(13, 33, 12, 36);
    g.lineBetween(21, 33, 22, 36);
  });
  make('portrait-owl', 64, 64, (g) => {
    g.fillStyle(0x243442, 1);
    g.fillRoundedRect(0, 0, 64, 64, 10);
    g.fillStyle(0xd8e8f2, 0.3); // faint moon
    g.fillCircle(50, 14, 10);
    g.fillStyle(0x8e6b4c, 1); // shoulders
    g.fillEllipse(32, 54, 46, 26);
    g.fillStyle(0xe8dcc4, 1); // cream chest
    g.fillEllipse(32, 54, 26, 20);
    g.fillStyle(0xa8825c, 1); // head rim
    g.fillCircle(32, 27, 18);
    g.fillStyle(0xf5ebd6, 1); // heart disc
    g.fillCircle(25, 25, 9);
    g.fillCircle(39, 25, 9);
    g.fillTriangle(17, 29, 47, 29, 32, 41);
    g.fillStyle(0x1e1815, 1); // expressive dark eyes
    g.fillCircle(25, 25, 3.6);
    g.fillCircle(39, 25, 3.6);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(26, 23.8, 1.2);
    g.fillCircle(40, 23.8, 1.2);
    g.fillStyle(0xd29c4e, 1); // beak
    g.fillTriangle(29, 29, 35, 29, 32, 35);
  });
  make('signpost-east', 36, 48, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(14, 45, 18, 6);
    g.fillStyle(0x5c3b25, 1);
    g.fillRect(11, 10, 5, 36);
    g.fillStyle(0xc49a6c, 1);
    g.fillRect(7, 12, 20, 11);
    g.fillTriangle(27, 10, 35, 17.5, 27, 25);
    g.lineStyle(1.5, 0x8a603d, 1);
    g.lineBetween(7, 12, 27, 12);
    g.lineBetween(7, 23, 27, 23);
    g.fillStyle(0xd84a5f, 1); // Linie 3 red stripe
    g.fillRect(10, 16, 14, 3);
  });
  make('tram-stop', 112, 64, (g) => {
    g.fillStyle(0x000000, 0.22);
    g.fillRect(6, 54, 100, 9);
    g.fillStyle(0x3e5449, 1); // metal uprights
    g.fillRect(10, 14, 5, 42);
    g.fillRect(88, 14, 5, 42);
    g.fillStyle(0xd8cfb8, 0.9); // weathered back panel
    g.fillRect(15, 18, 73, 30);
    g.fillStyle(0x9fc5c9, 0.55); // glass pane
    g.fillRect(20, 21, 36, 20);
    g.fillStyle(0x6e4529, 1); // wooden bench inside
    g.fillRect(22, 42, 60, 6);
    g.fillStyle(0x2d4036, 1); // shelter roof
    g.fillRoundedRect(4, 6, 94, 12, 3);
    g.fillStyle(0x6a9a4e, 1); // moss tufts
    g.fillCircle(18, 8, 5);
    g.fillCircle(80, 9, 4);
    g.fillStyle(0x52575b, 1); // H tram pole
    g.fillRect(101, 12, 3, 44);
    g.fillStyle(0xe6c34a, 1);
    g.fillCircle(102.5, 10, 8);
    g.fillStyle(0x2f6b3a, 1);
    g.fillCircle(102.5, 10, 5.5);
  });
  make('signal-box', 96, 76, (g) => {
    g.fillStyle(0x000000, 0.22);
    g.fillRect(6, 66, 84, 9);
    g.fillStyle(0x7d4c45, 1); // weathered brick walls
    g.fillRect(10, 24, 76, 46);
    g.lineStyle(1, 0x5c3630, 1);
    for (let y = 32; y < 70; y += 8) g.lineBetween(10, y, 86, y);
    g.fillStyle(0x3a2a1e, 1); // shuttered window + door
    g.fillRect(20, 32, 24, 18);
    g.fillRect(54, 34, 20, 36);
    g.fillStyle(0xd8b04a, 1);
    g.fillCircle(58, 52, 2);
    g.fillStyle(0x3c454a, 1); // slate roof
    g.fillTriangle(4, 26, 92, 26, 48, 4);
    g.fillStyle(0x5d8a45, 1); // ivy on roof edge
    g.fillCircle(18, 25, 6);
    g.fillCircle(26, 22, 4);
  });
  make('water-tower', 120, 110, (g) => {
    g.fillStyle(0x000000, 0.24);
    g.fillEllipse(60, 103, 106, 14);
    g.fillStyle(0x7d4c45, 1); // brick base
    g.fillRoundedRect(20, 48, 80, 56, 6);
    g.lineStyle(1, 0x5c3630, 0.9);
    for (let y = 56; y < 100; y += 8) g.lineBetween(22, y, 98, y);
    g.fillStyle(0x3a2a1e, 1); // arched tower door
    g.fillRoundedRect(49, 76, 22, 28, { tl: 10, tr: 10, bl: 0, br: 0 });
    g.fillStyle(0x496570, 1); // upper water tank
    g.fillRoundedRect(14, 22, 92, 32, 6);
    g.lineStyle(2.5, 0x35464d, 1); // iron hoops
    g.lineBetween(14, 30, 106, 30);
    g.lineBetween(14, 44, 106, 44);
    g.fillStyle(0x35464d, 1); // conical slate roof
    g.fillTriangle(8, 24, 112, 24, 60, 2);
    g.fillStyle(0x5d8a45, 1); // moss & climbing vine
    g.fillCircle(24, 52, 6);
    g.fillCircle(28, 66, 5);
    g.fillCircle(92, 24, 5);
  });
  make('tower-cistern', 64, 46, (g) => {
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(32, 42, 58, 9);
    g.fillStyle(0x6f7678, 1); // stone cistern
    g.fillRoundedRect(6, 12, 52, 30, 5);
    g.fillStyle(0x4c5254, 1); // dry basin interior
    g.fillEllipse(32, 13, 44, 12);
    g.lineStyle(2, 0x3a2a1e, 1); // crack line
    g.lineBetween(24, 18, 29, 32);
    g.lineBetween(29, 32, 25, 40);
    g.fillStyle(0x8a4836, 1); // rusted valve wheel
    g.fillCircle(46, 28, 6);
    g.fillStyle(0x4f8fa6, 0.6); // leaking trickle puddle
    g.fillEllipse(26, 43, 16, 4);
  });
  make('tower-cistern-fixed', 64, 46, (g) => {
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(32, 42, 58, 9);
    g.fillStyle(0x788588, 1);
    g.fillRoundedRect(6, 12, 52, 30, 5);
    g.fillStyle(0x64b5d1, 1); // filled clear spring water
    g.fillEllipse(32, 13, 44, 12);
    g.fillStyle(0xdff6ff, 0.7);
    g.fillEllipse(26, 12, 14, 4);
    g.fillStyle(0xe6c34a, 1); // gleaming brass valve
    g.fillCircle(46, 28, 6);
    g.fillStyle(0x6a9a4e, 1);
    g.fillCircle(12, 38, 4);
  });
  make('railing', 92, 28, (g) => {
    g.fillStyle(0x000000, 0.16);
    g.fillRect(4, 22, 84, 5);
    g.fillStyle(0x787670, 1); // stone end posts
    g.fillRect(2, 4, 10, 22);
    g.fillRect(80, 4, 10, 22);
    g.fillStyle(0x353c40, 1); // wrought-iron rail & bars
    g.fillRect(10, 6, 72, 3);
    g.fillRect(10, 18, 72, 2);
    for (let x = 18; x < 78; x += 12) g.fillRect(x, 8, 2, 12);
    g.fillStyle(0x5d8a45, 1);
    g.fillCircle(6, 6, 3.5);
  });
  make('inner-door-open', 48, 40, (g) => {
    g.fillStyle(0x4d6b66, 1);
    g.fillRect(4, 0, 40, 40);
    g.fillStyle(0x1b3d38, 1); // deep moonlit sanctuary opening
    g.fillRoundedRect(9, 4, 30, 36, { tl: 12, tr: 12, bl: 0, br: 0 });
    g.fillStyle(0x7ae7c7, 0.45); // soft fern glow inside
    g.fillCircle(24, 22, 10);
    g.fillStyle(0x3f6b35, 1); // vines parted neatly to sides
    g.fillCircle(9, 14, 4);
    g.fillCircle(39, 16, 4);
    g.fillCircle(10, 32, 3.5);
    g.fillCircle(38, 30, 3.5);
  });
  make('fountain-basin', 86, 56, (g) => {
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(43, 49, 78, 12);
    g.fillStyle(0x828988, 1); // carved stone rim
    g.fillEllipse(43, 34, 76, 36);
    g.fillStyle(0x4ca3b8, 1); // clear turquoise water
    g.fillEllipse(43, 31, 60, 24);
    g.fillStyle(0x9ce8f5, 0.6); // ripple sheen
    g.fillEllipse(37, 29, 26, 8);
    g.fillStyle(0x6b7270, 1); // central pedestal spout
    g.fillRoundedRect(38, 14, 10, 18, 3);
    g.fillStyle(0xdffcf4, 0.8);
    g.fillCircle(43, 14, 3);
    g.fillStyle(0x5d8a45, 1); // moss spots
    g.fillCircle(14, 38, 5);
    g.fillCircle(70, 40, 4);
  });
  make('seed-archive', 104, 68, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillRect(4, 60, 96, 7);
    g.fillStyle(0x5e3d29, 1); // walnut frame
    g.fillRoundedRect(2, 2, 100, 62, 4);
    g.fillStyle(0x7a5236, 1); // drawer grid
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        const dx = 8 + c * 23;
        const dy = 30 + r * 15;
        g.fillRect(dx, dy, 19, 12);
        g.fillStyle(0xd8b04a, 1);
        g.fillCircle(dx + 9.5, dy + 6, 1.8);
        g.fillStyle(0x7a5236, 1);
      }
    }
    g.fillStyle(0x3f291c, 1); // upper jar shelf
    g.fillRect(8, 7, 88, 18);
    const jarColors = [0x7ae7c7, 0x9b84d6, 0xf3e38a, 0xd86b7a, 0xa8d48c];
    for (let i = 0; i < 5; i++) {
      g.fillStyle(jarColors[i], 0.9);
      g.fillRoundedRect(14 + i * 16, 11, 10, 13, 3);
    }
  });
  make('moon-desk', 92, 52, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillRect(4, 44, 84, 7);
    g.fillStyle(0x5e3d29, 1); // legs
    g.fillRect(10, 26, 7, 22);
    g.fillRect(75, 26, 7, 22);
    g.fillStyle(0x8f6239, 1); // tabletop
    g.fillRoundedRect(4, 14, 84, 16, 3);
    g.fillStyle(0xf1e6c8, 1); // open moon chart
    g.fillRect(28, 16, 32, 12);
    g.fillStyle(0x3a4d66, 1);
    g.fillCircle(44, 22, 4);
    g.fillStyle(0xd8b04a, 1); // brass lamp
    g.fillRect(14, 10, 4, 10);
    g.fillStyle(0xf6d878, 1);
    g.fillTriangle(10, 12, 22, 12, 16, 4);
    g.fillStyle(0xb5633c, 1); // small pot
    g.fillRect(68, 12, 10, 9);
    g.fillStyle(0x7ae7c7, 1);
    g.fillCircle(73, 10, 4);
  });

  // Episode 3: denseFog, Night Violet, M., Hill Path, Orchard & Cottage
  make('obstacle-denseFog', 120, 120, (g) => {
    const rnd = seededRandom(37);
    for (let i = 0; i < 24; i++) {
      const cx = 18 + rnd() * 84;
      const cy = 18 + rnd() * 84;
      const r = 18 + rnd() * 20;
      g.fillStyle(i % 2 === 0 ? 0xc7dcd8 : 0x9bbab5, 0.34);
      g.fillCircle(cx, cy, r);
    }
    for (let i = 0; i < 12; i++) {
      g.fillStyle(0xe8f6f2, 0.45);
      g.fillEllipse(20 + rnd() * 80, 22 + rnd() * 76, 36 + rnd() * 28, 14 + rnd() * 8);
    }
    g.fillStyle(0x7ae7c7, 0.45);
    for (let i = 0; i < 6; i++) g.fillCircle(24 + rnd() * 72, 24 + rnd() * 72, 2.2);
  });
  make('plant-night-violet-sprout', 18, 18, (g) => {
    g.fillStyle(0x3f6b35, 1);
    g.fillRect(8, 8, 2, 9);
    g.fillStyle(0x6f7bf7, 1);
    g.fillCircle(9, 7, 2.8);
  });
  make('plant-night-violet-growing', 26, 34, (g) => {
    g.fillStyle(0x4c7a3d, 1);
    g.fillEllipse(13, 27, 14, 7);
    g.fillStyle(0x3f6b35, 1);
    g.fillRect(12, 10, 2, 18);
    g.fillStyle(0x6f7bf7, 1);
    g.fillCircle(8, 16, 3);
    g.fillCircle(18, 15, 3);
    g.fillCircle(13, 9, 3.4);
  });
  make('plant-night-violet-mature', 36, 44, (g) => {
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(18, 41, 24, 6);
    g.fillStyle(0x4c7a3d, 1);
    g.fillEllipse(18, 34, 22, 10);
    g.fillStyle(0x3f6b35, 1);
    g.fillRect(17, 12, 2.5, 22);
    g.fillRect(10, 17, 2, 17);
    g.fillRect(24, 17, 2, 17);
    for (const [fx, fy] of [
      [18, 10],
      [11, 16],
      [25, 16],
      [14, 21],
      [22, 21],
    ]) {
      g.fillStyle(0x6f7bf7, 1);
      g.fillCircle(fx, fy, 4.2);
      g.fillStyle(0x9ea8ff, 1);
      g.fillCircle(fx - 0.8, fy - 0.8, 2.2);
      g.fillStyle(0xf6d878, 1);
      g.fillCircle(fx, fy, 1.3);
    }
  });
  make('m', 28, 40, (g) => {
    g.fillStyle(0x3f5f3a, 1); // gardening trousers / skirt hem
    g.fillRoundedRect(8, 26, 12, 12, 3);
    g.fillStyle(0xe8dec8, 1); // cream linen sleeves
    g.fillRoundedRect(5, 15, 18, 14, 5);
    g.fillStyle(0x4c7a3d, 1); // moss apron
    g.fillRoundedRect(7, 16, 14, 15, 4);
    g.fillStyle(0xa8753f, 1); // pocket & tool strap
    g.fillRect(10, 22, 8, 5);
    g.fillStyle(0xf0c29a, 1); // face
    g.fillCircle(14, 11, 6.8);
    g.fillStyle(0x8a7d72, 1); // silver-streaked hair bun
    g.fillCircle(8, 11, 3.2);
    g.fillStyle(0xe8cf7a, 1); // woven sun hat
    g.fillEllipse(14, 6.5, 24, 7.5);
    g.fillRoundedRect(8, 0, 12, 7.5, 4);
    g.fillStyle(0x9b84d6, 1); // dried lavender sprig on hatband
    g.fillRect(8, 4.5, 12, 2);
    g.fillCircle(19, 4, 2);
    g.fillStyle(0x3a2a1e, 1); // gentle eye
    g.fillCircle(17, 12, 1.2);
  });
  make('portrait-m', 64, 64, (g) => {
    g.fillStyle(0x354d32, 1); // warm orchard backdrop
    g.fillRoundedRect(0, 0, 64, 64, 10);
    g.fillStyle(0xf4c430, 0.22); // afternoon sun glow
    g.fillCircle(48, 16, 16);
    g.fillStyle(0x4c7a3d, 1); // shoulders & apron
    g.fillEllipse(32, 56, 46, 24);
    g.fillStyle(0xe8dec8, 1);
    g.fillRoundedRect(20, 42, 24, 18, 6);
    g.fillStyle(0x4c7a3d, 1);
    g.fillRoundedRect(23, 44, 18, 16, 4);
    g.fillStyle(0x7c6f65, 1); // silver-chestnut hair
    g.fillCircle(20, 32, 8);
    g.fillCircle(44, 32, 8);
    g.fillStyle(0xf0c29a, 1); // warm face
    g.fillCircle(32, 31, 13);
    g.fillStyle(0x3a2a1e, 1); // kind eyes
    g.fillCircle(27, 31, 2);
    g.fillCircle(37, 31, 2);
    g.lineStyle(1.8, 0x9e5d48, 1); // warm smile
    g.beginPath();
    g.arc(32, 34, 4.5, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
    g.strokePath();
    g.fillStyle(0xe8cf7a, 1); // straw hat brim & crown
    g.fillEllipse(32, 20, 46, 12);
    g.fillRoundedRect(19, 8, 26, 14, 7);
    g.fillStyle(0x9b84d6, 1); // lavender hat ribbon & sprig
    g.fillRect(19, 17, 26, 3);
    g.fillCircle(41, 16, 3.2);
  });
  make('signpost-north', 32, 48, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(16, 45, 18, 6);
    g.fillStyle(0x5c3b25, 1);
    g.fillRect(13.5, 12, 5, 34);
    g.fillStyle(0xc49a6c, 1);
    g.fillRoundedRect(5, 12, 22, 12, 2);
    g.fillTriangle(11, 12, 21, 12, 16, 3);
    g.fillStyle(0x5d8a45, 1);
    g.fillCircle(9, 18, 2.2);
    g.fillStyle(0xd8b04a, 1); // brass bell
    g.fillCircle(23, 26, 2.5);
  });
  make('waystone', 38, 42, (g) => {
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(19, 38, 32, 8);
    g.fillStyle(0x7c8280, 1);
    g.fillRoundedRect(8, 10, 22, 28, { tl: 10, tr: 10, bl: 3, br: 3 });
    g.fillStyle(0x969c99, 1);
    g.fillRoundedRect(10, 12, 16, 22, { tl: 8, tr: 8, bl: 2, br: 2 });
    g.fillStyle(0x6a9a4e, 1); // moss cap
    g.fillCircle(12, 12, 5);
    g.fillCircle(26, 33, 4);
    g.fillStyle(0x4c5250, 1); // carved lettering lines
    g.fillRect(13, 18, 12, 2);
    g.fillRect(14, 23, 10, 2);
  });
  make('hill-lantern', 38, 48, (g) => {
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(19, 44, 30, 8);
    g.fillStyle(0x7c8280, 1);
    g.fillRoundedRect(11, 28, 16, 16, 3);
    g.fillRect(15, 22, 8, 8);
    g.fillRoundedRect(10, 10, 18, 14, 3);
    g.fillStyle(0xf3e38a, 0.85); // softly glowing clean lantern glass
    g.fillRect(14, 13, 10, 8);
    g.fillStyle(0x5d6462, 1); // stone pagoda cap
    g.fillTriangle(4, 12, 34, 12, 19, 2);
    g.fillStyle(0x6a9a4e, 1);
    g.fillCircle(11, 9, 4);
  });
  make('cottage-roof', 224, 118, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillRect(8, 104, 208, 12);
    g.fillStyle(0x7d4c3e, 1);
    g.fillRoundedRect(4, 0, 216, 106, 8);
    g.fillStyle(0x945b4a, 1);
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 11; col++) {
        const x = 6 + col * 19 + (row % 2) * 9;
        if (x > 204) continue;
        g.fillRoundedRect(x, 6 + row * 15, 16, 12, 3);
      }
    }
    g.fillStyle(0x5e362b, 1);
    g.fillRect(4, 50, 216, 6);
    g.fillStyle(0x6a9a4e, 0.85);
    g.fillCircle(24, 96, 6);
    g.fillCircle(186, 94, 5);
    g.fillStyle(0x7d4537, 1); // brick chimney
    g.fillRect(40, 10, 18, 24);
  });
  make('cottage-door', 48, 40, (g) => {
    g.fillStyle(0x4a2e1c, 1);
    g.fillRoundedRect(6, 0, 36, 40, { tl: 12, tr: 12, bl: 0, br: 0 });
    g.fillStyle(0x6e4529, 1);
    g.fillRoundedRect(10, 4, 28, 36, { tl: 9, tr: 9, bl: 0, br: 0 });
    g.fillStyle(0x5d8a45, 1); // flower wreath on door
    g.strokeCircle(24, 16, 6);
    g.fillCircle(24, 11, 3);
    g.fillStyle(0xee8f8f, 1);
    g.fillCircle(20, 18, 2);
    g.fillCircle(28, 18, 2);
    g.fillStyle(0xd8b04a, 1);
    g.fillCircle(33, 24, 2);
  });
  make('orchard-sluice', 72, 46, (g) => {
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(36, 42, 66, 9);
    g.fillStyle(0x7c8280, 1); // stone channel walls
    g.fillRoundedRect(6, 14, 60, 28, 4);
    g.fillStyle(0x5a4028, 1); // dry wooden trough
    g.fillRect(12, 20, 48, 14);
    g.fillStyle(0x8a603d, 1); // jammed timber sluice gate
    g.fillRect(28, 6, 16, 32);
    g.fillStyle(0x8a4836, 1); // rusted pin slot
    g.fillCircle(36, 14, 4);
  });
  make('orchard-sluice-fixed', 72, 46, (g) => {
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(36, 42, 66, 9);
    g.fillStyle(0x7c8280, 1);
    g.fillRoundedRect(6, 14, 60, 28, 4);
    g.fillStyle(0x4ca3b8, 1); // flowing brook water
    g.fillRect(10, 20, 52, 14);
    g.fillStyle(0xdff6ff, 0.75);
    g.fillRect(14, 23, 20, 3);
    g.fillRect(40, 28, 18, 3);
    g.fillStyle(0x8a603d, 1); // lifted sluice gate + brass pin
    g.fillRect(28, 2, 16, 20);
    g.fillStyle(0xe6c34a, 1);
    g.fillCircle(36, 10, 4);
  });
  make('beehive', 62, 46, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(31, 42, 56, 8);
    g.fillStyle(0x5c3b25, 1); // stand legs
    g.fillRect(10, 32, 6, 10);
    g.fillRect(46, 32, 6, 10);
    g.fillStyle(0xc99c58, 1); // two larch hive boxes
    g.fillRoundedRect(6, 14, 22, 20, 3);
    g.fillRoundedRect(34, 16, 22, 18, 3);
    g.fillStyle(0x7a5236, 1); // slanted lids & dark entrances
    g.fillTriangle(4, 16, 30, 16, 17, 6);
    g.fillTriangle(32, 18, 58, 18, 45, 8);
    g.fillRect(12, 29, 10, 3);
    g.fillRect(40, 29, 10, 3);
  });
  make('beehive-active', 62, 46, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(31, 42, 56, 8);
    g.fillStyle(0x5c3b25, 1);
    g.fillRect(10, 32, 6, 10);
    g.fillRect(46, 32, 6, 10);
    g.fillStyle(0xd9ae62, 1);
    g.fillRoundedRect(6, 14, 22, 20, 3);
    g.fillRoundedRect(34, 16, 22, 18, 3);
    g.fillStyle(0x8a5b3c, 1);
    g.fillTriangle(4, 16, 30, 16, 17, 6);
    g.fillTriangle(32, 18, 58, 18, 45, 8);
    g.fillStyle(0xf4c430, 1); // warm golden bees hovering around
    for (const [bx, by] of [
      [15, 8],
      [28, 12],
      [44, 6],
      [54, 18],
      [22, 31],
    ]) {
      g.fillCircle(bx, by, 2);
      g.fillStyle(0x2b2418, 1);
      g.fillCircle(bx - 1, by, 1);
      g.fillStyle(0xf4c430, 1);
    }
  });
  make('cider-press', 64, 52, (g) => {
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(32, 47, 56, 9);
    g.fillStyle(0x6e4529, 1); // timber frame
    g.fillRect(12, 14, 6, 32);
    g.fillRect(46, 14, 6, 32);
    g.fillRect(8, 12, 48, 7);
    g.fillStyle(0xa8753f, 1); // slatted pressing basket
    g.fillRoundedRect(18, 22, 28, 20, 3);
    g.lineStyle(1.5, 0x5c3b25, 1);
    for (let x = 22; x <= 42; x += 5) g.lineBetween(x, 22, x, 42);
    g.fillStyle(0x52575b, 1); // iron screw & handle
    g.fillRect(30, 4, 4, 18);
    g.fillRect(20, 4, 24, 3);
    g.fillStyle(0xd84a5f, 1); // basket of red apples
    g.fillCircle(10, 42, 3);
    g.fillCircle(14, 44, 3);
  });
  make('apple-tree', 92, 100, (g) => drawTree(g, 92, 100, 0x456338, 0x5f7e47, 0x7a965a));
  make('apple-tree-bloom', 92, 100, (g) => {
    drawTree(g, 92, 100, 0x4b773c, 0x6a9a4e, 0x87b863);
    const rnd = seededRandom(88);
    for (let i = 0; i < 18; i++) {
      g.fillStyle(i % 2 === 0 ? 0xf9d8e2 : 0xfff5f8, 0.95);
      g.fillCircle(24 + rnd() * 44, 14 + rnd() * 42, 3.2);
    }
  });
  make('mother-apple-tree', 128, 128, (g) => {
    g.fillStyle(0x000000, 0.24);
    g.fillEllipse(64, 118, 96, 18);
    g.fillStyle(0x5c3b25, 1); // broad ancient trunk & roots
    g.fillRect(54, 72, 20, 44);
    g.fillTriangle(44, 116, 56, 116, 56, 98);
    g.fillTriangle(84, 116, 72, 116, 72, 98);
    g.fillStyle(0x3f6034, 1);
    g.fillCircle(36, 62, 28);
    g.fillCircle(92, 62, 28);
    g.fillCircle(64, 42, 38);
    g.fillStyle(0x5b7d46, 1);
    g.fillCircle(50, 44, 24);
    g.fillCircle(80, 48, 22);
    g.fillStyle(0x769959, 0.85);
    g.fillCircle(56, 26, 14);
  });
  make('mother-apple-tree-bloom', 128, 128, (g) => {
    g.fillStyle(0x000000, 0.24);
    g.fillEllipse(64, 118, 96, 18);
    g.fillStyle(0x5c3b25, 1);
    g.fillRect(54, 72, 20, 44);
    g.fillTriangle(44, 116, 56, 116, 56, 98);
    g.fillTriangle(84, 116, 72, 116, 72, 98);
    g.fillStyle(0x4b773c, 1);
    g.fillCircle(36, 62, 28);
    g.fillCircle(92, 62, 28);
    g.fillCircle(64, 42, 38);
    g.fillStyle(0x6a9a4e, 1);
    g.fillCircle(50, 44, 24);
    g.fillCircle(80, 48, 22);
    const rnd = seededRandom(1924);
    for (let i = 0; i < 34; i++) {
      g.fillStyle(i % 3 === 0 ? 0xfff5f8 : 0xf7bfd0, 0.95);
      g.fillCircle(24 + rnd() * 80, 14 + rnd() * 62, 3.6);
      if (i % 5 === 0) {
        g.fillStyle(0xf6d878, 0.9);
        g.fillCircle(24 + rnd() * 80, 14 + rnd() * 62, 1.8);
      }
    }
  });
  make('stove', 84, 64, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillRect(6, 56, 72, 7);
    g.fillStyle(0x3a4d3f, 1); // green ceramic stove base
    g.fillRoundedRect(10, 12, 64, 46, 5);
    g.lineStyle(1.5, 0x5c7863, 1); // tile seams
    for (let y = 24; y < 56; y += 11) g.lineBetween(12, y, 72, y);
    for (let x = 26; x < 70; x += 16) g.lineBetween(x, 14, x, 56);
    g.fillStyle(0x2a241f, 1); // iron hearth door
    g.fillRoundedRect(28, 34, 26, 20, 3);
    g.fillStyle(0xf08c3a, 0.9); // warm ember glow
    g.fillRect(34, 42, 14, 7);
    g.fillStyle(0xd8b04a, 1); // brass kettle on top
    g.fillEllipse(52, 10, 18, 10);
    g.fillStyle(0x52575b, 1); // stovepipe
    g.fillRect(20, 0, 10, 14);
  });
  make('valley-map', 88, 54, (g) => {
    g.fillStyle(0x4b2f1f, 1);
    g.fillRoundedRect(0, 0, 88, 50, 3);
    g.fillStyle(0xf1e6c8, 1);
    g.fillRect(5, 5, 78, 40);
    g.fillStyle(0x6a9a4e, 0.8); // garden & orchards
    g.fillCircle(18, 28, 6);
    g.fillCircle(44, 22, 8);
    g.lineStyle(2, 0x4f8fa6, 1); // river
    g.lineBetween(8, 38, 80, 14);
    g.lineStyle(2, 0xd84a5f, 1); // dashed trail to mill
    g.lineBetween(44, 22, 70, 32);
    g.fillStyle(0xb5633c, 1);
    g.fillRect(67, 29, 7, 7);
  });
  make('herb-rack', 88, 56, (g) => {
    g.fillStyle(0x5e3d29, 1);
    g.fillRect(4, 6, 80, 7);
    g.fillRect(10, 2, 6, 50);
    g.fillRect(72, 2, 6, 50);
    const colors = [0x9b84d6, 0x6a9a4e, 0xd9c26a, 0x8db05a, 0xc87890];
    for (let i = 0; i < 5; i++) {
      const bx = 18 + i * 13;
      g.fillStyle(0x8a603d, 1);
      g.fillRect(bx - 1, 13, 3, 6);
      g.fillStyle(colors[i], 1);
      g.fillTriangle(bx - 5, 36, bx + 5, 36, bx, 17);
    }
  });
  make('tea-table', 84, 50, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(42, 44, 72, 10);
    g.fillStyle(0x5e3d29, 1);
    g.fillRect(22, 26, 6, 18);
    g.fillRect(56, 26, 6, 18);
    g.fillStyle(0xa8753f, 1);
    g.fillEllipse(42, 22, 78, 26);
    g.fillStyle(0xf1e6c8, 1); // two teacups
    g.fillCircle(28, 20, 4.5);
    g.fillCircle(54, 22, 4.5);
    g.fillStyle(0x6a9a4e, 1);
    g.fillCircle(54, 22, 2);
    g.fillStyle(0xb5633c, 1); // teapot
    g.fillCircle(41, 18, 6);
  });
  make('seed-chest', 68, 44, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillRect(4, 37, 60, 6);
    g.fillStyle(0x6e4529, 1);
    g.fillRoundedRect(4, 12, 60, 28, 4);
    g.fillStyle(0x9c5a3c, 1); // painted lid
    g.fillRoundedRect(2, 6, 64, 14, 4);
    g.fillStyle(0xd8b04a, 1); // brass clasp
    g.fillRect(31, 16, 6, 8);
    g.fillStyle(0xf1e6c8, 1); // seed packet peeking out
    g.fillRect(14, 8, 10, 6);
  });

  // Episode 4: Hollyhock, Jakob, Old Mill, Mill Interior & River Farms
  make('plant-hollyhock-sprout', 18, 20, (g) => {
    g.fillStyle(0x3f6b35, 1);
    g.fillRect(8, 7, 2, 11);
    g.fillStyle(0x5b8a45, 1);
    g.fillCircle(6, 13, 3);
    g.fillCircle(12, 12, 3);
    g.fillStyle(0xe8739c, 1);
    g.fillCircle(9, 6, 2.4);
  });
  make('plant-hollyhock-growing', 26, 38, (g) => {
    g.fillStyle(0x4c7a3d, 1);
    g.fillEllipse(13, 31, 16, 8);
    g.fillStyle(0x3f6b35, 1);
    g.fillRect(12, 9, 2.5, 22);
    g.fillStyle(0xe8739c, 1);
    g.fillCircle(10, 17, 3.2);
    g.fillCircle(16, 14, 3.2);
    g.fillCircle(13, 9, 3.5);
    g.fillStyle(0xf9d8e2, 1);
    g.fillCircle(13, 9, 1.3);
  });
  make('plant-hollyhock-mature', 34, 54, (g) => {
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(17, 50, 22, 6);
    g.fillStyle(0x4c7a3d, 1);
    g.fillEllipse(17, 42, 22, 10);
    g.fillStyle(0x3f6b35, 1);
    g.fillRect(15.5, 8, 3, 35);
    g.fillRect(9.5, 18, 2, 24);
    g.fillRect(22.5, 20, 2, 22);
    for (const [fx, fy] of [
      [17, 8],
      [14, 15],
      [20, 19],
      [16, 25],
      [10, 20],
      [11, 28],
      [23, 22],
      [23, 30],
    ]) {
      g.fillStyle(0xe8739c, 1);
      g.fillCircle(fx, fy, 4.2);
      g.fillStyle(0xf7b2cb, 1);
      g.fillCircle(fx - 0.6, fy - 0.6, 2.3);
      g.fillStyle(0xf6d878, 1);
      g.fillCircle(fx, fy, 1.3);
    }
  });
  make('jakob', 28, 40, (g) => {
    g.fillStyle(0x4a3b2e, 1); // work boots & trousers
    g.fillRoundedRect(8, 26, 5, 12, 2);
    g.fillRoundedRect(15, 26, 5, 12, 2);
    g.fillStyle(0x7c6f65, 1); // sturdy slate-grey vest
    g.fillRoundedRect(5, 15, 18, 15, 5);
    g.fillStyle(0xe8dec8, 1); // flour-dusted miller's apron
    g.fillRoundedRect(8, 16, 12, 16, 3);
    g.fillStyle(0xf0c29a, 1); // face
    g.fillCircle(14, 11, 6.8);
    g.fillStyle(0xd8d2c7, 1); // neat silver beard & brows
    g.fillEllipse(14, 15, 10, 6);
    g.fillStyle(0x52575b, 1); // flat baker/miller cap
    g.fillRoundedRect(7, 2, 14, 6, 3);
    g.fillRect(10, 6, 11, 2.5);
    g.fillStyle(0x3a2a1e, 1);
    g.fillCircle(17, 11, 1.2);
  });
  make('portrait-jakob', 64, 64, (g) => {
    g.fillStyle(0x2f3b40, 1); // riverside backdrop
    g.fillRoundedRect(0, 0, 64, 64, 10);
    g.fillStyle(0x64b5d1, 0.2); // millstream sheen
    g.fillCircle(48, 16, 16);
    g.fillStyle(0x7c6f65, 1); // shoulders
    g.fillEllipse(32, 56, 46, 24);
    g.fillStyle(0xe8dec8, 1); // flour-dusted apron front
    g.fillRoundedRect(21, 43, 22, 18, 5);
    g.fillStyle(0xf0c29a, 1); // weathered warm face
    g.fillCircle(32, 31, 13);
    g.fillStyle(0xd8d2c7, 1); // silver hair & full tidy beard
    g.fillCircle(20, 31, 5);
    g.fillCircle(44, 31, 5);
    g.fillEllipse(32, 40, 22, 13);
    g.fillStyle(0x3a2a1e, 1); // kind crinkled eyes
    g.fillCircle(27, 29, 2);
    g.fillCircle(37, 29, 2);
    g.fillStyle(0xd8d2c7, 1); // bushy brows
    g.fillRect(24, 24, 6, 2.2);
    g.fillRect(34, 24, 6, 2.2);
    g.fillStyle(0x52575b, 1); // miller cap
    g.fillRoundedRect(16, 10, 32, 12, 5);
    g.fillRoundedRect(19, 19, 28, 5, 2);
  });
  make('mill-roof', 236, 124, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillRect(10, 108, 216, 14);
    g.fillStyle(0x63483b, 1); // weathered timber & slate roof
    g.fillRoundedRect(4, 0, 228, 112, 8);
    g.fillStyle(0x785a4a, 1);
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 12; col++) {
        const x = 6 + col * 19 + (row % 2) * 9;
        if (x > 216) continue;
        g.fillRoundedRect(x, 4 + row * 15, 16, 12, 3);
      }
    }
    g.fillStyle(0x4a342a, 1);
    g.fillRect(4, 52, 228, 6);
    g.fillStyle(0x6a9a4e, 0.85); // moss tufts
    g.fillCircle(34, 90, 7);
    g.fillCircle(198, 24, 6);
    g.fillStyle(0x7d4537, 1); // brick chimney
    g.fillRect(172, 12, 18, 24);
  });
  make('mill-wheel', 64, 72, (g) => {
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(32, 66, 48, 10);
    g.fillStyle(0x5c3b25, 1); // wooden rim & spokes
    g.lineStyle(5, 0x5c3b25, 1);
    g.strokeCircle(32, 36, 26);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.lineStyle(3, 0x6e4529, 1);
      g.lineBetween(32, 36, 32 + Math.cos(a) * 26, 36 + Math.sin(a) * 26);
      g.fillStyle(0x4a2e1c, 1); // paddles
      g.fillCircle(32 + Math.cos(a) * 27, 36 + Math.sin(a) * 27, 4);
    }
    g.fillStyle(0x52575b, 1); // jammed iron axle
    g.fillCircle(32, 36, 7);
    g.fillStyle(0x8a4836, 1); // rust spot
    g.fillCircle(34, 36, 3.5);
  });
  make('mill-wheel-turning', 64, 72, (g) => {
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(32, 66, 48, 10);
    g.fillStyle(0x4ca3b8, 0.45); // flowing millstream splash underneath
    g.fillEllipse(32, 62, 54, 14);
    g.lineStyle(5, 0x8a603d, 1);
    g.strokeCircle(32, 36, 26);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.22;
      g.lineStyle(3, 0xa8753f, 1);
      g.lineBetween(32, 36, 32 + Math.cos(a) * 26, 36 + Math.sin(a) * 26);
      g.fillStyle(0x6e4529, 1);
      g.fillCircle(32 + Math.cos(a) * 27, 36 + Math.sin(a) * 27, 4);
    }
    g.fillStyle(0xe6c34a, 1); // oiled gleaming axle
    g.fillCircle(32, 36, 7);
    g.fillStyle(0xdff6ff, 0.9); // water spray droplets
    for (const [dx, dy] of [
      [14, 52],
      [26, 58],
      [42, 56],
      [50, 48],
    ])
      g.fillCircle(dx, dy, 2.4);
  });
  make('apple-rootstock', 72, 76, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(36, 70, 46, 10);
    g.fillStyle(0x5c3b25, 1); // pruned old trunk
    g.fillRect(30, 32, 12, 38);
    g.fillTriangle(24, 70, 32, 70, 32, 56);
    g.fillTriangle(48, 70, 40, 70, 40, 56);
    g.lineStyle(4, 0x6e4529, 1);
    g.lineBetween(34, 42, 20, 26);
    g.lineBetween(38, 38, 52, 24);
    g.fillStyle(0xc9a47a, 1); // fresh grafting cut
    g.fillEllipse(36, 32, 12, 5);
    g.fillStyle(0x6a9a4e, 1); // just a few basal leaves
    g.fillCircle(20, 25, 5);
    g.fillCircle(52, 23, 4);
  });
  make('apple-grafted-tree', 92, 100, (g) => {
    drawTree(g, 92, 100, 0x4b773c, 0x6a9a4e, 0x87b863);
    const rnd = seededRandom(4092);
    for (let i = 0; i < 16; i++) {
      g.fillStyle(i % 2 === 0 ? 0xf9d8e2 : 0xf6d878, 0.95);
      g.fillCircle(24 + rnd() * 44, 14 + rnd() * 42, 3);
    }
  });
  make('flour-barrels', 60, 44, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(30, 39, 54, 9);
    for (const bx of [16, 40]) {
      g.fillStyle(0x8a603d, 1);
      g.fillRoundedRect(bx - 12, 10, 24, 28, 6);
      g.fillStyle(0x52575b, 1); // iron hoops
      g.fillRect(bx - 12, 16, 24, 3);
      g.fillRect(bx - 12, 28, 24, 3);
      g.fillStyle(0xc9a47a, 1); // lid
      g.fillEllipse(bx, 11, 20, 6);
    }
    g.fillStyle(0xe8739c, 1); // dried hollyhock tucked on barrel
    g.fillCircle(44, 10, 3);
  });
  make('millstone', 80, 64, (g) => {
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(40, 56, 72, 14);
    g.fillStyle(0x5e3d29, 1); // timber base
    g.fillRoundedRect(10, 24, 60, 30, 6);
    g.fillStyle(0x7c8280, 1); // basalt millstone
    g.fillEllipse(40, 26, 56, 30);
    g.lineStyle(1.5, 0x4c5250, 1);
    g.strokeEllipse(40, 26, 42, 22);
    g.fillStyle(0x3a2a1e, 1); // center eye
    g.fillEllipse(40, 26, 12, 7);
    g.fillStyle(0xe8dec8, 0.8); // dusted flour
    g.fillCircle(22, 29, 4);
    g.fillCircle(56, 24, 3);
  });
  make('flour-sacks', 76, 54, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillRect(4, 46, 68, 7);
    g.fillStyle(0x6e4529, 1); // low wooden pallet
    g.fillRect(6, 40, 64, 8);
    for (const [sx, sy] of [
      [20, 24],
      [42, 22],
      [56, 28],
    ]) {
      g.fillStyle(0xd8cfb8, 1);
      g.fillRoundedRect(sx - 10, sy - 8, 20, 24, 6);
      g.fillStyle(0x4a6984, 1); // blue mill stamp
      g.fillRect(sx - 5, sy, 10, 4);
      g.fillStyle(0xb8ad94, 1); // tied neck
      g.fillRect(sx - 4, sy - 11, 8, 4);
    }
  });
  make('mill-ledger', 76, 48, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillRect(6, 41, 64, 6);
    g.fillStyle(0x5e3d29, 1); // desk legs
    g.fillRect(10, 24, 7, 19);
    g.fillRect(59, 24, 7, 19);
    g.fillStyle(0x8f6239, 1); // desk top
    g.fillRoundedRect(4, 12, 68, 15, 3);
    g.fillStyle(0xf1e6c8, 1); // open mill ledger
    g.fillRect(20, 14, 34, 11);
    g.lineStyle(1, 0x6e4529, 1);
    g.lineBetween(37, 14, 37, 25);
    g.fillStyle(0x3a2a1e, 1); // inkwell
    g.fillCircle(59, 17, 3);
  });
  make('farm-bell', 40, 56, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(20, 52, 26, 7);
    g.fillStyle(0x5c3b25, 1); // oak post & crossbar
    g.fillRect(17, 10, 6, 42);
    g.fillRect(10, 10, 20, 5);
    g.fillStyle(0xc9a227, 1); // brass bell
    g.fillTriangle(14, 28, 26, 28, 20, 14);
    g.fillRect(13, 26, 14, 4);
    g.fillStyle(0x8a6a18, 1);
    g.fillCircle(20, 31, 2.2);
  });
  make('river-boat', 88, 42, (g) => {
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(44, 34, 82, 14);
    g.fillStyle(0x6e4529, 1); // wooden hull
    g.fillEllipse(44, 22, 82, 26);
    g.fillStyle(0x8f6239, 1); // inside deck
    g.fillEllipse(44, 21, 68, 17);
    g.fillStyle(0xa8753f, 1); // thwarts (benches)
    g.fillRect(26, 13, 6, 16);
    g.fillRect(54, 13, 6, 16);
    g.fillStyle(0xc9a47a, 1); // oars
    g.fillRect(16, 18, 48, 2.5);
  });

  g.destroy();
}

/** The player figure, facing right, in a 28 × 40 box at (ox, oy). */
function drawGardener(g: G, ox: number, oy: number, legs: boolean): void {
  if (legs) {
    g.fillStyle(0x3f5f3a, 1); // trousers
    g.fillRoundedRect(ox + 8, oy + 26, 5, 12, 2);
    g.fillRoundedRect(ox + 15, oy + 26, 5, 12, 2);
  }
  g.fillStyle(0xd98f4e, 1); // jacket
  g.fillRoundedRect(ox + 5, oy + 15, 18, 15, 6);
  g.fillStyle(0x5d7f45, 1); // satchel strap + bag
  g.fillRect(ox + 16, oy + 16, 3, 13);
  g.fillRoundedRect(ox + 18, oy + 22, 7, 7, 2);
  g.fillStyle(0xf2c9a0, 1); // face
  g.fillCircle(ox + 14, oy + 11, 7);
  g.fillStyle(0xe8cf7a, 1); // straw hat
  g.fillEllipse(ox + 14, oy + 7, 24, 8);
  g.fillRoundedRect(ox + 8, oy, 12, 8, 4);
  g.fillStyle(0xb5533c, 1);
  g.fillRect(ox + 8, oy + 5, 12, 2);
  g.fillStyle(0x3a2a1e, 1); // eye (facing right)
  g.fillCircle(ox + 17, oy + 12, 1.2);
}

/** A chestnut mare, facing right, in a 66 × 48 box at (ox, oy); hooves touch the bottom edge. */
function drawHorse(g: G, ox: number, oy: number): void {
  const coat = 0x9a6a42;
  const shade = 0x7d5434;
  const hair = 0x4a3424;
  g.fillStyle(hair, 1); // tail
  g.fillEllipse(ox + 7, oy + 26, 9, 22);
  g.fillStyle(shade, 1); // far legs
  g.fillRoundedRect(ox + 19, oy + 28, 5, 18, 2);
  g.fillRoundedRect(ox + 39, oy + 28, 5, 18, 2);
  g.fillStyle(coat, 1); // near legs
  g.fillRoundedRect(ox + 12, oy + 27, 6, 19, 2);
  g.fillRoundedRect(ox + 45, oy + 27, 6, 19, 2);
  g.fillStyle(0x2c2018, 1); // hooves
  g.fillRect(ox + 12, oy + 44, 6, 4);
  g.fillRect(ox + 19, oy + 44, 5, 4);
  g.fillRect(ox + 39, oy + 44, 5, 4);
  g.fillRect(ox + 45, oy + 44, 6, 4);
  g.fillStyle(coat, 1); // body, neck, head
  g.fillEllipse(ox + 30, oy + 24, 44, 20);
  g.fillTriangle(ox + 38, oy + 18, ox + 52, oy + 28, ox + 56, oy + 6);
  g.fillTriangle(ox + 38, oy + 18, ox + 56, oy + 6, ox + 46, oy + 6);
  g.fillEllipse(ox + 56, oy + 10, 17, 11);
  g.fillTriangle(ox + 49, oy + 6, ox + 54, oy + 6, ox + 50, oy);
  g.fillStyle(0xd9b48a, 1); // muzzle
  g.fillEllipse(ox + 62, oy + 12, 7, 7);
  g.fillStyle(hair, 1); // mane
  g.fillEllipse(ox + 44, oy + 13, 6, 17);
  g.fillStyle(0x3a2a1e, 1); // eye, nostril
  g.fillCircle(ox + 56, oy + 9, 1.3);
  g.fillCircle(ox + 63, oy + 12, 0.8);
  g.fillStyle(0xd84a3a, 1); // the faded cloth poppy that gave her the name
  g.fillCircle(ox + 46, oy + 8, 3);
  g.fillStyle(0x2c2018, 1);
  g.fillCircle(ox + 46, oy + 8, 1.1);
  g.fillStyle(0x5d7f45, 1); // saddle blanket
  g.fillRoundedRect(ox + 23, oy + 14, 15, 12, 4);
}

function drawTree(g: G, w: number, h: number, dark: number, mid: number, light: number): void {
  g.fillStyle(0x000000, 0.22);
  g.fillEllipse(w / 2, h - 8, w * 0.75, 14);
  g.fillStyle(0x5c3b25, 1);
  g.fillRect(w / 2 - 6, h - 34, 12, 28);
  g.fillStyle(dark, 1);
  g.fillCircle(w / 2 - 18, h - 46, 22);
  g.fillCircle(w / 2 + 18, h - 46, 22);
  g.fillCircle(w / 2, h - 62, 30);
  g.fillStyle(mid, 1);
  g.fillCircle(w / 2 - 10, h - 64, 20);
  g.fillCircle(w / 2 + 14, h - 56, 16);
  g.fillStyle(light, 1);
  g.fillCircle(w / 2 - 14, h - 72, 8);
  g.fillCircle(w / 2 + 6, h - 76, 6);
}

function generateTileset(g: G): void {
  g.clear();
  const rnd = seededRandom(42);
  let frame = 0;
  for (const id of TILE_IDS) {
    const def = TILES[id];
    for (let v = 0; v < def.variants; v++) {
      const ox = TILESET_MARGIN + frame * (TILE_SIZE + TILESET_SPACING);
      // 1px extruded border in the base color prevents seams when sampling at fractional zoom.
      g.fillStyle(def.color, 1);
      g.fillRect(ox - 1, TILESET_MARGIN - 1, TILE_SIZE + 2, TILE_SIZE + 2);
      g.translateCanvas(0, TILESET_MARGIN);
      drawTile(g, ox, def, rnd);
      g.translateCanvas(0, -TILESET_MARGIN);
      frame++;
    }
  }
  g.generateTexture(
    'tiles',
    TILESET_MARGIN * 2 + frame * (TILE_SIZE + TILESET_SPACING) - TILESET_SPACING,
    TILE_SIZE + TILESET_MARGIN * 2,
  );
}

function drawTile(g: G, ox: number, def: TileDef, rnd: () => number): void {
  const S = TILE_SIZE;
  g.fillStyle(def.color, 1);
  g.fillRect(ox, 0, S, S);
  const r = (n: number) => rnd() * n;
  switch (def.style) {
    case 'grass':
      for (let i = 0; i < 9; i++) {
        g.fillStyle(def.detail, 1);
        g.fillRect(ox + r(S - 2), r(S - 4), 2, 4);
      }
      g.fillStyle(0xffffff, 0.06);
      g.fillCircle(ox + r(S), r(S), 6);
      break;
    case 'canopy':
      g.fillStyle(0x223a21, 1);
      g.fillCircle(ox + r(S), r(S), 10);
      g.fillStyle(def.detail, 1);
      for (let i = 0; i < 4; i++) g.fillCircle(ox + 4 + r(S - 8), 4 + r(S - 8), 6 + r(5));
      g.fillStyle(0x52804a, 0.8);
      g.fillCircle(ox + 4 + r(S - 8), 4 + r(S - 8), 3);
      break;
    case 'dirt':
      for (let i = 0; i < 6; i++) {
        g.fillStyle(def.detail, 1);
        g.fillCircle(ox + r(S), r(S), 1 + r(1.5));
      }
      break;
    case 'stone':
      g.lineStyle(1, def.detail, 1);
      g.strokeRect(ox + 0.5, 0.5, 15, 15);
      g.strokeRect(ox + 16.5, 0.5, 15, 15);
      g.strokeRect(ox + 8.5, 16.5, 15, 15);
      g.lineBetween(ox, 16.5, ox + 8, 16.5);
      g.fillStyle(0x7d9a4c, 0.8); // moss between stones
      g.fillCircle(ox + r(S), r(S), 2);
      break;
    case 'asphalt':
      for (let i = 0; i < 10; i++) {
        g.fillStyle(def.detail, 1);
        g.fillRect(ox + r(S), r(S), 1.5, 1.5);
      }
      break;
    case 'water':
      g.lineStyle(1.5, def.detail, 0.9);
      for (let i = 0; i < 2; i++) {
        const x = ox + 3 + r(S - 14);
        const y = 4 + r(S - 8);
        g.lineBetween(x, y, x + 8, y);
      }
      break;
    case 'glass':
      g.fillStyle(0xffffff, 0.18);
      g.fillTriangle(ox + 2, 2, ox + 14, 2, ox + 2, 14);
      g.lineStyle(2, def.detail, 1);
      g.strokeRect(ox + 1, 1, S - 2, S - 2);
      g.lineBetween(ox + S / 2, 0, ox + S / 2, S);
      break;
    case 'planks':
      g.lineStyle(1, def.detail, 1);
      for (let y = 8; y < S; y += 8) g.lineBetween(ox, y + 0.5, ox + S, y + 0.5);
      g.lineBetween(ox + 10 + r(10), 0, ox + 10 + r(10), 8);
      g.lineBetween(ox + r(S), 16, ox + r(S), 24);
      break;
    case 'wall':
      g.lineStyle(1, def.detail, 1);
      for (let x = 8; x < S; x += 8) g.lineBetween(ox + x + 0.5, 0, ox + x + 0.5, S);
      break;
    case 'soil':
      g.lineStyle(2, def.detail, 1);
      for (let y = 5; y < S; y += 9) g.lineBetween(ox + 1, y, ox + S - 1, y);
      g.fillStyle(0x6a9a4e, 1);
      g.fillCircle(ox + r(S), r(S), 2);
      break;
    case 'rails':
      g.fillStyle(def.detail, 1); // wooden sleepers
      for (let x = 2; x < S; x += 10) g.fillRect(ox + x, 4, 4, S - 8);
      g.fillStyle(0x52575b, 1); // twin steel rails
      g.fillRect(ox, 8, S, 3);
      g.fillRect(ox, S - 11, S, 3);
      g.fillStyle(0x6a9a4e, 0.75); // wild grass tufts on ballast
      g.fillCircle(ox + r(S), r(S), 2.2);
      break;
    case 'brick':
      g.lineStyle(1, def.detail, 1);
      for (let y = 0; y < S; y += 8) {
        g.lineBetween(ox, y + 0.5, ox + S, y + 0.5);
        const offset = (y / 8) % 2 === 0 ? 0 : 8;
        for (let x = offset; x < S; x += 16) g.lineBetween(ox + x + 0.5, y, ox + x + 0.5, y + 8);
      }
      break;
  }
}

type MakeFn = (key: string, w: number, h: number, draw: (g: G) => void) => void;

function drawSeedPacket(g: G, paper: number, flap: number, drawEmblem: (g: G) => void): void {
  g.fillStyle(0x000000, 0.22);
  g.fillRoundedRect(8, 7, 22, 26, 4);
  g.fillStyle(paper, 1);
  g.fillRoundedRect(7, 5, 22, 26, 4);
  g.fillStyle(flap, 1);
  g.fillRoundedRect(7, 5, 22, 7, 3);
  g.lineStyle(1.5, 0x6e4529, 0.75);
  g.strokeRoundedRect(7, 5, 22, 26, 4);
  g.lineBetween(7, 12, 29, 12);
  drawEmblem(g);
}

function drawJournalNote(g: G, paper: number, drawSketch: (g: G) => void): void {
  g.fillStyle(0x000000, 0.2);
  g.fillRoundedRect(7, 6, 23, 27, 3);
  g.fillStyle(paper, 1);
  g.fillRoundedRect(6, 4, 23, 27, 3);
  g.fillStyle(0xd9c9a0, 1);
  g.fillTriangle(23, 4, 29, 4, 29, 10);
  g.lineStyle(1.2, 0x8a603d, 0.8);
  g.strokeRoundedRect(6, 4, 23, 27, 3);
  g.lineStyle(1, 0x8a7a5c, 0.65);
  g.lineBetween(10, 10, 21, 10);
  g.lineBetween(10, 14, 25, 14);
  g.lineBetween(10, 18, 22, 18);
  drawSketch(g);
}

const ITEM_ICON_DRAWERS: Record<string, (g: G) => void> = {
  // ── Seeds ──
  'seed-bramble-vine': (g) =>
    drawSeedPacket(g, 0xe8d9b5, 0xcbb58a, (g) => {
      g.fillStyle(0x5d7f45, 1);
      g.fillEllipse(18, 16, 8, 4);
      g.fillStyle(0x6b2e4a, 1);
      g.fillCircle(16, 20, 2.8);
      g.fillCircle(20, 20, 2.8);
      g.fillCircle(18, 23.5, 2.8);
      g.fillStyle(0x9b4b6f, 0.85);
      g.fillCircle(15.5, 19.2, 1);
    }),
  'seed-glow-lily': (g) => {
    g.fillStyle(0xf3e38a, 0.25);
    g.fillCircle(18, 20, 14);
    g.fillStyle(0x5d7f45, 1);
    g.fillTriangle(16, 12, 20, 12, 18, 5);
    g.fillStyle(0xc89e52, 1);
    g.fillCircle(18, 22, 9);
    g.fillStyle(0xf3e38a, 1);
    g.fillEllipse(18, 21, 14, 15);
    g.lineStyle(1.3, 0x8a603d, 0.65);
    g.lineBetween(18, 13, 18, 29);
    g.lineBetween(14, 15, 13, 27);
    g.lineBetween(22, 15, 23, 27);
    g.fillStyle(0xfff6d8, 0.9);
    g.fillCircle(15.5, 18, 2);
  },
  'seed-lavender': (g) =>
    drawSeedPacket(g, 0xeae1cf, 0xd1c3aa, (g) => {
      g.lineStyle(1.6, 0x5d7f45, 1);
      g.lineBetween(18, 27, 18, 18);
      g.fillStyle(0x9b84d6, 1);
      g.fillCircle(18, 16, 2.5);
      g.fillCircle(16, 19, 2.2);
      g.fillCircle(20, 19, 2.2);
      g.fillCircle(18, 22, 2.2);
    }),
  'seed-moon-fern': (g) => {
    g.fillStyle(0x7ae7c7, 0.22);
    g.fillCircle(18, 21, 13);
    g.fillStyle(0x8a603d, 1);
    g.fillRoundedRect(14, 5, 8, 5, 2);
    g.fillStyle(0xb9e3df, 0.85);
    g.fillRoundedRect(11, 10, 14, 21, 6);
    g.lineStyle(1.5, 0xe8f9f6, 0.85);
    g.strokeRoundedRect(11, 10, 14, 21, 6);
    g.fillStyle(0x7ae7c7, 1);
    g.fillCircle(16, 24, 2.4);
    g.fillCircle(20, 22, 2);
    g.fillCircle(18, 26, 2.2);
    g.fillCircle(17, 18, 1.4);
    g.fillStyle(0xffffff, 0.75);
    g.fillRect(13, 14, 1.5, 10);
  },
  'seed-night-violet': (g) =>
    drawSeedPacket(g, 0xd8dce8, 0xa8b0cc, (g) => {
      g.fillStyle(0x6f7bf7, 1);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        g.fillCircle(18 + Math.cos(a) * 3.5, 21 + Math.sin(a) * 3.5, 2.4);
      }
      g.fillStyle(0xf4d35e, 1);
      g.fillCircle(18, 21, 1.8);
    }),
  'seed-hollyhock': (g) =>
    drawSeedPacket(g, 0xf2e4df, 0xdabbb4, (g) => {
      g.fillStyle(0xe8739c, 1);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        g.fillCircle(18 + Math.cos(a) * 3.8, 21 + Math.sin(a) * 3.8, 2.6);
      }
      g.fillStyle(0xf7ecaa, 1);
      g.fillCircle(18, 21, 2);
    }),

  // ── Tools & Keys ──
  trowel: (g) => {
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(18, 30, 18, 5);
    g.fillStyle(0x8a603d, 1);
    g.fillRoundedRect(20, 7, 6, 12, 3);
    g.fillStyle(0x6e4529, 1);
    g.fillRect(19, 16, 4, 4);
    g.fillStyle(0x9da4ac, 1);
    g.fillTriangle(8, 29, 11, 18, 22, 23);
    g.fillTriangle(11, 18, 21, 17, 22, 23);
    g.lineStyle(1.2, 0xd8dee4, 0.8);
    g.lineBetween(11, 26, 17, 20);
  },
  'garden-saw': (g) => {
    g.fillStyle(0x9ea5ad, 1);
    g.fillTriangle(6, 25, 22, 14, 24, 19);
    g.lineStyle(1.4, 0x5c636b, 1);
    g.lineBetween(7, 26, 23, 20);
    g.fillStyle(0xb98a56, 1);
    g.fillRoundedRect(20, 10, 11, 7, 3);
    g.fillStyle(0x6e4529, 1);
    g.fillCircle(28, 13.5, 1.5);
  },
  'greenhouse-key': (g) => {
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(18, 31, 18, 4);
    g.lineStyle(3.2, 0xc9a227, 1);
    g.strokeCircle(12, 15, 6);
    g.fillStyle(0xc9a227, 1);
    g.fillRoundedRect(17, 13.5, 14, 3.5, 1.5);
    g.fillRect(24, 17, 2.5, 5);
    g.fillRect(28, 17, 2.5, 4);
    g.fillStyle(0xf4d35e, 0.85);
    g.fillCircle(10, 13, 1.4);
  },
  'pocket-workbench': (g) => {
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(18, 30, 22, 5);
    g.fillStyle(0x9da4ac, 1);
    g.fillTriangle(26, 11, 31, 8, 28, 14);
    g.fillStyle(0x8a603d, 1);
    g.fillRoundedRect(7, 11, 21, 16, 6);
    g.fillStyle(0x6e4529, 1);
    g.fillCircle(11, 19, 4.5);
    g.fillStyle(0xab7a4f, 1);
    g.fillCircle(11, 19, 2.2);
    g.lineStyle(2, 0xf1e6c8, 0.95);
    g.lineBetween(18, 10.5, 18, 27.5);
    g.lineBetween(23, 10.5, 23, 27.5);
  },
  'tower-water-vial': (g) => {
    g.fillStyle(0x8a603d, 1);
    g.fillRoundedRect(15, 4, 6, 4, 1.5);
    g.fillStyle(0xd8f1f7, 0.85);
    g.fillRoundedRect(11, 12, 14, 19, 6);
    g.fillRect(15, 8, 6, 5);
    g.fillStyle(0x5eb8d9, 0.95);
    g.fillRoundedRect(12.5, 18, 11, 11.5, 4.5);
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(16, 22, 1.4);
    g.fillCircle(20, 25, 1);
    g.lineStyle(1.4, 0xffffff, 0.75);
    g.strokeRoundedRect(11, 12, 14, 19, 6);
  },
  'orchard-apple-graft': (g) => {
    g.lineStyle(3.2, 0x7d5434, 1);
    g.lineBetween(8, 28, 27, 9);
    g.lineBetween(17, 19, 14, 11);
    g.fillStyle(0x5b8a45, 1);
    g.fillEllipse(13, 10, 8, 4.5);
    g.fillEllipse(24, 17, 8, 4.5);
    g.fillStyle(0xe6a145, 1);
    g.fillCircle(27, 9, 3.6);
    g.fillStyle(0xd96045, 0.85);
    g.fillCircle(28, 8.5, 1.8);
  },
  'tool-sickle': (g) => {
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(18, 32, 22, 4);
    g.lineStyle(4.5, 0x8a603d, 1);
    g.lineBetween(9, 30, 18, 17);
    g.lineStyle(4, 0xc9d1d8, 1);
    g.beginPath();
    g.arc(21, 17, 11, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(300), false);
    g.strokePath();
    g.lineStyle(1.4, 0xffffff, 0.8);
    g.beginPath();
    g.arc(21, 16, 10.5, Phaser.Math.DegToRad(190), Phaser.Math.DegToRad(290), false);
    g.strokePath();
    g.fillStyle(0x6e4529, 1);
    g.fillCircle(17, 19, 2.4);
  },
  'tool-shovel': (g) => {
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(18, 33, 14, 3.5);
    g.lineStyle(3.6, 0x8a603d, 1);
    g.lineBetween(18, 4, 18, 22);
    g.fillStyle(0x8a603d, 1);
    g.fillRoundedRect(13, 3, 10, 3.5, 1.5);
    g.fillStyle(0xaeb4ba, 1);
    g.fillRoundedRect(11, 19, 14, 12, { tl: 2, tr: 2, bl: 7, br: 7 });
    g.fillStyle(0xd6dbe0, 0.9);
    g.fillRect(13, 21, 3, 7);
    g.lineStyle(1.3, 0x5c636b, 1);
    g.strokeRoundedRect(11, 19, 14, 12, { tl: 2, tr: 2, bl: 7, br: 7 });
  },
  'tool-satchel': (g) => {
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(18, 32, 22, 4);
    g.fillStyle(0xc9a56b, 1);
    g.fillRoundedRect(8, 14, 20, 17, 6);
    g.fillStyle(0xb48b52, 1);
    g.fillRoundedRect(8, 14, 20, 7, { tl: 6, tr: 6, bl: 0, br: 0 });
    g.lineStyle(1.4, 0x6e4529, 0.9);
    g.strokeRoundedRect(8, 14, 20, 17, 6);
    g.lineStyle(2.4, 0x6e4529, 1);
    g.beginPath();
    g.arc(18, 12, 7, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
    g.strokePath();
    g.fillStyle(0x6e4529, 1);
    g.fillCircle(18, 21, 1.8);
    g.fillStyle(0x6b9a52, 1);
    g.fillEllipse(14, 11, 5, 3);
    g.fillEllipse(22, 10, 5, 3);
  },
  'tool-pole-lantern': (g) => {
    g.fillStyle(0xf3e38a, 0.28);
    g.fillCircle(18, 11, 11);
    g.lineStyle(3.2, 0x8a603d, 1);
    g.lineBetween(18, 19, 18, 34);
    g.fillStyle(0x5c636b, 1);
    g.fillTriangle(10, 6, 18, 0.5, 26, 6);
    g.fillRect(11, 17.5, 14, 2.5);
    g.fillStyle(0xf9e8a3, 1);
    g.fillRoundedRect(12, 6, 12, 12, 2);
    g.fillStyle(0xfffbe0, 1);
    g.fillEllipse(18, 12.5, 6, 8);
    g.lineStyle(1.2, 0x4a4a46, 1);
    g.strokeRoundedRect(12, 6, 12, 12, 2);
  },
  'craft-bramble-cutting': (g) => {
    g.fillStyle(0x4f7a3f, 1);
    g.fillEllipse(18, 25, 18, 11);
    g.fillStyle(0x6b9a52, 1);
    g.fillEllipse(18, 24, 13, 7);
    g.lineStyle(2.4, 0x6b2e4a, 1);
    g.lineBetween(15, 22, 11, 10);
    g.lineBetween(20, 22, 24, 9);
    g.fillStyle(0x5b8a45, 1);
    g.fillCircle(10, 11, 2.8);
    g.fillCircle(25, 10, 2.8);
    g.fillStyle(0xa3486e, 1);
    g.fillCircle(13, 15, 1.8);
    g.fillCircle(22, 14, 1.8);
  },
  'craft-lily-lantern': (g) => {
    g.fillStyle(0xf3e38a, 0.25);
    g.fillCircle(18, 20, 14);
    g.lineStyle(1.6, 0x9ea5ad, 1);
    g.strokeCircle(18, 10, 6);
    g.fillStyle(0xcfe7ea, 0.8);
    g.fillRoundedRect(10, 12, 16, 19, 4);
    g.fillStyle(0x8a603d, 1);
    g.fillRoundedRect(12, 10, 12, 3.5, 1.5);
    g.fillStyle(0xf3e38a, 1);
    g.fillCircle(18, 22, 5.5);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(18, 21, 2.5);
    g.lineStyle(1.3, 0xffffff, 0.75);
    g.strokeRoundedRect(10, 12, 16, 19, 4);
  },
  'craft-lavender-sachet': (g) => {
    g.fillStyle(0xe8dcc0, 1);
    g.fillRoundedRect(10, 14, 16, 17, 6);
    g.fillTriangle(12, 14, 24, 14, 18, 8);
    g.lineStyle(1.4, 0xa89474, 0.9);
    g.strokeRoundedRect(10, 14, 16, 17, 6);
    g.fillStyle(0x9b84d6, 1);
    g.fillRect(13, 13, 10, 3);
    g.fillCircle(18, 22, 2.5);
    g.fillCircle(16, 25, 2);
    g.fillCircle(20, 25, 2);
  },

  // ── Resources ──
  'resource-sunlight': (g) => {
    g.fillStyle(0xf4c430, 0.28);
    g.fillCircle(18, 18, 14);
    g.lineStyle(2.2, 0xf7df72, 1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.lineBetween(18 + Math.cos(a) * 9, 18 + Math.sin(a) * 9, 18 + Math.cos(a) * 14, 18 + Math.sin(a) * 14);
    }
    g.fillStyle(0xf4c430, 1);
    g.fillCircle(18, 18, 7.5);
    g.fillStyle(0xfff6d8, 0.9);
    g.fillCircle(16, 16, 2.6);
  },
  'resource-dew': (g) => {
    g.fillStyle(0x8fd6e8, 0.24);
    g.fillCircle(18, 20, 12);
    g.fillStyle(0x6ec3db, 1);
    g.fillCircle(18, 22, 8);
    g.fillTriangle(10.5, 20, 25.5, 20, 18, 6);
    g.fillStyle(0x8fd6e8, 1);
    g.fillCircle(18, 21.5, 6);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(15.5, 19.5, 2.1);
  },
  'resource-curio': (g) => {
    g.fillStyle(0xd291e4, 0.22);
    g.fillCircle(18, 18, 13);
    g.fillStyle(0xc9a227, 1);
    g.fillCircle(18, 18, 10);
    g.fillStyle(0xd291e4, 1);
    g.fillCircle(18, 18, 6.8);
    g.fillStyle(0xf4d8fc, 0.9);
    g.fillCircle(16, 16, 2.2);
    g.lineStyle(1.5, 0xf4d35e, 0.9);
    g.strokeCircle(18, 18, 10);
  },

  // ── Produce ──
  'produce-egg': (g) => {
    g.fillStyle(0xc9a47a, 1);
    g.fillEllipse(18, 27, 24, 8);
    g.fillStyle(0xf2e4c9, 1);
    g.fillEllipse(18, 17, 15, 19);
    g.fillStyle(0xfff6e0, 0.8);
    g.fillEllipse(14.5, 12.5, 4, 6);
    g.lineStyle(1.2, 0xb99a6a, 0.9);
    g.strokeEllipse(18, 17, 15, 19);
  },
  'produce-honey': (g) => {
    g.fillStyle(0xe0a02b, 1);
    g.fillRoundedRect(8, 12, 20, 18, 6);
    g.fillStyle(0xf2c35a, 0.9);
    g.fillRoundedRect(10, 14, 6, 12, 3);
    g.fillStyle(0xc9a47a, 1);
    g.fillRoundedRect(10, 7, 16, 6, 2);
    g.fillStyle(0xfff6e0, 1);
    g.fillRoundedRect(12, 18, 12, 7, 2);
    g.fillStyle(0xe0a02b, 1);
    g.fillCircle(18, 21.5, 2);
    g.fillStyle(0xe0a02b, 1);
    g.fillRect(23, 11, 2.6, 8);
    g.fillCircle(24.3, 19, 1.8);
  },
  'produce-tendril': (g) => {
    g.lineStyle(2.8, 0x4f7a3f, 1);
    g.beginPath();
    g.arc(19, 18, 9, Phaser.Math.DegToRad(160), Phaser.Math.DegToRad(40), false);
    g.strokePath();
    g.fillStyle(0x6a9a4e, 1);
    g.fillEllipse(12, 23, 7, 4.5);
    g.fillEllipse(24, 12, 7, 4.5);
    g.fillStyle(0x8a4a6a, 1);
    g.fillCircle(17, 11, 3);
    g.fillCircle(22, 16, 2.6);
    g.fillStyle(0xc46b94, 0.8);
    g.fillCircle(16.5, 10.2, 1);
  },
  'produce-light-pollen': (g) => {
    g.fillStyle(0xf7ecaa, 0.28);
    g.fillCircle(18, 17, 13);
    g.fillStyle(0x5b8a45, 1);
    g.fillEllipse(18, 25, 22, 10);
    g.fillStyle(0xf7ecaa, 1);
    g.fillCircle(18, 21, 5);
    g.fillCircle(14, 22, 3.5);
    g.fillCircle(22, 22, 3.5);
    g.fillStyle(0xfff9d6, 1);
    g.fillCircle(15, 13, 1.8);
    g.fillCircle(21, 11, 1.5);
    g.fillCircle(19, 16, 1.4);
  },
  'produce-scent-bundle': (g) => {
    g.lineStyle(2, 0x5d7f45, 1);
    g.lineBetween(14, 30, 17, 13);
    g.lineBetween(18, 30, 18, 10);
    g.lineBetween(22, 30, 19, 13);
    g.fillStyle(0xb7a3e6, 1);
    for (const [x, y] of [
      [16, 13],
      [18, 9],
      [18, 13],
      [20, 13],
      [15, 16],
      [21, 16],
    ]) {
      g.fillCircle(x, y, 2.5);
    }
    g.fillStyle(0xd9b48a, 1);
    g.fillRect(14, 23, 8, 3);
  },
  'produce-nectar': (g) => {
    g.fillStyle(0x8f98f9, 0.24);
    g.fillCircle(18, 20, 12);
    g.fillStyle(0x6f7bf7, 1);
    g.fillCircle(18, 22, 8);
    g.fillTriangle(10.5, 20, 25.5, 20, 18, 7);
    g.fillStyle(0xa8b1ff, 1);
    g.fillCircle(16, 20, 2.5);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(15.5, 19, 1.1);
  },
  'produce-seed-pod': (g) => {
    g.fillStyle(0xd9a37c, 1);
    g.fillCircle(18, 19, 10);
    g.lineStyle(1.4, 0x8a603d, 0.85);
    g.strokeCircle(18, 19, 10);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.lineBetween(18, 19, 18 + Math.cos(a) * 10, 19 + Math.sin(a) * 10);
    }
    g.fillStyle(0x8a603d, 1);
    g.fillCircle(18, 19, 2.4);
  },

  // ── Materials ──
  'craft-valve-seal': (g) => {
    g.lineStyle(6, 0x8a4a6a, 1);
    g.strokeCircle(18, 18, 9);
    g.lineStyle(2, 0xb7a3e6, 0.85);
    g.strokeCircle(18, 18, 9);
  },
  'craft-sealing-braid': (g) => {
    g.lineStyle(5, 0xb7a3e6, 1);
    g.lineBetween(9, 26, 27, 10);
    g.fillStyle(0xd9c9a0, 1);
    for (let i = 0; i < 5; i++) g.fillCircle(11 + i * 3.5, 24 - i * 3.5, 2.3);
  },
  'craft-axle-wax': (g) => {
    g.fillStyle(0x6f7bf7, 1);
    g.fillRoundedRect(8, 13, 20, 13, 3);
    g.fillStyle(0xa8b1ff, 1);
    g.fillTriangle(8, 13, 28, 13, 23, 9);
    g.fillTriangle(8, 13, 23, 9, 13, 9);
    g.fillStyle(0xffffff, 0.55);
    g.fillRect(12, 15, 10, 2);
  },
  'craft-horse-treat': (g) => {
    g.fillStyle(0xb9a15c, 1);
    g.fillRoundedRect(7, 12, 22, 13, 4);
    g.lineStyle(1.4, 0x7d5434, 0.9);
    g.strokeRoundedRect(7, 12, 22, 13, 4);
    g.fillStyle(0x5d7f45, 1);
    g.fillCircle(12, 17, 1.5);
    g.fillCircle(23, 20, 1.5);
    g.fillStyle(0x9b84d6, 1);
    g.fillCircle(18, 16, 1.4);
    g.lineStyle(2, 0xf1e6c8, 0.9);
    g.lineBetween(18, 11.5, 18, 25.5);
  },

  'craft-flour': (g) => {
    g.fillStyle(0x000000, 0.15);
    g.fillEllipse(18, 29, 22, 5);
    g.fillStyle(0xd9c79a, 1);
    g.fillRoundedRect(9, 11, 18, 18, 5);
    g.fillStyle(0xeee3c3, 1);
    g.fillRoundedRect(9, 11, 18, 6, 4);
    g.lineStyle(1.4, 0x9a835a, 1);
    g.strokeRoundedRect(9, 11, 18, 18, 5);
    g.lineBetween(10, 17, 26, 17);
    g.fillStyle(0xf7f1de, 0.95);
    g.fillEllipse(18, 10, 12, 5);
    g.fillStyle(0x9b84d6, 1);
    g.fillCircle(18, 23, 2);
    g.fillStyle(0x6a9a4e, 1);
    g.fillCircle(14, 24, 1.3);
    g.fillCircle(22, 25, 1.3);
  },

  // ── Notes & Chronicle ──
  'journal-page-bramble': (g) =>
    drawJournalNote(g, 0xf1e6c8, (g) => {
      g.fillStyle(0x6b2e4a, 1);
      g.fillCircle(19, 24, 2.6);
      g.fillCircle(23, 24, 2.6);
    }),
  'journal-page-lily': (g) =>
    drawJournalNote(g, 0xf1e2be, (g) => {
      g.fillStyle(0xe9a23b, 1);
      g.fillCircle(21, 24, 3);
    }),
  'journal-page-lavender': (g) =>
    drawJournalNote(g, 0xf1e6c8, (g) => {
      g.fillStyle(0x9b84d6, 1);
      g.fillCircle(21, 24, 2.8);
    }),
  'journal-page-mohn': (g) =>
    drawJournalNote(g, 0xefe5cc, (g) => {
      g.fillStyle(0xd84a3a, 1);
      g.fillCircle(21, 24, 2.8);
    }),
  'journal-page-tower': (g) =>
    drawJournalNote(g, 0xeae4d6, (g) => {
      g.fillStyle(0x5eb8d9, 1);
      g.fillRect(19, 21, 4, 6);
    }),
  'journal-page-heart': (g) =>
    drawJournalNote(g, 0xf4ebd2, (g) => {
      g.fillStyle(0x4f7a3f, 1);
      g.fillCircle(21, 24, 3);
    }),
  'journal-page-orchard': (g) =>
    drawJournalNote(g, 0xe8d5b5, (g) => {
      g.fillStyle(0xe6a145, 1);
      g.fillCircle(21, 24, 3);
    }),
  'journal-page-mill': (g) =>
    drawJournalNote(g, 0xf1e6c8, (g) => {
      g.lineStyle(1.6, 0x6e4529, 1);
      g.strokeCircle(21, 24, 3);
    }),
  'journal-page-farms': (g) =>
    drawJournalNote(g, 0xf1e6c8, (g) => {
      g.fillStyle(0xe8739c, 1);
      g.fillCircle(21, 24, 2.8);
    }),
  'erlenbrueck-chronicle': (g) => {
    g.fillStyle(0x000000, 0.24);
    g.fillRoundedRect(8, 7, 22, 26, 3);
    g.fillStyle(0x7d4c29, 1);
    g.fillRoundedRect(7, 5, 22, 26, 3);
    g.fillStyle(0xe9a23b, 1);
    g.fillRect(7, 5, 4, 26);
    g.strokeRoundedRect(13, 10, 12, 16, 2);
    g.fillStyle(0xf1e6c8, 1);
    g.fillRect(18, 28, 3, 5);
  },
  // ── Raw materials (build mode) ──
  'mat-wood': (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(18, 30, 26, 5);
    g.fillStyle(0x7a5233, 1);
    g.fillRoundedRect(4, 18, 28, 9, 4);
    g.fillStyle(0xa8753f, 1);
    g.fillRoundedRect(6, 10, 26, 9, 4);
    g.fillStyle(0xd9b98a, 1);
    g.fillEllipse(30, 14.5, 5, 8);
    g.fillEllipse(30, 22.5, 5, 8);
    g.lineStyle(1.2, 0x7a5233, 0.9);
    g.strokeEllipse(30, 14.5, 2.4, 4);
    g.lineBetween(9, 13, 22, 13);
  },
  'mat-stone': (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(18, 30, 28, 5);
    g.fillStyle(0x7f7b72, 1);
    g.fillEllipse(12, 23, 16, 12);
    g.fillStyle(0x9a968c, 1);
    g.fillEllipse(23, 21, 18, 15);
    g.fillStyle(0xb9b5aa, 1);
    g.fillEllipse(17, 13, 13, 10);
    g.fillStyle(0xd6d2c6, 0.8);
    g.fillEllipse(15, 11, 5, 3);
    g.fillEllipse(25, 17, 5, 3);
  },
  'mat-scrap': (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(18, 30, 26, 5);
    g.fillStyle(0x8a8f96, 1);
    g.fillTriangle(5, 27, 14, 9, 22, 27);
    g.fillStyle(0xb07a52, 1);
    g.fillRoundedRect(15, 15, 16, 12, 2);
    g.lineStyle(1.6, 0x6e4a35, 1);
    g.lineBetween(17, 19, 29, 19);
    g.lineBetween(17, 23, 29, 23);
    g.lineStyle(2.2, 0x5c636b, 1);
    g.strokeCircle(11, 12, 4.5);
    g.fillStyle(0xd9dde2, 0.9);
    g.fillCircle(10, 20, 1.3);
  },

  // ── Guarding, building and food plants ──
  'seed-glowcap': (g) =>
    drawSeedPacket(g, 0xdfe9d0, 0xbccfa4, (g) => {
      g.fillStyle(0x9be86b, 1);
      g.fillEllipse(18, 18, 12, 7);
      g.fillStyle(0xe8f5d0, 1);
      g.fillRect(17, 20, 2, 6);
      g.fillStyle(0xd5ffb0, 0.9);
      g.fillCircle(15, 17, 1);
    }),
  'seed-thornroot': (g) =>
    drawSeedPacket(g, 0xe3d3c0, 0xc9ae90, (g) => {
      g.fillStyle(0x8c4a3a, 1);
      g.fillCircle(18, 21, 4.2);
      g.fillTriangle(18, 14, 15.5, 18, 20.5, 18);
      g.fillTriangle(11.5, 21, 15, 18.5, 15, 23.5);
      g.fillTriangle(24.5, 21, 21, 18.5, 21, 23.5);
    }),
  'seed-reed': (g) =>
    drawSeedPacket(g, 0xe9e3c4, 0xcfc78f, (g) => {
      g.lineStyle(1.8, 0x9a9650, 1);
      g.lineBetween(14, 27, 14, 15);
      g.lineBetween(18, 27, 18, 14);
      g.lineBetween(22, 27, 22, 16);
      g.fillStyle(0x7a5a3c, 1);
      g.fillEllipse(18, 13, 3.5, 6);
    }),
  'seed-willow': (g) =>
    drawSeedPacket(g, 0xe2e6cb, 0xbec99a, (g) => {
      g.lineStyle(1.8, 0x8a7a4a, 1);
      g.lineBetween(14, 27, 17, 15);
      g.lineBetween(20, 27, 22, 16);
      g.fillStyle(0x7fa35a, 1);
      g.fillEllipse(17, 15, 6, 3);
      g.fillEllipse(22, 15.5, 6, 3);
    }),
  'seed-honeyberry': (g) =>
    drawSeedPacket(g, 0xf0e2bd, 0xd9c186, (g) => {
      g.fillStyle(0xe0a33a, 1);
      g.fillCircle(15.5, 21, 3);
      g.fillCircle(21, 20, 3);
      g.fillCircle(18, 25, 3);
      g.fillStyle(0xfbe3a0, 0.9);
      g.fillCircle(14.8, 20.2, 1);
    }),
  'seed-gold-turnip': (g) =>
    drawSeedPacket(g, 0xf0e6c4, 0xd9c98c, (g) => {
      g.fillStyle(0xe6b84a, 1);
      g.fillCircle(18, 22, 5);
      g.fillStyle(0x5d7f45, 1);
      g.fillTriangle(18, 13, 15, 18, 21, 18);
    }),
  'produce-glowcap': (g) => {
    g.fillStyle(0x9be86b, 0.25);
    g.fillCircle(18, 19, 14);
    g.fillStyle(0xe8f5d0, 1);
    g.fillRoundedRect(15.5, 19, 5, 11, 2);
    g.fillStyle(0x9be86b, 1);
    g.fillEllipse(18, 17, 22, 14);
    g.fillStyle(0xd5ffb0, 0.9);
    g.fillCircle(13, 16, 1.8);
    g.fillCircle(19, 12.5, 1.5);
    g.fillCircle(23, 17, 1.8);
  },
  'produce-thorn-cane': (g) => {
    g.lineStyle(3.2, 0x8c4a3a, 1);
    g.beginPath();
    g.arc(20, 22, 11, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(20), false);
    g.strokePath();
    g.fillStyle(0xc9876e, 1);
    for (const [x, y] of [
      [10, 18],
      [14, 11],
      [22, 9.5],
      [29, 14],
    ]) {
      g.fillTriangle(x - 2, y + 2, x + 2, y + 2, x, y - 3);
    }
    g.fillStyle(0x5d7f45, 1);
    g.fillEllipse(30, 25, 6, 3.5);
  },
  'produce-reed-bundle': (g) => {
    g.lineStyle(2.4, 0xb7b46a, 1);
    for (const x of [12, 15.5, 19, 22.5, 26]) g.lineBetween(x, 30, x + (x - 19) * 0.25, 7);
    g.fillStyle(0x7a5a3c, 1);
    g.fillEllipse(19, 9, 4, 7);
    g.lineStyle(3, 0x8a603d, 1);
    g.lineBetween(10, 21, 28, 21);
  },
  'produce-willow-switch': (g) => {
    g.lineStyle(2.4, 0xb69a62, 1);
    g.lineBetween(6, 29, 30, 8);
    g.lineStyle(1.6, 0x9d8450, 1);
    g.lineBetween(9, 30, 31, 14);
    g.fillStyle(0x7fa35a, 1);
    g.fillEllipse(14, 21, 7, 3.5);
    g.fillEllipse(22, 15, 7, 3.5);
    g.fillEllipse(27, 20, 6, 3);
  },
  'produce-honeyberry': (g) => {
    g.fillStyle(0xf0b84a, 0.22);
    g.fillCircle(18, 20, 13);
    g.fillStyle(0xe0a33a, 1);
    g.fillCircle(14, 21, 5.5);
    g.fillCircle(22.5, 20, 5.5);
    g.fillCircle(18, 14.5, 5.5);
    g.fillStyle(0xfbe3a0, 0.9);
    g.fillCircle(12.5, 19.5, 1.6);
    g.fillCircle(21, 18.5, 1.6);
    g.fillCircle(16.5, 13, 1.6);
    g.fillStyle(0x5d7f45, 1);
    g.fillEllipse(18, 8, 8, 3.5);
  },
  'produce-gold-turnip': (g) => {
    g.fillStyle(0x5d7f45, 1);
    g.fillTriangle(18, 6, 14, 15, 22, 15);
    g.fillTriangle(10, 9, 13, 16, 17, 14);
    g.fillTriangle(26, 9, 23, 16, 19, 14);
    g.fillStyle(0xefc45c, 1);
    g.fillEllipse(18, 22, 18, 15);
    g.fillStyle(0xf8de94, 0.8);
    g.fillEllipse(14.5, 19, 5, 3.5);
    g.lineStyle(1.6, 0x8a603d, 1);
    g.lineBetween(18, 29, 18, 33);
  },
  'meal-berry-mash': (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(18, 29, 24, 5);
    g.fillStyle(0xd9c9a0, 1);
    g.fillRoundedRect(7, 17, 22, 11, 5);
    g.fillStyle(0xe0a33a, 1);
    g.fillEllipse(18, 17, 22, 8);
    g.fillStyle(0xfbe3a0, 0.9);
    g.fillCircle(14, 16, 1.6);
    g.fillCircle(21, 17, 1.4);
    g.lineStyle(1.4, 0xf1e6c8, 0.7);
    g.lineBetween(14, 12, 15, 7);
    g.lineBetween(21, 12, 22, 6);
  },
  'meal-turnip-stew': (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(18, 30, 26, 5);
    g.fillStyle(0x6e4a2f, 1);
    g.fillRoundedRect(5, 16, 26, 13, 6);
    g.fillRect(4, 15, 28, 3);
    g.fillStyle(0xe6b84a, 1);
    g.fillEllipse(18, 16, 24, 7);
    g.fillStyle(0x9be86b, 1);
    g.fillCircle(15, 15.5, 2);
    g.fillCircle(22, 16.5, 1.8);
    g.lineStyle(1.4, 0xf1e6c8, 0.7);
    g.lineBetween(13, 11, 14, 6);
    g.lineBetween(19, 11, 20, 5);
    g.lineBetween(25, 11, 26, 6);
  },
};


export const ITEM_ICON_IDS = Object.keys(ITEM_ICON_DRAWERS);

function generateItemAndUiTextures(make: MakeFn): void {
  // UI slot & badge textures (1:1 CSS pixels; supports Phaser 4 setCrop scrolling)
  make('ui-slot', 56, 56, (g) => {
    g.fillStyle(0x1f2c1b, 0.96);
    g.fillRoundedRect(0, 0, 56, 56, 11);
    g.lineStyle(1.5, 0x5c7a4d, 0.7);
    g.strokeRoundedRect(1, 1, 54, 54, 10);
  });
  make('ui-slot-selected', 56, 56, (g) => {
    g.fillStyle(0x364a2d, 1);
    g.fillRoundedRect(0, 0, 56, 56, 11);
    g.lineStyle(2.5, 0xe9a23b, 1);
    g.strokeRoundedRect(1.5, 1.5, 53, 53, 10);
  });
  make('ui-slot-ready', 56, 56, (g) => {
    g.fillStyle(0x273a21, 0.98);
    g.fillRoundedRect(0, 0, 56, 56, 11);
    g.lineStyle(1.8, 0x8cb86a, 0.9);
    g.strokeRoundedRect(1, 1, 54, 54, 10);
  });
  make('ui-slot-dim', 56, 56, (g) => {
    g.fillStyle(0x1a2417, 0.88);
    g.fillRoundedRect(0, 0, 56, 56, 11);
    g.lineStyle(1.2, 0x44583c, 0.5);
    g.strokeRoundedRect(1, 1, 54, 54, 10);
  });
  make('ui-badge-check', 16, 16, (g) => {
    g.fillStyle(0x6ea84b, 1);
    g.fillCircle(8, 8, 7.5);
    g.lineStyle(2, 0xfff6e0, 1);
    g.lineBetween(4.5, 8.2, 7, 10.8);
    g.lineBetween(7, 10.8, 11.8, 5.5);
  });

  // Fallback icon
  make('item-fallback', 36, 36, (g) => {
    g.fillStyle(0x8a603d, 1);
    g.fillRoundedRect(7, 8, 22, 20, 4);
    g.lineStyle(1.5, 0xf1e6c8, 0.85);
    g.strokeRoundedRect(7, 8, 22, 20, 4);
  });

  for (const [id, draw] of Object.entries(ITEM_ICON_DRAWERS)) {
    make(itemTextureKey(id), 36, 36, draw);
  }

  // Multi-seed bundle icon for the seed-mix recipe
  make('recipe-seed-mix', 36, 36, (g) => {
    const packets = [
      { x: 5, y: 8, col: 0xd8c39e, dot: 0x6b2e4a },
      { x: 11, y: 6, col: 0xefe2bc, dot: 0xe9a23b },
      { x: 17, y: 9, col: 0xe4daf0, dot: 0x9b84d6 },
    ];
    for (const p of packets) {
      g.fillStyle(p.col, 1);
      g.fillRoundedRect(p.x, p.y, 13, 20, 3);
      g.lineStyle(1.2, 0x6e4529, 0.8);
      g.strokeRoundedRect(p.x, p.y, 13, 20, 3);
      g.fillStyle(p.dot, 1);
      g.fillCircle(p.x + 6.5, p.y + 11, 3);
    }
  });
}

/** Gather piles, the pieces of the build mode (`build-<id>`, see systems/buildLayer.ts) and the blight. */
function generateBuildAndBlightTextures(make: MakeFn): void {
  // ── Piles to chop, dig and salvage (ResourceNodeDef.texture) ──
  make('node-wood', 44, 32, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(22, 28, 40, 7);
    g.fillStyle(0x6e4a2f, 1);
    g.fillRoundedRect(3, 17, 30, 9, 4);
    g.fillRoundedRect(13, 19, 28, 9, 4);
    g.fillStyle(0x8a603d, 1);
    g.fillRoundedRect(8, 9, 30, 9, 4);
    g.fillStyle(0xc9a47a, 1);
    g.fillEllipse(36, 13.5, 6, 8);
    g.fillEllipse(39, 23.5, 6, 8);
    g.fillEllipse(5, 21.5, 5, 8);
    g.lineStyle(1.2, 0x6e4a2f, 1);
    g.strokeEllipse(36, 13.5, 3, 4);
    g.strokeEllipse(39, 23.5, 3, 4);
    g.fillStyle(0x6a9a4e, 0.9);
    g.fillCircle(15, 10, 3);
    g.fillCircle(26, 20, 2.5);
  });
  make('node-stone', 42, 30, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(21, 26, 38, 7);
    g.fillStyle(0x7a5a3c, 1);
    g.fillEllipse(21, 23, 36, 9);
    g.fillStyle(0x7f7b72, 1);
    g.fillEllipse(11, 19, 16, 12);
    g.fillEllipse(31, 20, 15, 11);
    g.fillStyle(0x9a968c, 1);
    g.fillEllipse(21, 14, 18, 15);
    g.fillStyle(0xc4c0b4, 0.85);
    g.fillEllipse(18, 10, 7, 4);
    g.fillEllipse(30, 17, 5, 3);
    g.fillEllipse(9, 16, 5, 3);
  });
  make('node-scrap', 44, 34, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(22, 30, 40, 7);
    g.fillStyle(0x8a8f96, 1);
    g.fillTriangle(4, 29, 16, 7, 27, 29);
    g.fillStyle(0xa9b0b8, 0.8);
    g.fillTriangle(9, 26, 16, 11, 19, 26);
    g.fillStyle(0xb07a52, 1);
    g.fillRoundedRect(20, 15, 20, 14, 2);
    g.lineStyle(1.6, 0x6e4a35, 1);
    g.lineBetween(22, 20, 38, 20);
    g.lineBetween(22, 25, 38, 25);
    g.lineStyle(2.4, 0x5c636b, 1);
    g.strokeCircle(31, 10, 5);
    g.lineBetween(6, 12, 12, 20);
    g.fillStyle(0x6a9a4e, 0.9);
    g.fillCircle(8, 28, 3);
    g.fillCircle(37, 29, 2.5);
  });

  // ── Built pieces ──
  make('build-clearing', 32, 32, (g) => {
    // An axe sunk into a stump.
    g.fillStyle(0x6d4a30, 1);
    g.fillEllipse(16, 27, 26, 9);
    g.fillStyle(0xd9b98a, 1);
    g.fillEllipse(16, 25, 22, 7);
    g.lineStyle(1, 0x8a603d, 1);
    g.strokeEllipse(16, 25, 12, 3.5);
    g.fillStyle(0x8a603d, 1);
    g.fillRoundedRect(14.5, 3, 3.5, 24, 1.5);
    g.fillStyle(0x9aa3ad, 1);
    g.fillTriangle(17, 2, 31, 6, 31, 16);
    g.fillTriangle(17, 2, 31, 16, 17, 17);
    g.fillStyle(0xcfd6dc, 1);
    g.fillTriangle(17, 2, 28, 5, 17, 8);
    g.lineStyle(1, 0x5c636b, 1);
    g.lineBetween(31, 6, 31, 16);
  });
  make('build-fence', 32, 34, (g) => {
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(16, 31, 30, 5);
    g.fillStyle(0x8a603d, 1);
    g.fillRect(0, 12, 32, 4);
    g.fillRect(0, 21, 32, 4);
    g.fillStyle(0xa8753f, 1);
    g.fillRect(0, 12, 32, 1.5);
    g.fillRect(0, 21, 32, 1.5);
    for (const x of [3, 13, 23]) {
      g.fillStyle(0x6d4a30, 1);
      g.fillRoundedRect(x, 4, 6, 27, 2);
      g.fillTriangle(x, 5, x + 3, 0, x + 6, 5);
      g.fillStyle(0x8a603d, 1);
      g.fillRect(x + 1, 5, 2, 25);
    }
  });
  make('build-hedge', 34, 38, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(17, 35, 32, 6);
    g.fillStyle(0x3f6b35, 1);
    g.fillRoundedRect(1, 10, 32, 25, 9);
    g.fillStyle(0x4c7a3d, 1);
    g.fillCircle(9, 13, 8);
    g.fillCircle(24, 12, 9);
    g.fillCircle(17, 9, 8);
    g.fillStyle(0x6a9a4e, 1);
    g.fillCircle(12, 9, 5);
    g.fillCircle(24, 8, 5);
    g.fillCircle(8, 22, 4);
    g.fillCircle(25, 24, 4);
    g.fillStyle(0x6b2e4a, 1);
    for (const [x, y] of [
      [7, 16],
      [19, 20],
      [28, 15],
      [15, 29],
    ])
      g.fillCircle(x, y, 1.8);
  });
  make('build-lantern', 22, 46, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(11, 43, 18, 5);
    g.fillStyle(0xf3e38a, 0.28);
    g.fillCircle(11, 12, 11);
    g.fillStyle(0x4a4a46, 1);
    g.fillRect(9.5, 20, 3, 23);
    g.fillRoundedRect(5, 40, 12, 4, 2);
    g.fillStyle(0x5c636b, 1);
    g.fillTriangle(4, 6, 11, 0, 18, 6);
    g.fillRect(5, 19, 12, 2.5);
    g.fillStyle(0xf9e8a3, 1);
    g.fillRoundedRect(6, 6, 10, 13, 2);
    g.fillStyle(0xfffbe0, 1);
    g.fillEllipse(11, 13, 5, 8);
    g.lineStyle(1.2, 0x4a4a46, 1);
    g.strokeRoundedRect(6, 6, 10, 13, 2);
    g.lineBetween(11, 6, 11, 19);
  });
  make('build-planter', 32, 24, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(16, 21, 30, 5);
    g.fillStyle(0x9a968c, 1);
    g.fillRoundedRect(2, 17, 28, 5, 2);
    g.fillStyle(0x8a603d, 1);
    g.fillRoundedRect(1, 5, 30, 14, 3);
    g.fillStyle(0x6d4a30, 1);
    g.fillRect(1, 11, 30, 1.5);
    g.fillRect(10, 5, 1.5, 14);
    g.fillRect(20.5, 5, 1.5, 14);
    g.fillStyle(0x5a4029, 1);
    g.fillRoundedRect(3, 2, 26, 6, 3);
    g.fillStyle(0x7a5a3c, 1);
    g.fillEllipse(16, 4.5, 22, 3.5);
  });
  make('build-bridge', 32, 32, (g) => {
    g.fillStyle(0x3a2a1e, 0.35);
    g.fillRect(0, 2, 32, 30);
    for (let i = 0; i < 4; i++) {
      g.fillStyle(i % 2 === 0 ? 0xb88a5a : 0xa47849, 1);
      g.fillRoundedRect(0.5, i * 8 + 0.5, 31, 7, 1.5);
      g.fillStyle(0x6e4529, 0.9);
      g.fillCircle(4, i * 8 + 4, 1);
      g.fillCircle(28, i * 8 + 4, 1);
    }
  });
  make('build-thorn-hedge', 34, 38, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(17, 35, 32, 6);
    g.fillStyle(0x6e3a2d, 1);
    g.fillRoundedRect(1, 11, 32, 24, 9);
    g.lineStyle(3, 0x8c4a3a, 1);
    for (const [x1, y1, x2, y2] of [
      [4, 32, 6, 9],
      [12, 33, 15, 5],
      [21, 33, 24, 6],
      [29, 32, 30, 10],
      [6, 24, 28, 18],
    ])
      g.lineBetween(x1, y1, x2, y2);
    g.fillStyle(0xc9876e, 1);
    for (const [x, y] of [[6, 9], [15, 5], [24, 6], [30, 10], [9, 20], [20, 16], [27, 26], [12, 29]])
      g.fillTriangle(x - 2, y + 1.5, x + 2, y + 1.5, x, y - 3);
    g.fillStyle(0xc4607a, 1);
    g.fillCircle(18, 12, 2);
    g.fillCircle(8, 27, 1.8);
  });
  make('build-wattle', 32, 34, (g) => {
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(16, 31, 30, 5);
    for (const x of [3, 14, 25]) {
      g.fillStyle(0x6d4a30, 1);
      g.fillRoundedRect(x, 6, 4, 25, 1.5);
    }
    g.lineStyle(3, 0xb69a62, 1);
    for (const [y, dy] of [[12, 1.5], [18, -1.5], [24, 1.5]]) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(8, y + dy);
      g.lineTo(16, y - dy);
      g.lineTo(24, y + dy);
      g.lineTo(32, y - dy);
      g.strokePath();
    }
    g.fillStyle(0x7fa35a, 1);
    g.fillEllipse(6, 8, 6, 3);
    g.fillEllipse(27, 9, 6, 3);
  });
  make('build-reed-bridge', 32, 32, (g) => {
    g.fillStyle(0x3a2a1e, 0.35);
    g.fillRect(0, 2, 32, 30);
    for (let i = 0; i < 4; i++) {
      g.fillStyle(i % 2 === 0 ? 0xcfc77e : 0xbdb56c, 1);
      g.fillRoundedRect(0.5, i * 8 + 0.5, 31, 7, 3);
      g.lineStyle(1, 0x9a9650, 0.9);
      g.lineBetween(3, i * 8 + 3.5, 29, i * 8 + 3.5);
      g.lineStyle(1.6, 0x8a603d, 1);
      g.lineBetween(9, i * 8 + 1, 9, i * 8 + 7);
      g.lineBetween(23, i * 8 + 1, 23, i * 8 + 7);
    }
  });
  make('build-shelter', 44, 54, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(22, 50, 42, 7);
    // Bedroll under the roof.
    g.fillStyle(0xc9b28a, 1);
    g.fillRoundedRect(11, 40, 22, 8, 4);
    g.fillStyle(0x9b5a4a, 1);
    g.fillRoundedRect(11, 40, 8, 8, 4);
    // Posts on stone feet.
    g.fillStyle(0x9a968c, 1);
    g.fillRoundedRect(3, 46, 8, 5, 2);
    g.fillRoundedRect(33, 46, 8, 5, 2);
    g.fillStyle(0x6d4a30, 1);
    g.fillRect(5, 20, 4, 28);
    g.fillRect(35, 20, 4, 28);
    g.fillStyle(0x8a603d, 1);
    g.fillRect(5, 20, 1.5, 28);
    g.fillRect(35, 20, 1.5, 28);
    // Mossy lean-to roof with a tin patch.
    g.fillStyle(0x6e4a2f, 1);
    g.fillTriangle(0, 24, 22, 2, 44, 24);
    g.fillStyle(0x8a603d, 1);
    g.fillTriangle(4, 22, 22, 5, 40, 22);
    g.lineStyle(1.2, 0x6e4a2f, 1);
    for (const x of [12, 17, 27, 32]) g.lineBetween(x, 22, 22, 5);
    g.fillStyle(0x9ea5ad, 1);
    g.fillRoundedRect(24, 13, 9, 6, 1);
    g.fillStyle(0x6a9a4e, 0.95);
    g.fillCircle(10, 21, 3.5);
    g.fillCircle(16, 14, 3);
    g.fillCircle(31, 21, 3);
  });

  // ── Animal homes and their residents (systems/animals.ts, systems/animalLayer.ts) ──
  make('build-beehive', 30, 40, (g) => {
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(15, 37, 28, 5);
    g.fillStyle(0x6d4a30, 1);
    g.fillRect(5, 28, 3, 10);
    g.fillRect(22, 28, 3, 10);
    g.fillRoundedRect(3, 25, 24, 5, 2);
    g.fillStyle(0xd9a441, 1);
    g.fillRoundedRect(6, 8, 18, 18, 3);
    g.fillStyle(0xb98530, 1);
    g.fillRect(6, 13, 18, 2);
    g.fillRect(6, 19, 18, 2);
    g.fillStyle(0x6e4a2f, 1);
    g.fillRoundedRect(4, 3, 22, 7, 3);
    g.fillStyle(0x3a2a1e, 1);
    g.fillEllipse(15, 22, 6, 4);
    g.fillStyle(0x6a9a4e, 0.9);
    g.fillCircle(7, 4.5, 2.4);
    g.fillCircle(24, 5, 2);
  });
  make('build-henhouse', 40, 40, (g) => {
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(20, 37, 38, 6);
    g.fillStyle(0x8a603d, 1);
    g.fillRoundedRect(4, 15, 32, 21, 2);
    g.lineStyle(1.2, 0x6e4a2f, 1);
    for (const x of [11, 18, 25, 32]) g.lineBetween(x, 16, x, 35);
    g.fillStyle(0x6e4a2f, 1);
    g.fillTriangle(0, 17, 20, 2, 40, 17);
    g.fillStyle(0xa8753f, 1);
    g.fillTriangle(5, 16, 20, 5, 35, 16);
    g.fillStyle(0x2c2018, 1);
    g.fillRoundedRect(15, 24, 10, 12, 4);
    g.fillStyle(0xe9d089, 1);
    g.fillRect(6, 33, 8, 3);
    g.fillStyle(0xf2e4c9, 1);
    g.fillEllipse(30, 34, 5, 6);
  });
  make('build-goatpen', 44, 36, (g) => {
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(22, 33, 42, 6);
    g.fillStyle(0x9a8a4a, 0.55);
    g.fillEllipse(22, 26, 36, 12);
    for (const x of [2, 15, 28, 39]) {
      g.fillStyle(0x6d4a30, 1);
      g.fillRoundedRect(x, 8, 4, 24, 1.5);
    }
    g.fillStyle(0x8a603d, 1);
    g.fillRect(0, 13, 44, 3.5);
    g.fillRect(0, 22, 44, 3.5);
    g.fillStyle(0xa8753f, 1);
    g.fillRect(0, 13, 44, 1.2);
    g.fillRect(0, 22, 44, 1.2);
    g.fillStyle(0xe9d089, 1);
    g.fillRoundedRect(17, 26, 10, 5, 2);
  });
  make('build-stable', 52, 52, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(26, 48, 50, 7);
    g.fillStyle(0x7a5233, 1);
    g.fillRoundedRect(4, 20, 44, 28, 2);
    g.lineStyle(1.2, 0x5c3b25, 1);
    for (const x of [12, 20, 28, 36, 44]) g.lineBetween(x, 21, x, 47);
    g.fillStyle(0x5c3b25, 1);
    g.fillTriangle(0, 22, 26, 3, 52, 22);
    g.fillStyle(0x8a603d, 1);
    g.fillTriangle(6, 21, 26, 6, 46, 21);
    g.fillStyle(0x2c2018, 1);
    g.fillRoundedRect(13, 28, 26, 20, 3);
    // Mohn looks out over the half door.
    g.fillStyle(0x9a6a42, 1);
    g.fillEllipse(26, 36, 12, 11);
    g.fillTriangle(21, 31, 24, 28, 24, 33);
    g.fillTriangle(31, 31, 28, 28, 28, 33);
    g.fillStyle(0xd9b48a, 1);
    g.fillEllipse(26, 41, 7, 5);
    g.fillStyle(0x2c2018, 1);
    g.fillCircle(23, 35, 1);
    g.fillCircle(29, 35, 1);
    g.fillStyle(0x8a603d, 1);
    g.fillRect(13, 42, 26, 6);
    g.fillStyle(0xe9d089, 1);
    g.fillRect(6, 44, 6, 3);
  });
  make('hen', 24, 22, (g) => {
    g.fillStyle(0x000000, 0.16);
    g.fillEllipse(12, 20, 18, 4);
    g.fillStyle(0xd9a441, 1);
    g.fillRect(9, 15, 1.6, 5);
    g.fillRect(14, 15, 1.6, 5);
    g.fillStyle(0xf2e4c9, 1);
    g.fillEllipse(11, 12, 18, 13);
    g.fillTriangle(2, 8, 5, 12, 2, 14);
    g.fillStyle(0xd9c7a3, 1);
    g.fillEllipse(9, 13, 9, 7);
    g.fillStyle(0xf2e4c9, 1);
    g.fillCircle(17, 6, 4.5);
    g.fillStyle(0xd84a3a, 1);
    g.fillCircle(16, 2, 1.8);
    g.fillCircle(18.5, 2.3, 1.5);
    g.fillStyle(0xe9a23b, 1);
    g.fillTriangle(20.5, 5, 24, 6.5, 20.5, 8);
    g.fillStyle(0x3a2a1e, 1);
    g.fillCircle(18, 5.5, 0.9);
  });
  make('goat', 34, 30, (g) => {
    g.fillStyle(0x000000, 0.16);
    g.fillEllipse(17, 28, 28, 5);
    g.fillStyle(0xd8d0bf, 1);
    g.fillRoundedRect(7, 19, 3.5, 9, 1);
    g.fillRoundedRect(21, 19, 3.5, 9, 1);
    g.fillStyle(0xf1ead9, 1);
    g.fillEllipse(15, 17, 24, 13);
    g.fillRoundedRect(11, 20, 3.5, 8, 1);
    g.fillRoundedRect(24, 20, 3.5, 8, 1);
    g.fillTriangle(22, 12, 28, 5, 30, 13);
    g.fillEllipse(29, 8, 9, 7);
    g.fillStyle(0xb9a98a, 1);
    g.fillTriangle(25, 4, 27, 0, 28, 5);
    g.fillTriangle(30, 4, 31.5, 0, 31, 5);
    g.fillStyle(0xf1ead9, 1);
    g.fillTriangle(28, 12, 30, 12, 29, 17);
    g.fillStyle(0x3a2a1e, 1);
    g.fillCircle(30, 7, 0.9);
    g.fillEllipse(33, 9, 2.5, 2);
    g.fillStyle(0xb9a98a, 1);
    g.fillEllipse(3.5, 14, 5, 3);
  });
  make('bee', 8, 8, (g) => {
    g.fillStyle(0xdff2f7, 0.8);
    g.fillEllipse(3, 2, 4, 3);
    g.fillEllipse(5, 2, 4, 3);
    g.fillStyle(0xe9b83b, 1);
    g.fillEllipse(4, 5, 6, 4);
    g.fillStyle(0x2c2018, 1);
    g.fillRect(3, 3.5, 1, 3);
    g.fillRect(5, 3.5, 1, 3);
  });

  make('build-rain-barrel', 34, 40, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(17, 37, 32, 6);
    g.fillStyle(0x7a5233, 1);
    g.fillRoundedRect(4, 8, 26, 28, 6);
    g.fillStyle(0x9a6a40, 1);
    for (const x of [8, 14, 20, 26]) g.fillRect(x, 9, 1.4, 26);
    g.fillStyle(0x5d6770, 1);
    g.fillRect(4, 14, 26, 3);
    g.fillRect(4, 28, 26, 3);
    g.fillStyle(0x4a3624, 1);
    g.fillEllipse(17, 9, 26, 8);
    g.fillStyle(0x5aa3c8, 1);
    g.fillEllipse(17, 9.5, 22, 6);
    g.fillStyle(0xcfeaf6, 0.8);
    g.fillEllipse(13, 8.5, 7, 2);
    g.fillStyle(0x8a8f96, 1);
    g.fillRect(27, 20, 6, 3);
    g.fillStyle(0x5aa3c8, 0.9);
    g.fillCircle(32, 26, 1.4);
  });
  make('build-compost', 40, 32, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(20, 29, 38, 6);
    g.fillStyle(0x4a3322, 1);
    g.fillEllipse(20, 19, 34, 20);
    g.fillStyle(0x5f4630, 1);
    g.fillEllipse(20, 14, 26, 14);
    g.fillStyle(0x6a9a4e, 1);
    g.fillEllipse(12, 12, 7, 4);
    g.fillEllipse(25, 10, 8, 4);
    g.fillStyle(0xc45a3a, 1);
    g.fillCircle(19, 15, 2);
    g.fillStyle(0xe9a23b, 1);
    g.fillCircle(28, 15, 1.6);
    g.fillStyle(0x8a603d, 1);
    g.fillRoundedRect(1, 14, 5, 15, 2);
    g.fillRoundedRect(34, 14, 5, 15, 2);
    g.fillRect(2, 22, 36, 3);
  });
  make('build-drying-rack', 44, 44, (g) => {
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(22, 41, 40, 6);
    g.fillStyle(0x6d4a30, 1);
    g.fillRoundedRect(4, 8, 5, 33, 2);
    g.fillRoundedRect(35, 8, 5, 33, 2);
    g.fillStyle(0x8a603d, 1);
    g.fillRoundedRect(2, 8, 40, 4, 2);
    g.fillRect(5, 8, 1.5, 33);
    g.fillRect(36, 8, 1.5, 33);
    g.lineStyle(1.2, 0xc9b28a, 1);
    for (const [x, c] of [
      [12, 0x9b84d6],
      [22, 0x6a9a4e],
      [32, 0xe9a23b],
    ] as const) {
      g.lineBetween(x, 12, x, 17);
      g.fillStyle(c, 1);
      g.fillTriangle(x - 4, 17, x + 4, 17, x, 31);
      g.fillStyle(0xffffff, 0.25);
      g.fillTriangle(x - 4, 17, x - 1, 17, x, 29);
    }
    g.fillStyle(0xf1e6c8, 1);
    g.fillRect(4, 38, 36, 2);
  });
  make('build-windmill', 48, 66, (g) => {
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(24, 62, 46, 8);
    g.fillStyle(0x9a968c, 1);
    g.fillRoundedRect(3, 54, 42, 9, 3);
    g.fillStyle(0xd9c79a, 1);
    g.fillTriangle(8, 56, 40, 56, 33, 22);
    g.fillTriangle(8, 56, 33, 22, 15, 22);
    g.fillStyle(0xeee3c3, 0.7);
    g.fillTriangle(10, 56, 18, 56, 20, 22);
    g.fillTriangle(10, 56, 20, 22, 15, 22);
    g.lineStyle(1.2, 0x9a835a, 1);
    for (const y of [32, 42, 50]) g.lineBetween(12 + (56 - y) * 0.15, y, 36 - (56 - y) * 0.15, y);
    g.fillStyle(0x6d4a30, 1);
    g.fillRoundedRect(19, 42, 10, 14, 5);
    g.fillStyle(0xffe08a, 0.9);
    g.fillRoundedRect(21.5, 30, 5, 6, 2);
    g.fillStyle(0x8a603d, 1);
    g.fillTriangle(10, 24, 24, 4, 38, 24);
    g.fillStyle(0xa8753f, 1);
    g.fillTriangle(14, 23, 24, 8, 30, 23);
    g.fillStyle(0x6a9a4e, 0.9);
    g.fillCircle(8, 57, 3);
    g.fillCircle(41, 58, 2.5);
  });
  make('build-windmill-sails', 52, 52, (g) => {
    g.lineStyle(3, 0x6d4a30, 1);
    g.lineBetween(26, 2, 26, 50);
    g.lineBetween(2, 26, 50, 26);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      // A cloth panel beside each arm.
      const at = (along: number, across: number): [number, number] => [26 + ca * along - sa * across, 26 + sa * along + ca * across];
      g.fillStyle(i % 2 === 0 ? 0xe9dcc0 : 0xd9c79a, 1);
      g.fillTriangle(...at(8, 1), ...at(24, 1), ...at(24, 8));
      g.fillTriangle(...at(8, 1), ...at(24, 8), ...at(8, 8));
    }
    g.fillStyle(0x4a3624, 1);
    g.fillCircle(26, 26, 4);
    g.fillStyle(0xa8753f, 1);
    g.fillCircle(26, 26, 2);
  });

  // ── The blight ──
  make('blight-tile', 44, 44, (g) => {
    const rnd = seededRandom(7411);
    g.fillStyle(0x4b4456, 0.5);
    g.fillRoundedRect(4, 4, 36, 36, 12);
    for (let i = 0; i < 9; i++) {
      g.fillStyle(i % 2 === 0 ? 0x3a3344 : 0x5f566b, 0.42);
      g.fillCircle(8 + rnd() * 28, 8 + rnd() * 28, 5 + rnd() * 6);
    }
    g.lineStyle(1.4, 0x2a2533, 0.55);
    for (let i = 0; i < 5; i++) {
      const x = 8 + rnd() * 28;
      const y = 8 + rnd() * 28;
      g.lineBetween(x, y, x + (rnd() - 0.5) * 16, y + (rnd() - 0.5) * 16);
    }
    g.fillStyle(0x9a8fa8, 0.5);
    for (let i = 0; i < 5; i++) g.fillCircle(8 + rnd() * 28, 8 + rnd() * 28, 1.2);
  });
  const drawHeart = (g: G, root: number, knot: number, core: number, coreAlpha: number): void => {
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(24, 38, 44, 8);
    g.lineStyle(4, root, 1);
    g.lineBetween(24, 28, 3, 36);
    g.lineBetween(24, 28, 45, 37);
    g.lineBetween(24, 26, 9, 14);
    g.lineBetween(24, 26, 40, 12);
    g.lineBetween(24, 24, 24, 4);
    g.fillStyle(knot, 1);
    g.fillCircle(24, 26, 12);
    g.fillCircle(15, 30, 7);
    g.fillCircle(33, 30, 7);
    g.fillStyle(core, coreAlpha * 0.35);
    g.fillCircle(24, 25, 9);
    g.fillStyle(core, coreAlpha);
    g.fillCircle(24, 25, 4.5);
  };
  make('blight-heart', 48, 42, (g) => drawHeart(g, 0x2f2a38, 0x443c50, 0xb48ad6, 0.9));
  make('blight-heart-sealed', 48, 42, (g) => {
    drawHeart(g, 0x6f6a66, 0x8a8580, 0xb9b5aa, 0.5);
    // A first green shoot on the quiet knot.
    g.fillStyle(0x3f6b35, 1);
    g.fillRect(23, 8, 2, 12);
    g.fillStyle(0x8fbd66, 1);
    g.fillEllipse(20, 9, 7, 4);
    g.fillEllipse(28, 7, 7, 4);
  });
}


/** Growth stages of the guarding, building and food plants (`plant-<id>-sprout|growing|mature`, see systems/plantLayer.ts). */
function generateCropTextures(make: MakeFn): void {
  const shadow = (g: G, w: number, h: number): void => {
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(w / 2, h - 3, w * 0.7, 6);
  };
  const cap = (g: G, x: number, y: number, r: number): void => {
    g.fillStyle(0xe8f5d0, 1);
    g.fillRect(x - r * 0.18, y, r * 0.36, r * 0.9);
    g.fillStyle(0x9be86b, 1);
    g.fillEllipse(x, y, r * 2, r * 1.3);
    g.fillStyle(0xd5ffb0, 0.9);
    g.fillCircle(x - r * 0.4, y - r * 0.1, r * 0.2);
    g.fillCircle(x + r * 0.35, y - r * 0.25, r * 0.17);
  };

  // Glowcap
  make('plant-glowcap-sprout', 18, 18, (g) => cap(g, 9, 11, 5));
  make('plant-glowcap-growing', 28, 28, (g) => {
    cap(g, 9, 17, 6.5);
    cap(g, 20, 20, 5);
  });
  make('plant-glowcap-mature', 40, 40, (g) => {
    shadow(g, 40, 40);
    g.fillStyle(0x4c7a3d, 1);
    g.fillEllipse(20, 35, 32, 8);
    cap(g, 12, 24, 8);
    cap(g, 28, 26, 7);
    cap(g, 20, 15, 9);
  });

  // Thornroot
  const thorns = (g: G, pts: number[][]): void => {
    g.fillStyle(0xc9876e, 1);
    for (const [x, y] of pts) g.fillTriangle(x - 2, y + 1.5, x + 2, y + 1.5, x, y - 3);
  };
  make('plant-thornroot-sprout', 18, 18, (g) => {
    g.lineStyle(2, 0x8c4a3a, 1);
    g.lineBetween(9, 17, 9, 8);
    g.lineBetween(9, 11, 14, 6);
    thorns(g, [[14, 6], [9, 7]]);
  });
  make('plant-thornroot-growing', 28, 36, (g) => {
    g.lineStyle(2.6, 0x8c4a3a, 1);
    g.lineBetween(14, 34, 8, 12);
    g.lineBetween(14, 34, 14, 7);
    g.lineBetween(14, 34, 21, 14);
    thorns(g, [[8, 12], [14, 7], [21, 14], [11, 22], [18, 24]]);
    g.fillStyle(0x5d7f45, 1);
    g.fillEllipse(8, 26, 7, 3.5);
  });
  make('plant-thornroot-mature', 44, 48, (g) => {
    shadow(g, 44, 48);
    g.fillStyle(0x6e3a2d, 1);
    g.fillRoundedRect(4, 18, 36, 26, 12);
    g.lineStyle(3, 0x8c4a3a, 1);
    for (const [x1, y1, x2, y2] of [
      [8, 40, 6, 12],
      [16, 42, 18, 6],
      [26, 42, 30, 8],
      [36, 40, 39, 15],
      [12, 30, 30, 22],
    ])
      g.lineBetween(x1, y1, x2, y2);
    thorns(g, [[6, 12], [18, 6], [30, 8], [39, 15], [12, 24], [24, 20], [33, 30], [10, 36], [26, 34]]);
    g.fillStyle(0xc4607a, 1);
    g.fillCircle(21, 14, 2.4);
    g.fillCircle(34, 22, 2);
  });

  // Reed
  const blade = (g: G, x: number, y: number, top: number, lean: number): void => {
    g.lineStyle(2, 0xa7a45a, 1);
    g.lineBetween(x, y, x + lean, top);
  };
  make('plant-reed-sprout', 18, 18, (g) => {
    blade(g, 7, 17, 8, -1);
    blade(g, 11, 17, 6, 1);
  });
  make('plant-reed-growing', 28, 38, (g) => {
    for (const [x, top, lean] of [[8, 14, -2], [12, 8, -1], [16, 5, 0], [20, 10, 2], [24, 16, 3]]) blade(g, x, 36, top, lean);
  });
  make('plant-reed-mature', 40, 54, (g) => {
    shadow(g, 40, 54);
    for (const [x, top, lean] of [[8, 22, -3], [13, 10, -2], [18, 4, -1], [23, 7, 1], [28, 14, 2], [33, 24, 4]]) {
      blade(g, x, 50, top, lean);
      g.fillStyle(0x7a5a3c, 1);
      g.fillEllipse(x + lean, top + 2, 3.5, 8);
    }
    g.fillStyle(0xd2cf84, 1);
    g.fillEllipse(14, 38, 9, 3.5);
    g.fillEllipse(27, 34, 9, 3.5);
  });

  // Willow
  const leaves = (g: G, pts: number[][]): void => {
    g.fillStyle(0x7fa35a, 1);
    for (const [x, y] of pts) g.fillEllipse(x, y, 7, 3.5);
  };
  make('plant-willow-sprout', 18, 18, (g) => {
    g.lineStyle(1.8, 0xb69a62, 1);
    g.lineBetween(9, 17, 9, 5);
    leaves(g, [[6, 8], [12, 6]]);
  });
  make('plant-willow-growing', 30, 40, (g) => {
    g.lineStyle(2.4, 0xb69a62, 1);
    g.lineBetween(15, 38, 15, 8);
    g.lineBetween(15, 30, 8, 14);
    g.lineBetween(15, 26, 23, 12);
    leaves(g, [[8, 12], [23, 10], [15, 6], [11, 20], [20, 19]]);
  });
  make('plant-willow-mature', 48, 56, (g) => {
    shadow(g, 48, 56);
    g.lineStyle(3, 0x9d8450, 1);
    g.lineBetween(24, 52, 24, 14);
    g.lineBetween(24, 28, 10, 12);
    g.lineBetween(24, 24, 38, 10);
    g.lineStyle(1.8, 0x7fa35a, 1);
    for (const x of [8, 13, 18, 30, 35, 40]) g.lineBetween(x, 14, x + (x < 24 ? -2 : 2), 38 + (x % 3) * 3);
    g.lineBetween(24, 10, 24, 34);
    g.fillStyle(0x93b86c, 1);
    g.fillEllipse(24, 11, 30, 12);
    g.fillStyle(0x7fa35a, 1);
    g.fillEllipse(14, 14, 16, 9);
    g.fillEllipse(34, 14, 16, 9);
  });

  // Honeyberry
  const berries = (g: G, pts: number[][], r: number): void => {
    for (const [x, y] of pts) {
      g.fillStyle(0xe0a33a, 1);
      g.fillCircle(x, y, r);
      g.fillStyle(0xfbe3a0, 0.9);
      g.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.35);
    }
  };
  make('plant-honeyberry-sprout', 18, 18, (g) => {
    g.fillStyle(0x4c7a3d, 1);
    g.fillEllipse(6, 12, 7, 4);
    g.fillEllipse(12, 11, 7, 4);
    g.lineStyle(1.6, 0x3f6b35, 1);
    g.lineBetween(9, 17, 9, 10);
  });
  make('plant-honeyberry-growing', 28, 30, (g) => {
    g.fillStyle(0x4c7a3d, 1);
    g.fillEllipse(14, 21, 24, 16);
    g.fillStyle(0x6a9a4e, 1);
    g.fillCircle(9, 17, 5);
    g.fillCircle(19, 16, 5);
    berries(g, [[11, 24]], 2);
  });
  make('plant-honeyberry-mature', 38, 40, (g) => {
    shadow(g, 38, 40);
    g.fillStyle(0x3f6b35, 1);
    g.fillEllipse(19, 28, 34, 20);
    g.fillStyle(0x4c7a3d, 1);
    g.fillCircle(11, 22, 8);
    g.fillCircle(27, 22, 8);
    g.fillCircle(19, 17, 9);
    g.fillStyle(0x6a9a4e, 1);
    g.fillCircle(16, 14, 4);
    berries(g, [[9, 24], [15, 28], [22, 24], [29, 27], [19, 18], [26, 17], [12, 17]], 2.8);
  });

  // Golden turnip
  const leafTuft = (g: G, x: number, y: number, s: number): void => {
    g.fillStyle(0x5d7f45, 1);
    g.fillTriangle(x, y - 9 * s, x - 3 * s, y, x + 3 * s, y);
    g.fillTriangle(x - 7 * s, y - 6 * s, x - 5 * s, y, x - 1 * s, y);
    g.fillTriangle(x + 7 * s, y - 6 * s, x + 5 * s, y, x + 1 * s, y);
  };
  make('plant-gold-turnip-sprout', 18, 18, (g) => leafTuft(g, 9, 16, 0.9));
  make('plant-gold-turnip-growing', 28, 28, (g) => {
    leafTuft(g, 14, 22, 1.3);
    g.fillStyle(0x7a5a3c, 1);
    g.fillEllipse(14, 25, 14, 5);
  });
  make('plant-gold-turnip-mature', 36, 40, (g) => {
    shadow(g, 36, 40);
    g.fillStyle(0x7a5a3c, 1);
    g.fillEllipse(18, 34, 28, 9);
    leafTuft(g, 18, 28, 1.9);
    g.fillStyle(0xefc45c, 1);
    g.fillEllipse(18, 31, 14, 8);
    g.fillStyle(0xf8de94, 0.8);
    g.fillEllipse(15, 29.5, 4, 2.5);
  });
}


/** A villager in a 28 × 40 box, facing right (same proportions as the gardener and Jakob). */
function drawVillager(g: G, look: VillagerLook): void {
  g.fillStyle(0x3a2a1e, 1); // boots
  g.fillRoundedRect(8, 34, 5, 5, 2);
  g.fillRoundedRect(15, 34, 5, 5, 2);
  g.fillStyle(look.bottom, 1);
  g.fillRoundedRect(8, 26, 5, 10, 2);
  g.fillRoundedRect(15, 26, 5, 10, 2);
  g.fillStyle(look.top, 1);
  g.fillRoundedRect(5, 15, 18, 15, 5);
  if (look.apron !== undefined) {
    g.fillStyle(look.apron, 1);
    g.fillRoundedRect(8, 17, 12, 15, 3);
  }
  g.fillStyle(look.hair, 1);
  g.fillCircle(14, 9.5, 7.6);
  g.fillStyle(look.skin, 1);
  g.fillCircle(14.5, 11.5, 6.3);
  if (look.beard) {
    g.fillStyle(look.hair, 1);
    g.fillEllipse(14.5, 16, 10, 6);
  }
  drawVillagerHat(g, look, 1);
  g.fillStyle(0x3a2a1e, 1);
  g.fillCircle(17.2, 11.5, 1.2);
}

/** Headwear; `s` scales the 28 × 40 sprite coordinates (the portrait draws it again at 2.1×). */
function drawVillagerHat(g: G, look: VillagerLook, s: number, dx = 0, dy = 0): void {
  const x = (v: number): number => dx + v * s;
  const y = (v: number): number => dy + v * s;
  g.fillStyle(look.hatColor, 1);
  switch (look.hat) {
    case 'cap':
      g.fillRoundedRect(x(7), y(2), 14 * s, 6 * s, 3 * s);
      g.fillRect(x(11), y(6), 11 * s, 2.5 * s);
      break;
    case 'scarf':
      g.fillEllipse(x(14), y(6), 17 * s, 8 * s);
      g.fillCircle(x(21), y(8), 2.6 * s);
      break;
    case 'straw':
      g.fillEllipse(x(14), y(7), 24 * s, 8 * s);
      g.fillRoundedRect(x(8), y(0), 12 * s, 8 * s, 4 * s);
      g.fillStyle(0xb5533c, 1);
      g.fillRect(x(8), y(5), 12 * s, 2 * s);
      break;
    case 'beret':
      g.fillEllipse(x(15), y(5), 20 * s, 7 * s);
      g.fillCircle(x(14), y(1.6), 1.6 * s);
      break;
    case 'bun':
      g.fillCircle(x(14), y(2.6), 3.6 * s);
      break;
    case 'none':
      break;
  }
}

function drawVillagerPortrait(g: G, look: VillagerLook): void {
  g.fillStyle(0x2f3b40, 1);
  g.fillRoundedRect(0, 0, 64, 64, 10);
  g.fillStyle(look.top, 0.25);
  g.fillCircle(48, 16, 16);
  g.fillStyle(look.top, 1);
  g.fillEllipse(32, 56, 46, 24);
  if (look.apron !== undefined) {
    g.fillStyle(look.apron, 1);
    g.fillRoundedRect(22, 44, 20, 18, 5);
  }
  g.fillStyle(look.hair, 1);
  g.fillCircle(32, 27, 15);
  g.fillStyle(look.skin, 1);
  g.fillCircle(32, 32, 12.5);
  if (look.beard) {
    g.fillStyle(look.hair, 1);
    g.fillEllipse(32, 41, 20, 12);
  }
  g.fillStyle(0x3a2a1e, 1);
  g.fillCircle(27, 30, 2);
  g.fillCircle(37, 30, 2);
  g.fillStyle(0xb5694f, 1);
  g.fillRoundedRect(29, 37, 7, 2, 1);
  drawVillagerHat(g, look, 2.1, 2, 2);
}

/** The villagers (NPC id = texture key) and the buildings that appear when a quarter is restored (content/village.ts). */
function generateVillageTextures(make: MakeFn): void {
  for (const v of VILLAGERS) {
    make(v.id, 28, 40, (g) => drawVillager(g, v.look));
    make(`portrait-${v.id}`, 64, 64, (g) => drawVillagerPortrait(g, v.look));
  }
  const shadow = (g: G, w: number, h: number, depth = 12): void => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(w / 2, h - depth / 2, w - 8, depth);
  };

  make('village-bakery', 132, 112, (g) => {
    shadow(g, 132, 112);
    g.fillStyle(0xd9c3a0, 1); // plaster walls with timber beams
    g.fillRoundedRect(8, 40, 116, 64, 4);
    g.fillStyle(0x7a5538, 1);
    g.fillRect(8, 40, 116, 4);
    g.fillRect(8, 100, 116, 4);
    g.fillRect(40, 44, 4, 56);
    g.fillRect(88, 44, 4, 56);
    g.fillStyle(0xa5523a, 1); // roof
    g.fillTriangle(0, 46, 132, 46, 66, 6);
    g.fillStyle(0xbd6446, 1);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 9; col++) {
      const rx = 12 + col * 12 + (row % 2) * 6;
      const ry = 16 + row * 7;
      if (Math.abs(rx + 4 - 66) < 52 - row * 11.5 + 8) g.fillRoundedRect(rx, ry, 10, 5, 2);
    }
    g.fillStyle(0x8a5a4a, 1); // chimney
    g.fillRect(94, 6, 12, 26);
    g.fillStyle(0xdad6d0, 0.7); // smoke
    g.fillCircle(100, 3, 4);
    g.fillCircle(104, -1, 3);
    g.fillStyle(0x6e4529, 1); // door
    g.fillRoundedRect(52, 64, 28, 40, 6);
    g.fillStyle(0xc9a227, 1);
    g.fillCircle(75, 86, 2);
    g.fillStyle(0xf6d98a, 1); // warm windows
    g.fillRect(16, 62, 22, 22);
    g.fillRect(94, 62, 22, 22);
    g.fillStyle(0x7a5538, 1);
    g.fillRect(26, 62, 2, 22);
    g.fillRect(16, 72, 22, 2);
    g.fillRect(104, 62, 2, 22);
    g.fillRect(94, 72, 22, 2);
    for (let i = 0; i < 6; i++) { // striped awning over the door
      g.fillStyle(i % 2 ? 0xf3ead6 : 0xb5533c, 1);
      g.fillRect(46 + i * 7, 54, 7, 9);
    }
    g.fillStyle(0xd9a45a, 1); // loaf sign
    g.fillEllipse(108, 52, 16, 9);
    g.fillStyle(0xb57a3a, 1);
    g.fillRect(100, 51, 16, 1.5);
  });

  make('village-lamp', 22, 64, (g) => {
    shadow(g, 22, 64, 6);
    g.fillStyle(0xf6d98a, 0.22); // glow
    g.fillCircle(11, 16, 12);
    g.fillStyle(0x3a3a3f, 1);
    g.fillRect(9, 24, 4, 36);
    g.fillRoundedRect(6, 56, 10, 5, 2);
    g.fillRect(4, 8, 14, 3);
    g.fillTriangle(3, 8, 19, 8, 11, 1);
    g.fillStyle(0xf6d98a, 1);
    g.fillRoundedRect(6, 11, 10, 13, 2);
    g.fillStyle(0xfff3c4, 1);
    g.fillRect(9, 14, 4, 7);
  });

  make('village-stall', 92, 68, (g) => {
    shadow(g, 92, 68);
    g.fillStyle(0x5c3b25, 1); // posts
    g.fillRect(6, 14, 4, 50);
    g.fillRect(82, 14, 4, 50);
    for (let i = 0; i < 8; i++) { // awning stripes
      g.fillStyle(i % 2 ? 0xf3ead6 : 0xb5533c, 1);
      g.fillRect(2 + i * 11, 4, 11, 16);
    }
    g.fillStyle(0xb5533c, 1);
    for (let i = 0; i < 8; i += 2) g.fillTriangle(2 + i * 11, 20, 13 + i * 11, 20, 7.5 + i * 11, 26);
    g.fillStyle(0x8a603d, 1); // counter
    g.fillRoundedRect(8, 42, 76, 20, 3);
    g.fillStyle(0xa8753f, 1);
    g.fillRect(8, 42, 76, 4);
    g.fillStyle(0xd9a45a, 1); // loaves
    g.fillEllipse(26, 38, 14, 8);
    g.fillEllipse(44, 39, 16, 8);
    g.fillEllipse(62, 38, 14, 8);
    g.fillStyle(0xb57a3a, 1);
    g.fillRect(24, 37, 8, 1.5);
    g.fillRect(41, 38, 10, 1.5);
    g.fillRect(59, 37, 8, 1.5);
  });

  make('village-shop', 132, 112, (g) => {
    shadow(g, 132, 112);
    g.fillStyle(0x9a6a45, 1); // barn planks
    g.fillRoundedRect(8, 36, 116, 68, 3);
    g.fillStyle(0x7a5538, 1);
    for (let i = 0; i < 12; i++) g.fillRect(12 + i * 9.6, 38, 1.5, 64);
    g.fillStyle(0x7d3f32, 1); // roof
    g.fillTriangle(0, 42, 132, 42, 66, 4);
    g.fillStyle(0x93503f, 1);
    g.fillTriangle(10, 40, 122, 40, 66, 12);
    g.fillStyle(0x3a2a1e, 1); // loft hatch with hay
    g.fillRect(58, 22, 16, 14);
    g.fillStyle(0xd9c070, 1);
    g.fillRect(60, 30, 12, 6);
    g.fillStyle(0x6e4529, 1); // double door
    g.fillRoundedRect(36, 58, 44, 46, 3);
    g.fillStyle(0x4a2f1d, 1);
    g.fillRect(57, 58, 2, 46);
    g.lineStyle(2, 0x4a2f1d, 1);
    g.lineBetween(38, 60, 56, 102);
    g.lineBetween(56, 60, 38, 102);
    g.lineBetween(60, 60, 78, 102);
    g.lineBetween(78, 60, 60, 102);
    g.fillStyle(0x5c3b25, 1); // shop counter + basket
    g.fillRoundedRect(88, 80, 30, 24, 2);
    g.fillStyle(0xefc45c, 1);
    g.fillCircle(96, 78, 5);
    g.fillCircle(104, 79, 5);
    g.fillStyle(0xe8739c, 1);
    g.fillCircle(111, 77, 4);
    g.fillStyle(0xf3ead6, 1); // chalk sign
    g.fillRoundedRect(12, 66, 18, 14, 2);
    g.fillStyle(0x6e4529, 1);
    g.fillRect(14, 70, 14, 1.5);
    g.fillRect(14, 74, 10, 1.5);
  });

  make('village-washing', 80, 56, (g) => {
    shadow(g, 80, 56, 6);
    g.fillStyle(0x5c3b25, 1);
    g.fillRect(6, 8, 4, 46);
    g.fillRect(70, 8, 4, 46);
    g.lineStyle(1.5, 0xc9c1a8, 1);
    g.lineBetween(8, 12, 72, 14);
    const cloth = (x: number, w: number, c: number): void => {
      g.fillStyle(c, 1);
      g.fillRect(x, 13, w, 20);
    };
    cloth(14, 14, 0xf3ead6);
    cloth(32, 12, 0x7fa8c9);
    cloth(48, 16, 0xe8a5a0);
  });

  make('village-press-house', 120, 100, (g) => {
    shadow(g, 120, 100);
    g.fillStyle(0xb68a5a, 1); // timber hut
    g.fillRoundedRect(10, 38, 100, 54, 3);
    g.fillStyle(0x8a603d, 1);
    g.fillRect(10, 38, 100, 4);
    g.fillRect(10, 88, 100, 4);
    g.fillStyle(0xc9b074, 1); // thatched roof
    g.fillTriangle(0, 44, 120, 44, 60, 4);
    g.fillStyle(0xa8925a, 1);
    for (let i = 0; i < 5; i++) g.fillRect(12 + i * 4, 40 - i * 7, 96 - i * 8, 1.5);
    g.fillStyle(0x6e4529, 1); // door
    g.fillRoundedRect(44, 58, 26, 34, 5);
    g.fillStyle(0xf6d98a, 1); // window
    g.fillRect(80, 54, 22, 18);
    g.fillStyle(0x7a5538, 1);
    g.fillRect(90, 54, 2, 18);
    g.fillRect(80, 62, 22, 2);
    g.fillStyle(0x8a603d, 1); // barrel
    g.fillRoundedRect(14, 66, 22, 26, 6);
    g.fillStyle(0x3a2a1e, 1);
    g.fillRect(14, 72, 22, 2);
    g.fillRect(14, 84, 22, 2);
    g.fillStyle(0xc9a227, 1); // honey jar on the sill
    g.fillRoundedRect(84, 66, 8, 7, 2);
  });

  make('village-crates', 52, 34, (g) => {
    shadow(g, 52, 34, 6);
    g.fillStyle(0x8a603d, 1);
    g.fillRoundedRect(2, 14, 22, 16, 2);
    g.fillRoundedRect(26, 18, 22, 12, 2);
    g.fillStyle(0xd9553f, 1);
    g.fillCircle(8, 12, 4.5);
    g.fillCircle(16, 11, 4.5);
    g.fillCircle(12, 8, 4.5);
    g.fillStyle(0x9bc25c, 1);
    g.fillCircle(32, 16, 4.5);
    g.fillCircle(41, 15, 4.5);
    g.fillStyle(0x6e4529, 1);
    g.fillRect(2, 20, 22, 2);
    g.fillRect(26, 23, 22, 2);
  });
}
