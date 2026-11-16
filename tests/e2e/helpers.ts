import { expect, type Page } from '@playwright/test';
import { inflateSync } from 'node:zlib';

export const SAVE_KEY = 'the-last-garden:save';

export interface SaveSnapshot {
  version: number;
  savedAt: number;
  player: { mapId: string; x: number; y: number; facing: string };
  world: {
    unblockedPaths: string[];
    visitedZones: string[];
    flags: Record<string, boolean | number | string>;
  };
  inventory: { items: Record<string, number> };
  quests: { active: string[]; completed: string[] };
  ext: Record<string, unknown>;
}

export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  return errors;
}

export async function waitFrames(page: Page, count = 3): Promise<void> {
  await page.evaluate(
    (n) =>
      new Promise<void>((resolve) => {
        let left = n;
        const step = () => {
          left--;
          if (left <= 0) resolve();
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
    count,
  );
}

export async function waitForGameBoot(page: Page): Promise<void> {
  await page.waitForSelector('#game canvas', { state: 'visible', timeout: 15_000 });
  await page.waitForFunction(() => {
    const loader = document.getElementById('app-loader');
    return loader?.classList.contains('is-hidden') ?? false;
  });
  await expect(page.locator('#app-error')).toBeHidden();
  await waitFrames(page, 8);
  await page.waitForTimeout(250);
}

export async function flushAndReadSave(page: Page): Promise<SaveSnapshot | null> {
  return page.evaluate((key) => {
    window.dispatchEvent(new Event('pagehide'));
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as SaveSnapshot) : null;
  }, SAVE_KEY);
}

export interface SeedSaveInput {
  player: { mapId: string; x: number; y: number; facing?: string };
  world?: {
    unblockedPaths?: string[];
    visitedZones?: string[];
    flags?: Record<string, boolean | number | string>;
  };
  inventory?: { items: Record<string, number> };
  quests?: { active?: string[]; completed?: string[]; progress?: Record<string, unknown> };
  ext?: Record<string, unknown>;
}

export async function seedSave(page: Page, input: SeedSaveInput): Promise<void> {
  const payload = {
    version: 1,
    savedAt: Date.now(),
    player: { facing: 'right', ...input.player },
    world: {
      unblockedPaths: input.world?.unblockedPaths ?? [],
      visitedZones: input.world?.visitedZones ?? [input.player.mapId],
      flags: input.world?.flags ?? {},
    },
    inventory: { items: input.inventory?.items ?? {} },
    quests: {
      active: input.quests?.active ?? [],
      completed: input.quests?.completed ?? [],
      progress: input.quests?.progress ?? {},
    },
    ext: input.ext ?? {},
  };
  await page.addInitScript(
    ({ key, data }) => {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, JSON.stringify(data));
    },
    { key: SAVE_KEY, data: payload },
  );
}

/**
 * Triggers an action once and polls `predicate` for up to `attemptWaitMs` before retrying,
 * preventing duplicate triggers while slow frames, fade transitions, or UI toggles settle.
 */
export async function triggerUntil(
  page: Page,
  predicate: () => Promise<boolean>,
  trigger: () => Promise<void>,
  { timeout = 15_000, attemptWaitMs = 3_500, pollIntervalMs = 80, label = 'condition' } = {},
): Promise<void> {
  if (await predicate()) return;
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    await trigger();
    const attemptDeadline = Math.min(deadline, Date.now() + attemptWaitMs);
    while (Date.now() < attemptDeadline) {
      if (await predicate()) return;
      await page.waitForTimeout(pollIntervalMs);
    }
  }
  expect(await predicate(), `Timed out waiting for ${label} after ${timeout}ms`).toBe(true);
}

/**
 * Triggers a map change / door / fast-travel without re-firing the trigger during fadeOut + restart,
 * then waits for fadeIn and initial scene frames to settle.
 */
