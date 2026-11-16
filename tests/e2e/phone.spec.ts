import { expect, test } from '@playwright/test';
import { countColorPixels, flushAndReadSave, SAVE_KEY, trackErrors, waitForGameBoot } from './helpers';

const STRAW_HAT_RGB: readonly [number, number, number] = [232, 207, 122];
const HORSE_COAT_RGB: readonly [number, number, number] = [154, 106, 66];

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

  test('opens the bag by tapping the bag button and crafts via touch', async ({ page }) => {
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

    // Tap the bag button (top-left) -> Beutel opens; tap Werkeln button -> Werkbank opens; tap Herstellen
    await expect
      .poll(
        async () => {
          const have = (await flushAndReadSave(page))?.inventory.items['craft-bramble-cutting'] ?? 0;
          if (have > 0) return have;
          await page.touchscreen.tap(28, 40);
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

  test('leaving a building restores riding, fast travel to Drei Höfe shows character, and horse follows on phone', async ({
    page,
  }) => {
    const errors = trackErrors(page);

    await page.addInitScript((key) => {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          player: { mapId: 'garden', x: 7 * 32, y: 33 * 32, facing: 'right' },
          world: {
            unblockedPaths: [],
            visitedZones: ['garden', 'workshop-yard', 'tram-tracks', 'river-farms-yard'],
            flags: { 'crow-met': true, 'greenhouse-hint-read': true, 'horse-tamed': true },
          },
          inventory: { items: {} },
          quests: { active: [], completed: ['q-meet-crow'], progress: {} },
          ext: { horse: { riding: true } },
        }),
      );
    }, SAVE_KEY);

    await page.goto('/');
    await waitForGameBoot(page);
    await page.waitForTimeout(450);

    // Enter workshop: tap context button ("Betreten")
    await expect
      .poll(
        async () => {
          if ((await flushAndReadSave(page))?.player.mapId === 'workshop') return 'workshop';
          await page.touchscreen.tap(326, 768);
          await page.waitForTimeout(450);
          return (await flushAndReadSave(page))?.player.mapId;
        },
        { timeout: 15_000, intervals: [100] },
      )
      .toBe('workshop');

    // Indoors: on foot (no horse inside) while riding choice stays true
    expect(((await flushAndReadSave(page))?.ext.horse as { riding: boolean }).riding).toBe(true);
    await expect
      .poll(() => countColorPixels(page, { x: 100, y: 440, width: 190, height: 180 }, STRAW_HAT_RGB), {
        timeout: 6_000,
        intervals: [150],
      })
      .toBeGreaterThan(20);
    expect(await countColorPixels(page, { x: 100, y: 440, width: 190, height: 180 }, HORSE_COAT_RGB, 6)).toBeLessThan(60);

    // Tap context button ("Hinausgehen") to leave workshop -> back on horse outdoors
    await expect
      .poll(
        async () => {
          if ((await flushAndReadSave(page))?.player.mapId === 'garden') return 'garden';
          await page.touchscreen.tap(326, 768);
          await page.waitForTimeout(450);
          return (await flushAndReadSave(page))?.player.mapId;
        },
        { timeout: 15_000, intervals: [100] },
      )
      .toBe('garden');

    // Leaving workshop: back outdoors on Mohn again
    expect(((await flushAndReadSave(page))?.ext.horse as { riding: boolean }).riding).toBe(true);
    await expect
      .poll(() => countColorPixels(page, { x: 80, y: 300, width: 220, height: 220 }, HORSE_COAT_RGB), {
        timeout: 6_000,
        intervals: [150],
      })
      .toBeGreaterThan(25);

    // Open Town Map (above horseshoe button) and tap "Drei Höfe" (84% / 60% of sheet)
    await expect
      .poll(
        async () => {
          if ((await flushAndReadSave(page))?.player.mapId === 'river-farms') return 'river-farms';
          await page.touchscreen.tap(344, 626);
          await page.waitForTimeout(350);
          await page.touchscreen.tap(306, 441);
          await page.waitForTimeout(900);
          return (await flushAndReadSave(page))?.player.mapId;
        },
        { timeout: 20_000, intervals: [100] },
      )
      .toBe('river-farms');

    // The poll above can retry once more after the trip already happened (the save lags the scene restart), which
    // reopens the town map over the character. Close it so the pixel checks look at the courtyard.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Character and horse are clearly visible in the courtyard below the top HUD, area banner, and tutorial hints
    await expect
      .poll(() => countColorPixels(page, { x: 110, y: 260, width: 180, height: 150 }, STRAW_HAT_RGB), {
        timeout: 6_000,
        intervals: [150],
      })
      .toBeGreaterThan(10);
    await expect
      .poll(() => countColorPixels(page, { x: 110, y: 260, width: 180, height: 150 }, HORSE_COAT_RGB), {
        timeout: 6_000,
        intervals: [150],
      })
      .toBeGreaterThan(25);

    // Dismount via horseshoe button and walk south-west around the well: Mohn follows into the courtyard
    await expect
      .poll(
        async () => {
          const riding = ((await flushAndReadSave(page))?.ext.horse as { riding: boolean } | undefined)?.riding;
          if (riding === false) return false;
          await page.touchscreen.tap(344, 686);
          await page.waitForTimeout(300);
          return ((await flushAndReadSave(page))?.ext.horse as { riding: boolean } | undefined)?.riding;
        },
        { timeout: 10_000, intervals: [100] },
      )
      .toBe(false);

    const beforeWalkY = (await flushAndReadSave(page))!.player.y;
    await page.mouse.move(92, 690);
    await page.mouse.down();
    await page.mouse.move(55, 760, { steps: 8 });
    await expect
      .poll(async () => (await flushAndReadSave(page))?.player.y ?? beforeWalkY, {
        timeout: 15_000,
        intervals: [80],
      })
      .toBeGreaterThan(beforeWalkY + 110);
    await page.mouse.up();

    // Wait for Mohn to catch up into the lower courtyard
    await expect
      .poll(() => countColorPixels(page, { x: 100, y: 360, width: 200, height: 180 }, HORSE_COAT_RGB), {
        timeout: 6_000,
        intervals: [150],
      })
      .toBeGreaterThan(35);

    expect(errors).toEqual([]);
  });

  test('opens build bar on phone and places a free soil bed via touch', async ({ page }) => {
    const errors = trackErrors(page);

    await page.addInitScript((key) => {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          player: { mapId: 'garden', x: 22.5 * 32, y: 37.5 * 32, facing: 'right' },
          world: { unblockedPaths: [], visitedZones: ['garden'], flags: { 'gathered-material': true } },
          inventory: { items: {} },
          quests: { active: ['q-meet-crow'], completed: [], progress: {} },
          ext: {},
        }),
      );
    }, SAVE_KEY);

    await page.goto('/');
    await waitForGameBoot(page);

    // Open build bar (bottom-right hammer button at 345, 687)
    await page.touchscreen.tap(345, 687);
    await page.waitForTimeout(200);

    // Verify viewport doesn't overflow on phone with 4-row BuildBar open
    const fit = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    }));
    expect(fit.scrollWidth).toBeLessThanOrEqual(fit.innerWidth);
    expect(fit.scrollHeight).toBeLessThanOrEqual(fit.innerHeight);

    // Pick Beet (slot index 4 in BuildBar: 270, 652), then tap tile right of player (~232, 422)
    await expect
      .poll(
        async () => {
          const pieces = ((await flushAndReadSave(page))?.ext.building as { pieces?: { garden?: { id: string }[] } } | undefined)
            ?.pieces?.garden;
          if (pieces?.some((p) => p.id === 'planter')) return true;
          await page.touchscreen.tap(270, 652);
          await page.waitForTimeout(150);
          await page.touchscreen.tap(232, 422);
          await page.waitForTimeout(300);
          const next = ((await flushAndReadSave(page))?.ext.building as { pieces?: { garden?: { id: string }[] } } | undefined)
            ?.pieces?.garden;
          return next?.some((p) => p.id === 'planter') ?? false;
        },
        { timeout: 15_000, intervals: [150] },
      )
      .toBe(true);

    expect(errors).toEqual([]);
  });

  test('boards boat and lands back on shore via phone touch controls', async ({ page }) => {
    const errors = trackErrors(page);

    await page.addInitScript((key) => {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          player: { mapId: 'river-farms', x: 35.4 * 32, y: 16.0 * 32, facing: 'right' },
          world: { unblockedPaths: [], visitedZones: ['garden', 'river-farms-yard'], flags: { 'crow-met': true } },
          inventory: { items: {} },
          quests: { active: [], completed: ['q-meet-crow'], progress: {} },
          ext: {},
        }),
      );
    }, SAVE_KEY);

    await page.goto('/');
    await waitForGameBoot(page);

    const isBoat = async () => Boolean(((await flushAndReadSave(page))?.ext.boat as { boating?: boolean } | undefined)?.boating);

    // Tap context button ("Boot" at 326, 768) -> tap first choice ("Ins Boot steigen") -> verify boat active
    await expect
      .poll(
        async () => {
          if (await isBoat()) return true;
          await page.touchscreen.tap(326, 768);
          await page.waitForTimeout(300);
          await page.touchscreen.tap(195, 672);
          await page.waitForTimeout(300);
          return isBoat();
        },
        { timeout: 15_000, intervals: [150] },
      )
      .toBe(true);

    // Tap context button ("Anlegen" at 326, 768) to step back onto the pier
    await expect
      .poll(
        async () => {
          if (!(await isBoat())) return false;
          await page.touchscreen.tap(326, 768);
          await page.waitForTimeout(300);
          return isBoat();
        },
        { timeout: 15_000, intervals: [150] },
      )
      .toBe(false);

    expect(errors).toEqual([]);
  });

  test('hold-to-select tool without button jump, action button collects wood with sickle, and tap/slot deselects', async ({
    page,
  }) => {
    const errors = trackErrors(page);

    await page.addInitScript((key) => {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          player: { mapId: 'garden', x: 15.5 * 32, y: 38.5 * 32, facing: 'left' },
          world: { unblockedPaths: [], visitedZones: ['garden'], flags: { 'crow-met': true } },
          inventory: { items: { 'tool-sickle': 1, 'tool-shovel': 1 } },
          quests: { active: [], completed: ['q-meet-crow'], progress: {} },
          ext: {},
        }),
      );
    }, SAVE_KEY);

    await page.goto('/');
    await waitForGameBoot(page);

    const equipped = async () =>
      ((await flushAndReadSave(page))?.ext.tools as { equipped?: string } | undefined)?.equipped ?? null;

    // 1. Tap toolButton (345, 687) to open ToolBar, then tap the exact same coordinate to close it (no jump!)
    await page.touchscreen.tap(345, 687);
    await page.waitForTimeout(200);
    expect(await equipped()).toBeNull();
    await page.touchscreen.tap(345, 687);
    await page.waitForTimeout(200);

    // 2. Press and hold toolButton, drag to slot 1 (tool-sickle at x=45, y=797), and release -> equips sickle & closes bar
    await page.mouse.move(345, 687);
    await page.mouse.down();
    await page.waitForTimeout(240);
    await page.mouse.move(45, 797, { steps: 8 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    await expect.poll(equipped, { timeout: 6_000, intervals: [100] }).toBe('tool-sickle');

    // 3. Big ContextButton IS the sickle: tapping (326, 768) chops nearby wood-garden-2
    await expect
      .poll(
        async () => {
          const wood = (await flushAndReadSave(page))?.inventory.items['mat-wood'] ?? 0;
          if (wood >= 2) return wood;
          await page.touchscreen.tap(326, 768);
          await page.waitForTimeout(300);
          return (await flushAndReadSave(page))?.inventory.items['mat-wood'] ?? 0;
        },
        { timeout: 10_000, intervals: [150] },
      )
      .toBe(2);

    // 4. Quick-tapping toolButton (now above buildButton at 345, 629) deselects the equipped tool
    await page.touchscreen.tap(345, 629);
    await expect.poll(equipped, { timeout: 6_000, intervals: [100] }).toBeNull();

    // 5. Hold toolButton -> drag to shovel (105, 797) -> equips shovel; hold -> drag to cross slot (345, 797) -> deselects
    await page.mouse.move(345, 629);
    await page.mouse.down();
    await page.waitForTimeout(240);
    await page.mouse.move(105, 797, { steps: 8 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    await expect.poll(equipped, { timeout: 6_000, intervals: [100] }).toBe('tool-shovel');

    await page.mouse.move(345, 629);
    await page.mouse.down();
    await page.waitForTimeout(240);
    await page.mouse.move(345, 797, { steps: 8 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    await expect.poll(equipped, { timeout: 6_000, intervals: [100] }).toBeNull();

    expect(errors).toEqual([]);
  });

  test('renders stacked and adjacent light plants without white blowout on phone', async ({ page }) => {
    const errors = trackErrors(page);
    const matureAt = Date.now() - 600_000;
    const beds: Record<string, { bedId: string; plantId: string; plantedAt: number; harvestedAt: number }> = {};
    for (let i = 0; i < 8; i++) {
      const id = i === 0 ? 'bed-lily' : `bed-lily#${i}`;
      beds[id] = { bedId: id, plantId: 'glow-lily', plantedAt: matureAt, harvestedAt: Date.now() };
    }
    for (const px of [30, 31]) {
      for (let i = 0; i < 4; i++) {
        const id = i === 0 ? `planter:garden:${px}:32` : `planter:garden:${px}:32#${i}`;
        beds[id] = { bedId: id, plantId: 'moon-fern', plantedAt: matureAt, harvestedAt: Date.now() };
      }
    }

    await page.addInitScript(
      ({ key, seededBeds }) => {
        if (localStorage.getItem(key)) return;
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            savedAt: Date.now(),
            player: { mapId: 'garden', x: 32 * 32, y: 33 * 32, facing: 'down' },
            world: { unblockedPaths: [], visitedZones: ['garden'], flags: { 'crow-met': true, 'gathered-material': true } },
            inventory: { items: {} },
            quests: { active: [], completed: ['q-meet-crow'], progress: {} },
            ext: {
              plants: { beds: seededBeds },
              building: {
                pieces: {
                  garden: [
                    { id: 'planter', x: 30, y: 32 },
                    { id: 'planter', x: 31, y: 32 },
                  ],
                },
              },
            },
          }),
        );
      },
      { key: SAVE_KEY, seededBeds: beds },
    );

    await page.goto('/');
    await waitForGameBoot(page);
    await page.waitForTimeout(400);

    const whitePixels = await countColorPixels(page, { x: 95, y: 310, width: 200, height: 180 }, [255, 255, 255], 6);
    expect(whitePixels).toBeLessThan(200);
    expect(errors).toEqual([]);
  });
});

