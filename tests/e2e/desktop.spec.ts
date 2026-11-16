import { expect, test } from '@playwright/test';
import { countColorPixels, flushAndReadSave, SAVE_KEY, type SaveSnapshot, trackErrors, waitForGameBoot } from './helpers';

const STRAW_HAT_RGB: readonly [number, number, number] = [232, 207, 122];
const HORSE_COAT_RGB: readonly [number, number, number] = [154, 106, 66];

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

  test('rides the horse and fast travels with the town map', async ({ page }) => {
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
            visitedZones: ['garden', 'tram-tracks'],
            flags: { 'crow-met': true, 'greenhouse-hint-read': true, 'horse-tamed': true },
          },
          inventory: { items: {} },
          quests: { active: [], completed: ['q-meet-crow'], progress: {} },
          ext: {},
        }),
      );
    }, SAVE_KEY);

    await page.goto('/');
    await waitForGameBoot(page);

    const ridingState = async () => ((await flushAndReadSave(page))?.ext.horse as { riding: boolean } | undefined)?.riding;
    await expect
      .poll(
        async () => {
          if (await ridingState()) return true;
          await page.keyboard.press('KeyR');
          await page.waitForTimeout(300);
          return ridingState();
        },
        { timeout: 15_000, intervals: [100] },
      )
      .toBe(true);

    // Open the map, pick the next known stop (the tramline) and confirm
    await expect
      .poll(
        async () => {
          if ((await flushAndReadSave(page))?.player.mapId === 'tramline') return 'tramline';
          await page.keyboard.press('KeyM');
          await page.waitForTimeout(300);
          await page.keyboard.press('ArrowRight');
          await page.waitForTimeout(150);
          await page.keyboard.press('KeyE');
          await page.waitForTimeout(900);
          return (await flushAndReadSave(page))?.player.mapId;
        },
        { timeout: 20_000, intervals: [100] },
      )
      .toBe('tramline');

    // Still riding after the journey
    expect(await ridingState()).toBe(true);
    expect(errors).toEqual([]);
  });

  test('horse follows along on foot outdoors and mounts with R', async ({ page }) => {
    const errors = trackErrors(page);

    await page.addInitScript((key) => {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          player: { mapId: 'garden', x: 20 * 32, y: 36 * 32, facing: 'right' },
          world: {
            unblockedPaths: [],
            visitedZones: ['garden', 'tram-tracks'],
            flags: { 'crow-met': true, 'greenhouse-hint-read': true, 'horse-tamed': true },
          },
          inventory: { items: {} },
          quests: { active: [], completed: ['q-meet-crow'], progress: {} },
          ext: { horse: { riding: false } },
        }),
      );
    }, SAVE_KEY);

    await page.goto('/');
    await waitForGameBoot(page);
    // Mohn spawns beside the player on foot
    await expect
      .poll(() => countColorPixels(page, { x: 460, y: 260, width: 280, height: 220 }, HORSE_COAT_RGB), {
        timeout: 6_000,
        intervals: [150],
      })
      .toBeGreaterThan(100);
    await expect
      .poll(() => countColorPixels(page, { x: 540, y: 260, width: 200, height: 200 }, STRAW_HAT_RGB), {
        timeout: 6_000,
        intervals: [150],
      })
      .toBeGreaterThan(30);

    // Walk east across the plaza (~180 px) and wait for Mohn to trot along behind
    const startX = (await flushAndReadSave(page))!.player.x;
    await page.keyboard.down('KeyD');
    await expect
      .poll(async () => (await flushAndReadSave(page))?.player.x ?? startX, {
        timeout: 15_000,
        intervals: [80],
      })
      .toBeGreaterThan(startX + 170);
    await page.keyboard.up('KeyD');

    await expect
      .poll(() => countColorPixels(page, { x: 480, y: 260, width: 220, height: 220 }, HORSE_COAT_RGB), {
        timeout: 6_000,
        intervals: [150],
      })
      .toBeGreaterThan(100);

    // Mount with R: riding state becomes true and the mounted player-horse sprite is rendered
    await expect
      .poll(
        async () => {
          const riding = ((await flushAndReadSave(page))?.ext.horse as { riding: boolean } | undefined)?.riding;
          if (riding) return true;
          await page.keyboard.press('KeyR');
          await page.waitForTimeout(300);
          return ((await flushAndReadSave(page))?.ext.horse as { riding: boolean } | undefined)?.riding;
        },
        { timeout: 10_000, intervals: [100] },
      )
      .toBe(true);
    await expect
      .poll(() => countColorPixels(page, { x: 540, y: 260, width: 200, height: 220 }, HORSE_COAT_RGB), {
        timeout: 6_000,
        intervals: [150],
      })
      .toBeGreaterThan(60);

    expect(errors).toEqual([]);
  });

  test('leaving a building restores riding and fast travel keeps character visible', async ({ page }) => {
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

    // Outdoors before entering: riding near hut door (left-of-center clamped camera)
    await expect
      .poll(() => countColorPixels(page, { x: 260, y: 200, width: 260, height: 260 }, HORSE_COAT_RGB), {
        timeout: 6_000,
        intervals: [150],
      })
      .toBeGreaterThan(60);

    // Enter workshop: Mohn waits outside while riding preference stays true
    await expect
      .poll(
        async () => {
          if ((await flushAndReadSave(page))?.player.mapId === 'workshop') return 'workshop';
          await page.keyboard.press('KeyE');
          await page.waitForTimeout(450);
          return (await flushAndReadSave(page))?.player.mapId;
        },
        { timeout: 15_000, intervals: [100] },
      )
      .toBe('workshop');

    const indoorSave = await flushAndReadSave(page);
    expect((indoorSave?.ext.horse as { riding: boolean }).riding).toBe(true);
    await expect
      .poll(() => countColorPixels(page, { x: 540, y: 420, width: 200, height: 160 }, STRAW_HAT_RGB), {
        timeout: 6_000,
        intervals: [150],
      })
      .toBeGreaterThan(30);
    expect(await countColorPixels(page, { x: 540, y: 420, width: 200, height: 160 }, HORSE_COAT_RGB, 6)).toBeLessThan(15);

    // Leave workshop: back outdoors on Mohn again
    await expect
      .poll(
        async () => {
          if ((await flushAndReadSave(page))?.player.mapId === 'garden') return 'garden';
          await page.keyboard.press('KeyE');
          await page.waitForTimeout(450);
          return (await flushAndReadSave(page))?.player.mapId;
        },
        { timeout: 15_000, intervals: [100] },
      )
      .toBe('garden');

    const outdoorSave = await flushAndReadSave(page);
    expect((outdoorSave?.ext.horse as { riding: boolean }).riding).toBe(true);
    await expect
      .poll(() => countColorPixels(page, { x: 260, y: 200, width: 260, height: 260 }, HORSE_COAT_RGB), {
        timeout: 6_000,
        intervals: [150],
      })
      .toBeGreaterThan(60);
    await expect
      .poll(() => countColorPixels(page, { x: 260, y: 200, width: 260, height: 260 }, STRAW_HAT_RGB), {
        timeout: 6_000,
        intervals: [150],
      })
      .toBeGreaterThan(30);

    // Fast travel to Drei Höfe (river-farms) and verify character & horse are clearly visible below top HUD
    await expect
      .poll(
        async () => {
          if ((await flushAndReadSave(page))?.player.mapId === 'river-farms') return 'river-farms';
          await page.keyboard.press('KeyM');
          await page.waitForTimeout(300);
          await page.keyboard.press('ArrowLeft');
          await page.waitForTimeout(150);
          await page.keyboard.press('KeyE');
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

    expect(((await flushAndReadSave(page))?.ext.horse as { riding: boolean }).riding).toBe(true);
    await expect
      .poll(() => countColorPixels(page, { x: 460, y: 120, width: 360, height: 400 }, STRAW_HAT_RGB), {
        timeout: 6_000,
        intervals: [150],
      })
      .toBeGreaterThan(30);
    await expect
      .poll(() => countColorPixels(page, { x: 460, y: 120, width: 360, height: 400 }, HORSE_COAT_RGB), {
        timeout: 6_000,
        intervals: [150],
      })
      .toBeGreaterThan(60);
    expect(errors).toEqual([]);
  });

  test('harvests regrowing produce from a mature bed', async ({ page }) => {
    const errors = trackErrors(page);

    await page.addInitScript((key) => {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          // Standing at the first plant slot of bed-bramble (tiles 16..20 × 29..31, one slot per tile)
          player: { mapId: 'garden', x: 16.5 * 32, y: 30 * 32, facing: 'right' },
          world: { unblockedPaths: [], visitedZones: ['garden'], flags: { 'crow-met': true, 'bed-restored:bed-bramble': true } },
          inventory: { items: {} },
          quests: { active: ['q-restore-beds'], completed: ['q-meet-crow'], progress: {} },
          ext: {
            plants: {
              beds: { 'bed-bramble': { bedId: 'bed-bramble', plantId: 'bramble-vine', plantedAt: Date.now() - 600_000 } },
            },
          },
        }),
      );
    }, SAVE_KEY);

    await page.goto('/');
    await waitForGameBoot(page);

    // Harvest: one produce item plus a seed on the first harvest; the plant stays in its bed
    await expect
      .poll(
        async () => {
          await page.keyboard.press('KeyE');
          await page.waitForTimeout(300);
          return (await flushAndReadSave(page))?.inventory.items['produce-tendril'] ?? 0;
        },
        { timeout: 15_000, intervals: [100] },
      )
      .toBe(1);
    const harvested = (await flushAndReadSave(page)) as SaveSnapshot;
    expect(harvested.inventory.items['seed-bramble-vine']).toBe(1);
    expect(harvested.world.flags['harvested-once']).toBe(true);
    expect((harvested.ext.plants as { beds: Record<string, unknown> }).beds['bed-bramble']).toBeDefined();

    expect(errors).toEqual([]);
  });

  test('offers a seed picker on an open bed when several kinds of seed are carried', async ({ page }) => {
    const errors = trackErrors(page);

    await page.addInitScript((key) => {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          // Standing at the first plant slot of bed-extra (tiles 30..34 × 41..43, one slot per tile)
          player: { mapId: 'garden', x: 30.5 * 32, y: 42 * 32, facing: 'right' },
          world: { unblockedPaths: [], visitedZones: ['garden'], flags: { 'crow-met': true } },
          inventory: { items: { 'seed-glow-lily': 1, 'seed-lavender': 2 } },
          quests: { active: ['q-restore-beds'], completed: ['q-meet-crow'], progress: {} },
          ext: {},
        }),
      );
    }, SAVE_KEY);

    await page.goto('/');
    await waitForGameBoot(page);

    const plantedIn = (save: SaveSnapshot | null): string | undefined =>
      (save?.ext.plants as { beds?: Record<string, { plantId: string }> } | undefined)?.beds?.['bed-extra']?.plantId;

    // E opens the picker (1 = Leuchtlilie, 2 = Lavendel); 2 plants the lavender
    await expect
      .poll(
        async () => {
          const planted = plantedIn(await flushAndReadSave(page));
          if (planted) return planted;
          await page.keyboard.press('KeyE');
          await page.waitForTimeout(400);
          await page.keyboard.press('Digit2');
          await page.waitForTimeout(300);
          return plantedIn(await flushAndReadSave(page));
        },
        { timeout: 15_000, intervals: [100] },
      )
      .toBe('lavender');

    const save = (await flushAndReadSave(page)) as SaveSnapshot;
    expect(save.inventory.items['seed-lavender']).toBe(1);
    expect(save.inventory.items['seed-glow-lily']).toBe(1);
    expect(errors).toEqual([]);
  });

  test('crafts a bramble cutting at the workbench', async ({ page }) => {
    const errors = trackErrors(page);

    await page.addInitScript((key) => {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          // Standing in front of the workbench (3.2, 4.1)
          player: { mapId: 'workshop', x: 3.2 * 32, y: 4.7 * 32, facing: 'right' },
          world: {
            unblockedPaths: [],
            visitedZones: ['garden', 'workshop'],
            flags: { 'crow-met': true, 'saw-found': true, 'journal-read:page-bramble': true },
          },
          inventory: { items: { 'garden-saw': 1, 'produce-tendril': 2, 'resource-dew': 1 } },
          quests: { active: ['q-restore-beds'], completed: ['q-meet-crow'], progress: {} },
          ext: {},
        }),
      );
    }, SAVE_KEY);

    await page.goto('/');
    await waitForGameBoot(page);

    // E opens the recipe list (1 = Brombeer-Steckling); 1 crafts it
    await expect
      .poll(
        async () => {
          const have = (await flushAndReadSave(page))?.inventory.items['craft-bramble-cutting'] ?? 0;
          if (have > 0) return have;
          await page.keyboard.press('KeyE');
          await page.waitForTimeout(400);
          await page.keyboard.press('Digit1');
          await page.waitForTimeout(300);
          return (await flushAndReadSave(page))?.inventory.items['craft-bramble-cutting'] ?? 0;
        },
        { timeout: 15_000, intervals: [100] },
      )
      .toBe(1);

    const save = (await flushAndReadSave(page)) as SaveSnapshot;
    expect(save.inventory.items['produce-tendril']).toBeUndefined();
    expect(save.inventory.items['resource-dew']).toBeUndefined();
    expect(errors).toEqual([]);
  });

  test('opens the bag and crafts anywhere with the pocket workbench', async ({ page }) => {
    const errors = trackErrors(page);

    await page.addInitScript((key) => {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          // Out in the garden, far from any workbench
          player: { mapId: 'garden', x: 25.5 * 32, y: 36 * 32, facing: 'right' },
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

    // The bag opens with I and blocks movement while open; Escape closes it again
    const before = (await flushAndReadSave(page)) as SaveSnapshot;
    await page.keyboard.press('KeyI');
    await page.waitForTimeout(300);
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyD');
    expect(((await flushAndReadSave(page)) as SaveSnapshot).player.x).toBe(before.player.x);
    await page.keyboard.press('Escape');

    // C opens the recipe list anywhere (1 = Brombeer-Steckling)
    await expect
      .poll(
        async () => {
          const have = (await flushAndReadSave(page))?.inventory.items['craft-bramble-cutting'] ?? 0;
          if (have > 0) return have;
          await page.keyboard.press('KeyC');
          await page.waitForTimeout(400);
          await page.keyboard.press('Digit1');
          await page.waitForTimeout(300);
          return (await flushAndReadSave(page))?.inventory.items['craft-bramble-cutting'] ?? 0;
        },
        { timeout: 15_000, intervals: [100] },
      )
      .toBe(1);

    expect(((await flushAndReadSave(page)) as SaveSnapshot).world.flags['crafted:bramble-cutting']).toBe(true);
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
