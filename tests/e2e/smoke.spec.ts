import { expect, test } from '@playwright/test';
import { flushAndReadSave, trackErrors, waitForGameBoot } from './helpers';

test.describe('Cross-viewport boot and layout', () => {
  test('boots cleanly without errors, fits viewport, and hides debug global in production', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    await waitForGameBoot(page);

    const layout = await page.evaluate(() => {
      const canvas = document.querySelector('#game canvas') as HTMLCanvasElement | null;
      const rect = canvas?.getBoundingClientRect();
      return {
        hasDebugGlobal: '__tlg' in window,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        canvasWidth: rect?.width ?? 0,
        canvasHeight: rect?.height ?? 0,
      };
    });

    expect(layout.hasDebugGlobal).toBe(false);
    expect(layout.canvasWidth).toBeGreaterThanOrEqual(layout.innerWidth - 2);
    expect(layout.canvasHeight).toBeGreaterThanOrEqual(layout.innerHeight - 2);
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth);
    expect(layout.scrollHeight).toBeLessThanOrEqual(layout.innerHeight);

    const save = await flushAndReadSave(page);
    expect(save).not.toBeNull();
    expect(save!.player.mapId).toBe('garden');
    expect(save!.world.visitedZones).toContain('garden');
    expect(save!.quests.active).toContain('q-meet-crow');
    expect(errors).toEqual([]);
  });

  test('supports reduced-motion preference without errors', async ({ page }) => {
    const errors = trackErrors(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await waitForGameBoot(page);
    expect(errors).toEqual([]);
  });
});