export async function triggerAndWaitForMap(
  page: Page,
  targetMapId: string,
  trigger: () => Promise<void>,
  { timeout = 20_000, attemptWaitMs = 4_000, settleMs = 400 } = {},
): Promise<void> {
  await triggerUntil(
    page,
    async () => (await flushAndReadSave(page))?.player.mapId === targetMapId,
    trigger,
    { timeout, attemptWaitMs, pollIntervalMs: 90, label: `mapId === "${targetMapId}"` },
  );
  if (settleMs > 0) await page.waitForTimeout(settleMs);
  await waitFrames(page, 5);
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/** Decodes an 8-bit RGB or RGBA non-interlaced PNG buffer produced by Chromium screenshots in Node. */
function decodePngRgb(png: Buffer): { width: number; height: number; bpp: number; pixels: Uint8Array } {
  let offset = 8; // skip PNG signature
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatChunks: Buffer[] = [];

  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (type === 'IHDR') {
      width = png.readUInt32BE(dataStart);
      height = png.readUInt32BE(dataStart + 4);
      bitDepth = png[dataStart + 8];
      colorType = png[dataStart + 9];
      interlace = png[dataStart + 12];
    } else if (type === 'IDAT') {
      idatChunks.push(png.subarray(dataStart, dataEnd));
    } else if (type === 'IEND') {
      break;
    }
    offset = dataEnd + 4; // skip CRC
  }

  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6) || interlace !== 0) {
    throw new Error(`Unsupported PNG format: depth=${bitDepth} colorType=${colorType} interlace=${interlace}`);
  }

  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const raw = inflateSync(Buffer.concat(idatChunks));
  const pixels = new Uint8Array(height * stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const rawRow = y * (stride + 1) + 1;
    const outRow = y * stride;
    const prevRow = (y - 1) * stride;
    for (let x = 0; x < stride; x++) {
      const val = raw[rawRow + x];
      const left = x >= bpp ? pixels[outRow + x - bpp] : 0;
      const up = y > 0 ? pixels[prevRow + x] : 0;
      const upLeft = y > 0 && x >= bpp ? pixels[prevRow + x - bpp] : 0;
      let recon = val;
      if (filter === 1) recon = (val + left) & 0xff;
      else if (filter === 2) recon = (val + up) & 0xff;
      else if (filter === 3) recon = (val + ((left + up) >> 1)) & 0xff;
      else if (filter === 4) recon = (val + paethPredictor(left, up, upLeft)) & 0xff;
      pixels[outRow + x] = recon;
    }
  }

  return { width, height, bpp, pixels };
}

/**
 * Counts pixels matching an RGB color (within tolerance) inside a CSS-pixel viewport clip
 * using the rendered browser screenshot — works on production builds without debug globals.
 */
export async function countColorPixels(
  page: Page,
  clip: { x: number; y: number; width: number; height: number },
  rgb: readonly [number, number, number],
  tolerance = 14,
): Promise<number> {
  const res = await findColorCenter(page, clip, rgb, tolerance);
  return res?.count ?? 0;
}

/**
 * Finds the average CSS-pixel center and count of pixels matching `rgb` within `clip`.
 */
export async function findColorCenter(
  page: Page,
  clip: { x: number; y: number; width: number; height: number },
  rgb: readonly [number, number, number],
  tolerance = 14,
): Promise<{ x: number; y: number; count: number } | null> {
  const png = await page.screenshot({ clip });
  const { width, height, bpp, pixels } = decodePngRgb(png);
  const [tr, tg, tb] = rgb;
  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (let py = 0; py < height; py++) {
    const row = py * width * bpp;
    for (let px = 0; px < width; px++) {
      const i = row + px * bpp;
      if (
        Math.abs(pixels[i] - tr) <= tolerance &&
        Math.abs(pixels[i + 1] - tg) <= tolerance &&
        Math.abs(pixels[i + 2] - tb) <= tolerance
      ) {
        sumX += px;
        sumY += py;
        count++;
      }
    }
  }

  if (count === 0) return null;
  return {
    x: clip.x + (sumX / count / width) * clip.width,
    y: clip.y + (sumY / count / height) * clip.height,
    count,
  };
}
