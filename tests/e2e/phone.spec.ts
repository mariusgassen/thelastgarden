import { expect, test } from '@playwright/test';
import { flushAndReadSave, SAVE_KEY, trackErrors, waitForGameBoot } from './helpers';

test.describe('Phone touch controls', () => {
  test('touch joystick moves player and quest log button responds to tap', async ({ page }) => {
    const errors = trackErrors(page);

    await page.goto('/');
    await waitForGameBoot(page);

    const before = await flushAndReadSave(page);
    expect(before).not.toBeNull();

    // Drag virtual joystick up-right from bottom-left and hold until player moves noticeably
    await page.mouse.move(92, 700);
    await page.mouse.down();
    await page.mouse.move(145, 650, { steps: 10 });

    await expect
      .poll(
        async () => {
          const s = await flushAndReadSave(page);
          return s ? Math.hypot(s.player.x - before!.player.x, s.player.y - before!.player.y) : 0;
        },
        { timeout: 20_000, intervals: [50] },
      )
      .toBeGreaterThan(25);
    await page.mouse.up();

    const after = await flushAndReadSave(page);
    expect(after!.player.x).toBeGreaterThan(before!.player.x + 15);
    expect(after!.player.y).toBeLessThan(before!.player.y - 15);

    // Tap top-right Quest Log button, then tap outside panel to close
    await page.touchscreen.tap(340, 40);
    await page.waitForTimeout(200);
    await page.touchscreen.tap(195, 25);
    await page.waitForTimeout(150);

    expect(errors).toEqual([]);
  });

  test('map button opens the town map and a tapped stop travels there', async ({ page }) => {
    const errors = trackErrors(page);

    await page.addInitScript((key) => {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          player: { mapId: 'garden', x: 25.5 * 32, y: 31 * 32, facing: 'right' },
          world: { unblockedPaths: [], visitedZones: ['garden', 'tram-tracks'], flags: { 'crow-met': true, 'greenhouse-hint-read': true } },
          inventory: { items: {} },
          quests: { active: [], completed: ['q-meet-crow'], progress: {} },
          ext: {},
        }),
      );
    }, SAVE_KEY);

    await page.goto('/');
    await waitForGameBoot(page);

    // Map button: bottom right, above the context button. "Linie 3" sits at 35 % / 80 % of the sheet.
    await expect
      .poll(
        async () => {
          if ((await flushAndReadSave(page))?.player.mapId === 'tramline') return 'tramline';
          await page.touchscreen.tap(345, 687);
          await page.waitForTimeout(350);
          await page.touchscreen.tap(146, 488);
          await page.waitForTimeout(900);
          return (await flushAndReadSave(page))?.player.mapId;
        },
        { timeout: 20_000, intervals: [100] },
      )
      .toBe('tramline');

    expect(errors).toEqual([]);
  });

  test('opens the bag by tapping the resource bar and crafts via touch', async ({ page }) => {
    const errors = trackErrors(page);

    await page.addInitScript((key) => {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          player: { mapId: 'garden', x: 25.5 * 32, y: 31 * 32, facing: 'right' },
          world: {
            unblockedPaths: [],
            visitedZones: ['garden'],
            flags: { 'crow-met': true, 'journal-read:page-bramble': true },
          },
          inventory: { items: { 'pocket-workbench': 1, 'produce-tendril': 2, 'resource-dew': 1 } },
          quests: { active: ['q-restore-beds'], completed: ['q-meet-crow'], progress: {} },
          ext: {},
        }),
      );
    }, SAVE_KEY);

    await page.goto('/');
    await waitForGameBoot(page);

    // Tap ResourceBar (top-left) -> Beutel opens; tap Werkeln button -> Werkbank opens; tap Herstellen
    await expect
      .poll(
        async () => {
          const have = (await flushAndReadSave(page))?.inventory.items['craft-bramble-cutting'] ?? 0;
          if (have > 0) return have;
          await page.touchscreen.tap(80, 40);
          await page.waitForTimeout(250);
          await page.touchscreen.tap(268, 255);
          await page.waitForTimeout(250);
          await page.touchscreen.tap(303, 512);
          await page.waitForTimeout(250);
          return (await flushAndReadSave(page))?.inventory.items['craft-bramble-cutting'] ?? 0;
        },
        { timeout: 15_000, intervals: [150] },
      )
      .toBe(1);

    expect(errors).toEqual([]);
  });
});
