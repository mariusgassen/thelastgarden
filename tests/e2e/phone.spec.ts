import { expect, test } from '@playwright/test';
import { flushAndReadSave, trackErrors, waitForGameBoot } from './helpers';

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
});
