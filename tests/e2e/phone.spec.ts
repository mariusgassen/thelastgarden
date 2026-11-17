import { expect, test } from '@playwright/test';
import {
  countColorPixels,
  findColorCenter,
  flushAndReadSave,
  SAVE_KEY,
  seedSave,
  trackErrors,
  triggerAndWaitForMap,
  triggerUntil,
  waitForGameBoot,
  waitFrames,
} from './helpers';

const STRAW_HAT_RGB: readonly [number, number, number] = [232, 207, 122];
const HORSE_COAT_RGB: readonly [number, number, number] = [154, 106, 66];
const EAT_PILL_RGB: readonly [number, number, number] = [223, 156, 58];
const PANEL_BG_RGB: readonly [number, number, number] = [43, 58, 38];

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
    await page.waitForTimeout(250);
    await page.touchscreen.tap(195, 25);
    await page.waitForTimeout(200);

    expect(errors).toEqual([]);
  });

  test('map button opens the town map and a tapped stop travels there', async ({ page }) => {
    const errors = trackErrors(page);

    await seedSave(page, {
      player: { mapId: 'garden', x: 25.5 * 32, y: 31 * 32, facing: 'right' },
      world: { visitedZones: ['garden', 'tram-tracks'], flags: { 'crow-met': true, 'greenhouse-hint-read': true } },
      quests: { completed: ['q-meet-crow'] },
    });

    await page.goto('/');
    await waitForGameBoot(page);

    // Map button: top-left bar (menu, bag, map). "Linie 3" sits at 35 % / 80 % of the sheet.
    await triggerAndWaitForMap(page, 'tramline', async () => {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
      await page.touchscreen.tap(140, 40);
      await page.waitForTimeout(350);
      await page.touchscreen.tap(146, 488);
    });

    expect(errors).toEqual([]);
  });

  test('opens the bag by tapping the bag button and crafts via touch', async ({ page }) => {
    const errors = trackErrors(page);

    await seedSave(page, {
      player: { mapId: 'garden', x: 25.5 * 32, y: 31 * 32, facing: 'right' },
      world: {
        visitedZones: ['garden'],
        flags: { 'crow-met': true, 'journal-read:page-bramble': true },
      },
      inventory: { items: { 'pocket-workbench': 1, 'produce-tendril': 2, 'resource-dew': 1 } },
      quests: { active: ['q-restore-beds'], completed: ['q-meet-crow'] },
    });

    await page.goto('/');
    await waitForGameBoot(page);

    // Tap the bag button (top-left, right of menu) -> Beutel opens; tap Werkeln button -> Werkbank opens; tap Herstellen
    await triggerUntil(
      page,
      async () => ((await flushAndReadSave(page))?.inventory.items['craft-bramble-cutting'] ?? 0) === 1,
      async () => {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
        await page.touchscreen.tap(84, 40);
        await page.waitForTimeout(250);
        await page.touchscreen.tap(268, 255);
        await page.waitForTimeout(300);
        await page.touchscreen.tap(303, 512);
      },
      { timeout: 15_000, attemptWaitMs: 3_000, label: 'crafted bramble cutting via touch' },
    );

    expect(errors).toEqual([]);
  });

  test('leaving a building restores riding, fast travel to Drei Höfe shows character, and horse follows on phone', async ({
    page,
  }) => {
    const errors = trackErrors(page);

    await seedSave(page, {
      player: { mapId: 'garden', x: 7 * 32, y: 33 * 32, facing: 'right' },
      world: {
        visitedZones: ['garden', 'workshop-yard', 'tram-tracks', 'river-farms-yard'],
        flags: { 'crow-met': true, 'greenhouse-hint-read': true, 'horse-tamed': true },
      },
      quests: { completed: ['q-meet-crow'] },
      ext: { horse: { riding: true } },
    });

    await page.goto('/');
    await waitForGameBoot(page);
    await page.waitForTimeout(300);

    // Enter workshop: tap context button ("Betreten") once and wait for scene transition
    await triggerAndWaitForMap(page, 'workshop', () => page.touchscreen.tap(326, 768));

    // Indoors: on foot (no horse inside) while riding choice stays true
    expect(((await flushAndReadSave(page))?.ext.horse as { riding: boolean }).riding).toBe(true);
    await expect
      .poll(() => countColorPixels(page, { x: 100, y: 440, width: 190, height: 180 }, STRAW_HAT_RGB), {
        timeout: 12_000,
        intervals: [150],
      })
      .toBeGreaterThan(20);
    expect(await countColorPixels(page, { x: 100, y: 440, width: 190, height: 180 }, HORSE_COAT_RGB, 6)).toBeLessThan(60);

    // Tap context button ("Hinausgehen") to leave workshop -> back on horse outdoors
    await triggerAndWaitForMap(page, 'garden', () => page.touchscreen.tap(326, 768));

    // Leaving workshop: back outdoors on Mohn again
    expect(((await flushAndReadSave(page))?.ext.horse as { riding: boolean }).riding).toBe(true);
    await expect
      .poll(() => countColorPixels(page, { x: 80, y: 300, width: 220, height: 220 }, HORSE_COAT_RGB), {
        timeout: 12_000,
        intervals: [150],
      })
      .toBeGreaterThan(25);

    // Open Town Map (top-left bar) and tap "Drei Höfe" (84% / 60% of sheet)
    await triggerAndWaitForMap(page, 'river-farms', async () => {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
      await page.touchscreen.tap(140, 40);
      await page.waitForTimeout(350);
      await page.touchscreen.tap(306, 441);
    });

    // Character and horse are clearly visible in the courtyard below the top HUD, area banner, and tutorial hints
    await expect
      .poll(() => countColorPixels(page, { x: 110, y: 260, width: 180, height: 150 }, STRAW_HAT_RGB), {
        timeout: 12_000,
        intervals: [150],
      })
      .toBeGreaterThan(10);
    await expect
      .poll(() => countColorPixels(page, { x: 110, y: 260, width: 180, height: 150 }, HORSE_COAT_RGB), {
        timeout: 12_000,
        intervals: [150],
      })
      .toBeGreaterThan(25);

    // Dismount via horseshoe button and walk south-west around the well: Mohn follows into the courtyard
    await triggerUntil(
      page,
      async () => ((await flushAndReadSave(page))?.ext.horse as { riding: boolean } | undefined)?.riding === false,
      () => page.touchscreen.tap(344, 686),
      { timeout: 10_000, attemptWaitMs: 2_500, label: 'dismount via horseshoe button' },
    );

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
        timeout: 12_000,
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

    // Open build bar (bottom-right hammer button at 345, 687), tap the exact same spot to verify no jump, then re-open
    await page.touchscreen.tap(345, 687);
    await page.waitForTimeout(200);
    await page.touchscreen.tap(345, 687);
    await page.waitForTimeout(200);
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

    // Pick Beet (slot index 4 in left-tucked BuildBar: 205, 680), then tap tile right of player (~232, 422)
    await expect
      .poll(
        async () => {
          const pieces = ((await flushAndReadSave(page))?.ext.building as { pieces?: { garden?: { id: string }[] } } | undefined)
            ?.pieces?.garden;
          if (pieces?.some((p) => p.id === 'planter')) return true;
          await page.touchscreen.tap(205, 680);
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

  test('hold-to-select vertical tool bar without button jump, action button collects wood with sickle, switches seeds, and deselects', async ({
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
          inventory: { items: { 'tool-sickle': 1, 'tool-shovel': 1, 'tool-satchel': 1, 'seed-glow-lily': 2, 'seed-lavender': 2 } },
          quests: { active: [], completed: ['q-meet-crow'], progress: {} },
          ext: {},
        }),
      );
    }, SAVE_KEY);

    await page.goto('/');
    await waitForGameBoot(page);

    const toolState = async () =>
      ((await flushAndReadSave(page))?.ext.tools as { equipped?: string; seed?: string } | undefined) ?? {};
    const equipped = async () => (await toolState()).equipped ?? null;
    const sowSeed = async () => (await toolState()).seed ?? null;

    // 1. Tap toolButton (345, 687) to open vertical ToolBar, then tap the exact same coordinate to close it (no jump!)
    await page.touchscreen.tap(345, 687);
    await page.waitForTimeout(220);
    expect(await equipped()).toBeNull();
    await page.touchscreen.tap(345, 687);
    await page.waitForTimeout(220);

    // 2. Press and hold toolButton, drag to slot 1 (tool-sickle at x=278, y=408), and release -> equips sickle & closes bar
    await page.mouse.move(345, 687);
    await page.mouse.down();
    await page.waitForTimeout(240);
    await page.mouse.move(278, 408, { steps: 8 });
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

    // 4. Quick-tapping toolButton (stays lowest at 345, 687) deselects tool, and tapping once again re-equips the last tool
    await page.touchscreen.tap(345, 687);
    await expect.poll(equipped, { timeout: 6_000, intervals: [100] }).toBeNull();
    await page.touchscreen.tap(345, 687);
    await expect.poll(equipped, { timeout: 6_000, intervals: [100] }).toBe('tool-sickle');

    // 5. Select specific seeds directly from the seed strip beside Saatbeutel (y=516): lavender (212, 516) then glow-lily (167, 516)
    await page.mouse.move(345, 687);
    await page.mouse.down();
    await page.waitForTimeout(240);
    await page.mouse.move(212, 516, { steps: 8 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    await expect.poll(equipped, { timeout: 6_000, intervals: [100] }).toBe('tool-satchel');
    await expect.poll(sowSeed, { timeout: 6_000, intervals: [100] }).toBe('lavender');

    await page.mouse.move(345, 687);
    await page.mouse.down();
    await page.waitForTimeout(240);
    await page.mouse.move(167, 516, { steps: 8 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    await expect.poll(sowSeed, { timeout: 6_000, intervals: [100] }).toBe('glow-lily');

    // 6. Hold toolButton -> drag to shovel (278, 462) -> equips shovel; hold -> drag to Ablegen slot (278, 678) -> deselects
    await page.mouse.move(345, 687);
    await page.mouse.down();
    await page.waitForTimeout(240);
    await page.mouse.move(278, 462, { steps: 8 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    await expect.poll(equipped, { timeout: 6_000, intervals: [100] }).toBe('tool-shovel');

    await page.mouse.move(345, 687);
    await page.mouse.down();
    await page.waitForTimeout(240);
    await page.mouse.move(278, 678, { steps: 8 });
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

  test('opens build mode via hammer button, places a fence by touch, and dismantles it for refund', async ({ page }) => {
    const errors = trackErrors(page);

    await seedSave(page, {
      // Open grass south of plaza NPCs/paths, free to build on tile (25, 39)
      player: { mapId: 'garden', x: 24.5 * 32, y: 39.5 * 32, facing: 'right' },
      world: { visitedZones: ['garden'], flags: { 'crow-met': true, 'gathered-material': true } },
      inventory: { items: { 'mat-wood': 3 } },
      quests: { completed: ['q-meet-crow'] },
    });

    await page.goto('/');
    await waitForGameBoot(page);

    const piecesCount = async () =>
      (((await flushAndReadSave(page))?.ext.building as { pieces?: { garden?: unknown[] } } | undefined)?.pieces?.garden ?? []).length;

    // Hammer button sits at the bottom of the right HUD column (345, 687) since only buildButton is visible
    await page.touchscreen.tap(345, 687);
    await page.waitForTimeout(250);
    // Pick Zaun (slot 1 = 2nd slot in left-tucked BuildBar row 0 -> (78, 680))
    await page.touchscreen.tap(78, 680);
    await page.waitForTimeout(150);

    // Tap tile (25, 39) east of the player ((227, 434) in CSS px) to build fence
    await triggerUntil(
      page,
      async () => (await piecesCount()) === 1,
      () => page.touchscreen.tap(227, 434),
      { timeout: 10_000, attemptWaitMs: 2_500, label: 'place fence via touch' },
    );

    const builtSave = (await flushAndReadSave(page))!;
    expect(builtSave.inventory.items['mat-wood']).toBe(2);
    expect(builtSave.world.flags['built:fence']).toBe(true);

    // Tap the built fence again to dismantle it and refund mat-wood
    await triggerUntil(
      page,
      async () => (await piecesCount()) === 0,
      () => page.touchscreen.tap(227, 434),
      { timeout: 10_000, attemptWaitMs: 2_500, label: 'dismantle fence via touch' },
    );

    const refundedSave = (await flushAndReadSave(page))!;
    expect(refundedSave.inventory.items['mat-wood']).toBe(3);
    expect(errors).toEqual([]);
  });

  test('opens tool bar via touch and harvests mature bed with sickle action button', async ({ page }) => {
    const errors = trackErrors(page);

    await seedSave(page, {
      player: { mapId: 'garden', x: 16.5 * 32, y: 30 * 32, facing: 'right' },
      world: { visitedZones: ['garden'], flags: { 'crow-met': true, 'bed-restored:bed-bramble': true } },
      inventory: { items: { 'tool-sickle': 1 } },
      quests: { active: ['q-restore-beds'], completed: ['q-meet-crow'] },
      ext: {
        plants: {
          beds: { 'bed-bramble': { bedId: 'bed-bramble', plantId: 'bramble-vine', plantedAt: Date.now() - 600_000 } },
        },
      },
    });

    await page.goto('/');
    await waitForGameBoot(page);

    const equipped = async () =>
      ((await flushAndReadSave(page))?.ext.tools as { equipped?: string } | undefined)?.equipped ?? null;

    // Only toolButton is visible in the HUD column -> (345, 687); tap sickle slot (278, 408) in vertical ToolBar
    await triggerUntil(
      page,
      async () => (await equipped()) === 'tool-sickle',
      async () => {
        await page.touchscreen.tap(345, 687);
        await page.waitForTimeout(300);
        await page.touchscreen.tap(278, 408);
      },
      { timeout: 10_000, attemptWaitMs: 1_500, label: 'equip sickle via touch ToolBar' },
    );

    // Big action button stays at (326, 768)
    await triggerUntil(
      page,
      async () => ((await flushAndReadSave(page))?.inventory.items['produce-tendril'] ?? 0) === 1,
      () => page.touchscreen.tap(326, 768),
      { timeout: 10_000, attemptWaitMs: 2_500, label: 'harvest with sickle on phone' },
    );

    expect((await flushAndReadSave(page))!.world.flags['used-tool:sickle']).toBe(true);
    expect(errors).toEqual([]);
  });

  test('opens Menü -> Almanach and eats a meal from Bag via touch', async ({ page }) => {
    const errors = trackErrors(page);

    await seedSave(page, {
      player: { mapId: 'garden', x: 25.5 * 32, y: 36 * 32, facing: 'right' },
      world: { visitedZones: ['garden'], flags: { 'crow-met': true, 'bed-restored:bed-bramble': true } },
      inventory: { items: { 'meal-berry-mash': 1 } },
      quests: { completed: ['q-meet-crow'] },
    });

    await page.goto('/');
    await waitForGameBoot(page);

    // Tap Menü button at top-left (28, 40) -> tap "Almanach (H)" item at (195, 441)
    await page.touchscreen.tap(28, 40);
    await page.waitForTimeout(250);
    await page.touchscreen.tap(195, 441);
    await waitFrames(page, 4);

    // WikiPanel renders with dark green panel background near center
    await expect
      .poll(() => countColorPixels(page, { x: 100, y: 200, width: 190, height: 200 }, PANEL_BG_RGB, 18), {
        timeout: 12_000,
        intervals: [100],
      })
      .toBeGreaterThan(200);

    // Close WikiPanel by tapping outside the panel top area (195, 10)
    await page.touchscreen.tap(195, 10);
    await page.waitForTimeout(250);

    // Tap Bag button (84, 40), locate golden "Essen" pill, and tap it to eat meal-berry-mash
    await triggerUntil(
      page,
      async () => (await flushAndReadSave(page))?.world.flags['ate-meal'] === true,
      async () => {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
        await page.touchscreen.tap(84, 40);
        await page.waitForTimeout(300);
        const pill = await findColorCenter(page, { x: 210, y: 120, width: 145, height: 320 }, EAT_PILL_RGB, 20);
        if (pill && pill.count > 40) {
          await page.touchscreen.tap(Math.round(pill.x), Math.round(pill.y));
        }
      },
      { timeout: 12_000, attemptWaitMs: 3_000, label: 'eat meal via touch' },
    );

    const afterEat = (await flushAndReadSave(page))!;
    expect(afterEat.inventory.items['meal-berry-mash']).toBeUndefined();
    expect((afterEat.ext.meal as { effect: string } | undefined)?.effect).toBe('swift');
    expect(errors).toEqual([]);
  });

  test('opens Almanach from Menü and browses a ??? hint entry via touch on phone', async ({ page }) => {
    const errors = trackErrors(page);

    await page.goto('/');
    await waitForGameBoot(page);

    const before = (await flushAndReadSave(page))!;

    // Tap top-left Menü button (28, 40) -> tap "Almanach  (H)" at (195, 441)
    await page.touchscreen.tap(28, 40);
    await page.waitForTimeout(250);
    await page.touchscreen.tap(195, 441);
    await page.waitForTimeout(300);

    // Check viewport stays within bounds while WikiPanel is open
    const fit = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    }));
    expect(fit.scrollWidth).toBeLessThanOrEqual(fit.innerWidth);
    expect(fit.scrollHeight).toBeLessThanOrEqual(fit.innerHeight);

    // Tap an unknown "??? · Hinweis" row in the list (topics:building / blight area ~y=290), then "‹ Zurück", then close "×"
    await page.touchscreen.tap(195, 290);
    await page.waitForTimeout(250);
    await page.touchscreen.tap(60, 82);
    await page.waitForTimeout(200);
    await page.touchscreen.tap(350, 42);
    await page.waitForTimeout(200);

    // Player did not accidentally move while tapping HUD & Almanach
    const after = (await flushAndReadSave(page))!;
    expect(after.player.x).toBe(before.player.x);
    expect(after.player.y).toBe(before.player.y);
    expect(errors).toEqual([]);
  });

  test('rests on a garden bench via phone context button and advances night cycle', async ({ page }) => {
    const errors = trackErrors(page);

    await page.addInitScript((key) => {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          player: { mapId: 'garden', x: 21 * 32, y: 33.1 * 32, facing: 'up' },
          world: { unblockedPaths: [], visitedZones: ['garden'], flags: { 'episode-1-complete': true } },
          inventory: { items: {} },
          quests: { active: [], completed: ['q-meet-crow'], progress: {} },
          ext: {},
        }),
      );
    }, SAVE_KEY);

    await page.goto('/');
    await waitForGameBoot(page);

    // Tap context button ("Ausruhen" at 326, 768) -> restUntilMorning() triggers nightly blight spread
    await expect
      .poll(
        async () => {
          const tiles = ((await flushAndReadSave(page))?.ext.blight as { tiles?: { garden?: string[] } } | undefined)?.tiles?.garden;
          if ((tiles?.length ?? 0) > 0) return tiles!.length;
          await page.touchscreen.tap(326, 768);
          await page.waitForTimeout(350);
          const next = ((await flushAndReadSave(page))?.ext.blight as { tiles?: { garden?: string[] } } | undefined)?.tiles?.garden;
          return next?.length ?? 0;
        },
        { timeout: 15_000, intervals: [200] },
      )
      .toBeGreaterThan(0);

    expect(errors).toEqual([]);
  });

  test('enters water-tower-interior via touch context button on phone', async ({ page }) => {
    const errors = trackErrors(page);

    await seedSave(page, {
      player: { mapId: 'water-tower', x: 16 * 32, y: 10.6 * 32, facing: 'up' },
      world: { visitedZones: ['garden', 'water-tower-plaza'], flags: { 'crow-met': true, 'episode-1-complete': true } },
    });

    await page.goto('/');
    await waitForGameBoot(page);

    await triggerAndWaitForMap(page, 'water-tower-interior', () => page.touchscreen.tap(326, 768));

    const towerSave = (await flushAndReadSave(page))!;
    expect(towerSave.world.visitedZones).toContain('water-tower-interior');
    expect(errors).toEqual([]);
  });
});
