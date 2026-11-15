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
