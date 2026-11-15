import Phaser from 'phaser';
import { seededRandom } from './grid';
import { TILE_IDS, TILE_SIZE, TILES, TILESET_MARGIN, TILESET_SPACING, type TileDef } from './tiles';

type G = Phaser.GameObjects.Graphics;

/**
 * Generates every texture the game uses from code (no external art).
 * Keys: 'tiles' (tileset strip) plus one key per prop/sprite (see PROP_TEXTURES below).
 */
export function generateTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  const make = (key: string, w: number, h: number, draw: (g: G) => void) => {
    g.clear();
    draw(g);
    g.generateTexture(key, w, h);
  };

  generateTileset(g);

  make('shadow', 32, 12, (g) => {
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(16, 6, 30, 10);
  });

  make('player', 28, 40, (g) => {
    g.fillStyle(0x3f5f3a, 1); // trousers
    g.fillRoundedRect(8, 26, 5, 12, 2);
    g.fillRoundedRect(15, 26, 5, 12, 2);
    g.fillStyle(0xd98f4e, 1); // jacket
    g.fillRoundedRect(5, 15, 18, 15, 6);
    g.fillStyle(0x5d7f45, 1); // satchel strap + bag
    g.fillRect(16, 16, 3, 13);
    g.fillRoundedRect(18, 22, 7, 7, 2);
    g.fillStyle(0xf2c9a0, 1); // face
    g.fillCircle(14, 11, 7);
    g.fillStyle(0xe8cf7a, 1); // straw hat
    g.fillEllipse(14, 7, 24, 8);
    g.fillRoundedRect(8, 0, 12, 8, 4);
    g.fillStyle(0xb5533c, 1);
    g.fillRect(8, 5, 12, 2);
    g.fillStyle(0x3a2a1e, 1); // eye (facing right)
    g.fillCircle(17, 12, 1.2);
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

  g.destroy();
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
  }
}
