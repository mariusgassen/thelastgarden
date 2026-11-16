import { expect, type Page } from '@playwright/test';

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

export async function waitForGameBoot(page: Page): Promise<void> {
  await page.waitForSelector('#game canvas', { state: 'visible', timeout: 15_000 });
  await page.waitForFunction(() => {
    const loader = document.getElementById('app-loader');
    return loader?.classList.contains('is-hidden') ?? false;
  });
  await expect(page.locator('#app-error')).toBeHidden();
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );
}

export async function flushAndReadSave(page: Page): Promise<SaveSnapshot | null> {
  return page.evaluate((key) => {
    window.dispatchEvent(new Event('pagehide'));
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as SaveSnapshot) : null;
  }, SAVE_KEY);
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
  const png = await page.screenshot({ clip });
  const b64 = png.toString('base64');
  return page.evaluate(
    async ({ encoded, target, tol }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${encoded}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return 0;
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const [tr, tg, tb] = target;
      let matches = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (
          Math.abs(data[i] - tr) <= tol &&
          Math.abs(data[i + 1] - tg) <= tol &&
          Math.abs(data[i + 2] - tb) <= tol
        ) {
          matches++;
        }
      }
      return matches;
    },
    { encoded: b64, target: rgb, tol: tolerance },
  );
}

