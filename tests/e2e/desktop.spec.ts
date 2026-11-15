import { expect, test } from '@playwright/test';
import { flushAndReadSave, SAVE_KEY, type SaveSnapshot, trackErrors, waitForGameBoot } from './helpers';

test.describe('Desktop gameplay and PWA', () => {
  test('moves with keyboard and toggles quest log', async ({ page }) => {
    const errors = trackErrors(page);

    await page.goto('/');
    await waitForGameBoot(page);

    const startSave = await flushAndReadSave(page);
    expect(startSave).not.toBeNull();
    const startX = startSave!.player.x;

    // Walk north along the path until entering the greenhouse zone
    await page.keyboard.down('KeyW');
    await expect
      .poll(async () => (await flushAndReadSave(page))?.world.visitedZones.includes('greenhouse') ?? false, {
        timeout: 25_000,
        intervals: [100],
      })
      .toBe(true);
    await page.keyboard.up('KeyW');

    await page.keyboard.down('KeyD');
    await expect
      .poll(async () => (await flushAndReadSave(page))?.player.x ?? startX, {
        timeout: 15_000,
        intervals: [100],
      })
      .toBeGreaterThan(startX + 20);
    await page.keyboard.up('KeyD');

    // Toggle quest log with Q and close with Escape
    await page.keyboard.press('KeyQ');
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    expect(errors).toEqual([]);
  });

  test('transitions from garden to workshop map via door interaction', async ({ page }) => {
    const errors = trackErrors(page);

    await page.addInitScript((key) => {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          player: { mapId: 'garden', x: 7 * 32, y: 33 * 32, facing: 'right' },
          world: { unblockedPaths: [], visitedZones: ['garden'], flags: {} },
          inventory: { items: {} },
          quests: { active: ['q-meet-crow'], completed: [], progress: {} },
          ext: {},
        }),
      );
    }, SAVE_KEY);

    await page.goto('/');
    await waitForGameBoot(page);

    await expect
      .poll(
        async () => {
          const current = await flushAndReadSave(page);
          if (current?.player.mapId === 'workshop') return 'workshop';
          await page.keyboard.press('KeyE');
          await page.waitForTimeout(450);
          return (await flushAndReadSave(page))?.player.mapId;
        },
        { timeout: 15_000, intervals: [100] },
      )
      .toBe('workshop');

    const workshopSave = await flushAndReadSave(page);
    expect(workshopSave!.player.mapId).toBe('workshop');
    expect(workshopSave!.world.visitedZones).toContain('workshop');
    expect(errors).toEqual([]);
  });

  test('completes greenhouse vestibule unlock and Episode 1 ending from seeded save', async ({ page }) => {
    const errors = trackErrors(page);

    await page.addInitScript((key) => {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          player: { mapId: 'garden', x: 25 * 32, y: 21 * 32, facing: 'right' },
          world: {
            unblockedPaths: [],
            visitedZones: ['garden', 'greenhouse'],
            flags: {
              'crow-met': true,
              'bed-restored:bed-bramble': true,
              'bed-restored:bed-lily': true,
              'bed-restored:bed-lavender': true,
              'journal-read:page-bramble': true,
              'journal-read:page-lily': true,
              'journal-read:page-lavender': true,
              'quest-completed:q-meet-crow': true,
              'quest-completed:q-restore-beds': true,
              'quest-completed:q-journal-pages': true,
              'crow-gave-key': true,
            },
          },
          inventory: { items: { 'greenhouse-key': 1 } },
          quests: { active: ['q-greenhouse'], completed: ['q-meet-crow', 'q-restore-beds', 'q-journal-pages'], progress: {} },
          ext: {},
        }),
      );
    }, SAVE_KEY);

    await page.goto('/');
    await waitForGameBoot(page);

    // Interact with locked greenhouse door & advance unlock dialogue until vestibule loads
    await expect
      .poll(
        async () => {
          const current = await flushAndReadSave(page);
          if (current?.world.visitedZones.includes('greenhouse-vestibule')) return true;
          await page.keyboard.press('KeyE');
          await page.waitForTimeout(450);
          return (await flushAndReadSave(page))?.world.visitedZones.includes('greenhouse-vestibule') ?? false;
        },
        { timeout: 15_000, intervals: [100] },
      )
      .toBe(true);

    await page.evaluate(
      () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
    );

    // Walk up into open upper floor (y < 3.6 tiles) then left to map-board (4, 2.9)
    await page.keyboard.down('KeyW');
    await expect
      .poll(async () => (await flushAndReadSave(page))?.player.y ?? 999, { timeout: 25_000, intervals: [50] })
      .toBeLessThan(3.6 * 32);
    await page.keyboard.up('KeyW');

    await page.keyboard.down('KeyA');
    await expect
      .poll(async () => (await flushAndReadSave(page))?.player.x ?? 999, { timeout: 20_000, intervals: [50] })
      .toBeLessThan(5.2 * 32);
    await page.keyboard.up('KeyA');

    // Interact with map-board -> sets greenhouse-hint-read and completes Episode 1
    await expect
      .poll(
        async () => {
          const current = await flushAndReadSave(page);
          if (current?.world.flags['episode-1-complete'] === true) return true;
          await page.keyboard.press('KeyE');
          await page.waitForTimeout(300);
          return (await flushAndReadSave(page))?.world.flags['episode-1-complete'] === true;
        },
        { timeout: 15_000, intervals: [100] },
      )
      .toBe(true);

    const finalSave = (await flushAndReadSave(page)) as SaveSnapshot;
    expect(finalSave.world.flags['greenhouse-unlocked']).toBe(true);
    expect(finalSave.world.flags['greenhouse-hint-read']).toBe(true);
    expect(finalSave.world.flags['episode-1-complete']).toBe(true);
    expect(finalSave.inventory.items['greenhouse-key']).toBeUndefined();
    expect(errors).toEqual([]);
  });

  test('PWA manifest and service worker work offline after initial load', async ({ page, context }) => {
    const errors = trackErrors(page);

    const manifestRes = await page.request.get('/manifest.json');
    expect(manifestRes.ok()).toBe(true);
    const manifest = (await manifestRes.json()) as { name: string; display: string; icons: unknown[] };
    expect(manifest.name).toBe('The Last Garden');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.length).toBeGreaterThan(0);

    await page.goto('/');
    await waitForGameBoot(page);

    const swReady = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.ready;
      return Boolean(reg.active);
    });
    expect(swReady).toBe(true);

    // Reload once so the active Service Worker controls the page, then test offline reload
    await page.reload();
    await waitForGameBoot(page);

    await context.setOffline(true);
    try {
      await page.reload();
      await waitForGameBoot(page);
      await expect(page.locator('#game canvas')).toBeVisible();
    } finally {
      await context.setOffline(false);
    }

    expect(errors).toEqual([]);
  });
});
