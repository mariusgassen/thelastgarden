// Generates the app icons (SVG + PNGs) from code. No dependencies: PNGs are encoded with zlib.
// Usage: npm run icons
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const BG = [47, 74, 44];
const SUN = [233, 162, 59];
const LEAF = [143, 189, 102];
const LEAF_DARK = [93, 138, 69];
const GLASS = [231, 244, 239];

// Signed-distance-ish shape test in unit space (0..1), shared by SVG + raster.
function colorAt(u, v, maskable) {
  // Maskable icons need content inside the inner 80% safe zone; shrink the motif.
  const s = maskable ? 0.72 : 0.86;
  const x = (u - 0.5) / s + 0.5;
  const y = (v - 0.5) / s + 0.5;
  // sun disc
  if (Math.hypot(x - 0.5, y - 0.42) < 0.3) {
    // greenhouse arch silhouette (lower part)
    if (y > 0.42 && Math.abs(x - 0.5) < 0.2 && y < 0.72) {
      const inFrame = Math.abs(x - 0.5) > 0.18 || Math.abs(x - 0.5) < 0.012 || Math.abs(y - 0.57) < 0.012;
      return inFrame ? GLASS : BG;
    }
    return SUN;
  }
  // leaves
  const leaf = (cx, cy, rx, ry, rot) => {
    const c = Math.cos(rot);
    const sn = Math.sin(rot);
    const dx = x - cx;
    const dy = y - cy;
    const lx = (dx * c + dy * sn) / rx;
    const ly = (-dx * sn + dy * c) / ry;
    return lx * lx + ly * ly < 1;
  };
  if (leaf(0.36, 0.76, 0.17, 0.07, -0.6)) return LEAF;
  if (leaf(0.64, 0.76, 0.17, 0.07, 0.6)) return LEAF_DARK;
  if (x > 0.485 && x < 0.515 && y > 0.7 && y < 0.9) return LEAF_DARK;
  return BG;
}

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, { maskable = false, rounded = true } = {}) {
  const SS = 3; // supersampling for smooth edges
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const radius = rounded && !maskable ? size * 0.22 : 0;
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) {
          const fx = px + (sx + 0.5) / SS;
          const fy = py + (sy + 0.5) / SS;
          if (radius > 0) {
            const cx = Math.min(Math.max(fx, radius), size - radius);
            const cy = Math.min(Math.max(fy, radius), size - radius);
            if (Math.hypot(fx - cx, fy - cy) > radius) continue;
          }
          const col = colorAt(fx / size, fy / size, maskable);
          r += col[0]; g += col[1]; b += col[2]; a += 255;
        }
      const n = SS * SS;
      const o = py * (size * 4 + 1) + 1 + px * 4;
      raw[o] = Math.round(r / Math.max(1, a / 255));
      raw[o + 1] = Math.round(g / Math.max(1, a / 255));
      raw[o + 2] = Math.round(b / Math.max(1, a / 255));
      raw[o + 3] = Math.round(a / n);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const rgb = (c) => `rgb(${c.join(',')})`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="${rgb(BG)}"/>
  <g transform="translate(50 50) scale(0.86) translate(-50 -50)">
    <circle cx="50" cy="42" r="30" fill="${rgb(SUN)}"/>
    <path d="M30 72 V42 a20 20 0 0 1 40 0 V72 Z" fill="${rgb(BG)}"/>
    <path d="M32 72 V43 a18 18 0 0 1 36 0 V72" fill="none" stroke="${rgb(GLASS)}" stroke-width="2.4"/>
    <path d="M50 25 V72 M32 57 H68" stroke="${rgb(GLASS)}" stroke-width="2.4"/>
    <ellipse cx="36" cy="76" rx="17" ry="7" transform="rotate(-34 36 76)" fill="${rgb(LEAF)}"/>
    <ellipse cx="64" cy="76" rx="17" ry="7" transform="rotate(34 64 76)" fill="${rgb(LEAF_DARK)}"/>
    <rect x="48.5" y="70" width="3" height="20" fill="${rgb(LEAF_DARK)}"/>
  </g>
</svg>
`;

writeFileSync(join(outDir, 'icon.svg'), svg);
writeFileSync(join(outDir, 'icon-192.png'), png(192));
writeFileSync(join(outDir, 'icon-512.png'), png(512));
writeFileSync(join(outDir, 'icon-maskable-512.png'), png(512, { maskable: true }));
writeFileSync(join(outDir, 'apple-touch-icon.png'), png(180, { rounded: false }));
console.log('icons written to', outDir);
