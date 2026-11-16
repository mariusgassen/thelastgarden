import { expect, test } from '@playwright/test';
import {
  countColorPixels,
  findColorCenter,
  flushAndReadSave,
  SAVE_KEY,
  type SaveSnapshot,
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
const SUN_GOLD_RGB: readonly [number, number, number] = [233, 162, 59];

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

    await seedSave(page, {
      player: { mapId: 'garden', x: 7 * 32, y: 33 * 32, facing: 'right' },
      world: { visitedZones: ['garden'] },
      quests: { active: ['q-meet-crow'] },
    });

    await page.goto('/');
    await waitForGameBoot(page);

    await triggerAndWaitForMap(page, 'workshop', () => page.keyboard.press('KeyE'));

    const workshopSave = await flushAndReadSave(page);
    expect(workshopSave!.player.mapId).toBe('workshop');
    expect(workshopSave!.world.visitedZones).toContain('workshop');
    expect(errors).toEqual([]);
  });

  test('rides the horse and fast travels with the town map', async ({ page }) => {
    const errors = trackErrors(page);

    await seedSave(page, {
      player: { mapId: 'garden', x: 25.5 * 32, y: 31 * 32, facing: 'right' },
      world: {
        visitedZones: ['garden', 'tram-tracks'],
        flags: { 'crow-met': true, 'greenhouse-hint-read': true, 'horse-tamed': true },
      },
      quests: { completed: ['q-meet-crow'] },
    });

    await page.goto('/');
    await waitForGameBoot(page);

    const ridingState = async () => ((await flushAndReadSave(page))?.ext.horse as { riding: boolean } | undefined)?.riding;
    await triggerUntil(page, async () => Boolean(await ridingState()), () => page.keyboard.press('KeyR'), {
      timeout: 15_000,
      attemptWaitMs: 2_500,
      label: 'mount with R',
    });

    // Open the map, pick the next known stop (the tramline) and confirm
    await triggerAndWaitForMap(page, 'tramline', async () => {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
      await page.keyboard.press('KeyM');
      await page.waitForTimeout(300);
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(150);
      await page.keyboard.press('KeyE');
    });

    // Still riding after the journey
    expect(await ridingState()).toBe(true);
    expect(errors).toEqual([]);
  });

  test('horse follows along on foot outdoors and mounts with R', async ({ page }) => {
    const errors = trackErrors(page);

    await seedSave(page, {
      player: { mapId: 'garden', x: 20 * 32, y: 36 * 32, facing: 'right' },
      world: {
        visitedZones: ['garden', 'tram-tracks'],
        flags: { 'crow-met': true, 'greenhouse-hint-read': true, 'horse-tamed': true },
      },
      quests: { completed: ['q-meet-crow'] },
      ext: { horse: { riding: false } },
    });

    await page.goto('/');
    await waitForGameBoot(page);
    // Mohn spawns beside the player on foot
    await expect
      .poll(() => countColorPixels(page, { x: 460, y: 260, width: 280, height: 220 }, HORSE_COAT_RGB), {
        timeout: 12_000,
        intervals: [150],
      })
      .toBeGreaterThan(100);
    await expect
      .poll(() => countColorPixels(page, { x: 540, y: 260, width: 200, height: 200 }, STRAW_HAT_RGB), {
        timeout: 12_000,
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
        timeout: 12_000,
        intervals: [150],
      })
      .toBeGreaterThan(100);

    // Mount with R: riding state becomes true and the mounted player-horse sprite is rendered
    await triggerUntil(
      page,
      async () => Boolean(((await flushAndReadSave(page))?.ext.horse as { riding: boolean } | undefined)?.riding),
      () => page.keyboard.press('KeyR'),
      { timeout: 10_000, attemptWaitMs: 2_500, label: 'mount with R' },
    );
    await expect
      .poll(() => countColorPixels(page, { x: 540, y: 260, width: 200, height: 220 }, HORSE_COAT_RGB), {
        timeout: 12_000,
        intervals: [150],
      })
      .toBeGreaterThan(60);

    expect(errors).toEqual([]);
  });

  test('leaving a building restores riding and fast travel keeps character visible', async ({ page }) => {
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

    // Outdoors before entering: riding near hut door (left-of-center clamped camera)
    await expect
      .poll(() => countColorPixels(page, { x: 260, y: 200, width: 260, height: 260 }, HORSE_COAT_RGB), {
        timeout: 12_000,
        intervals: [150],
      })
      .toBeGreaterThan(60);

    // Enter workshop: Mohn waits outside while riding preference stays true
    await triggerAndWaitForMap(page, 'workshop', () => page.keyboard.press('KeyE'));

    const indoorSave = await flushAndReadSave(page);
    expect((indoorSave?.ext.horse as { riding: boolean }).riding).toBe(true);
    await expect
      .poll(() => countColorPixels(page, { x: 540, y: 420, width: 200, height: 160 }, STRAW_HAT_RGB), {
        timeout: 12_000,
        intervals: [150],
      })
      .toBeGreaterThan(30);
    expect(await countColorPixels(page, { x: 540, y: 420, width: 200, height: 160 }, HORSE_COAT_RGB, 6)).toBeLessThan(15);

    // Leave workshop: back outdoors on Mohn again
    await triggerAndWaitForMap(page, 'garden', () => page.keyboard.press('KeyE'));

    const outdoorSave = await flushAndReadSave(page);
    expect((outdoorSave?.ext.horse as { riding: boolean }).riding).toBe(true);
    await expect
      .poll(() => countColorPixels(page, { x: 260, y: 200, width: 260, height: 260 }, HORSE_COAT_RGB), {
        timeout: 12_000,
        intervals: [150],
      })
      .toBeGreaterThan(60);
    await expect
      .poll(() => countColorPixels(page, { x: 260, y: 200, width: 260, height: 260 }, STRAW_HAT_RGB), {
        timeout: 12_000,
        intervals: [150],
      })
      .toBeGreaterThan(30);

    // Fast travel to Drei Höfe (river-farms) and verify character & horse are clearly visible below top HUD
    await triggerAndWaitForMap(page, 'river-farms', async () => {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
      await page.keyboard.press('KeyM');
      await page.waitForTimeout(300);
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(150);
      await page.keyboard.press('KeyE');
    });

    expect(((await flushAndReadSave(page))?.ext.horse as { riding: boolean }).riding).toBe(true);
    await expect
      .poll(() => countColorPixels(page, { x: 460, y: 120, width: 360, height: 400 }, STRAW_HAT_RGB), {
        timeout: 12_000,
        intervals: [150],
      })
      .toBeGreaterThan(30);
    await expect
      .poll(() => countColorPixels(page, { x: 460, y: 120, width: 360, height: 400 }, HORSE_COAT_RGB), {
        timeout: 12_000,
        intervals: [150],
      })
      .toBeGreaterThan(60);
    expect(errors).toEqual([]);
  });

  test('harvests regrowing produce from a mature bed', async ({ page }) => {
    const errors = trackErrors(page);

    await seedSave(page, {
      // Standing at the first plant slot of bed-bramble (tiles 16..20 × 29..31, one slot per tile)
      player: { mapId: 'garden', x: 16.5 * 32, y: 30 * 32, facing: 'right' },
      world: { visitedZones: ['garden'], flags: { 'crow-met': true, 'bed-restored:bed-bramble': true } },
      quests: { active: ['q-restore-beds'], completed: ['q-meet-crow'] },
      ext: {
        plants: {
          beds: { 'bed-bramble': { bedId: 'bed-bramble', plantId: 'bramble-vine', plantedAt: Date.now() - 600_000 } },
        },
      },
    });

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

    await seedSave(page, {
      // Standing at the first plant slot of bed-extra (tiles 30..34 × 41..43, one slot per tile)
      player: { mapId: 'garden', x: 30.5 * 32, y: 42 * 32, facing: 'right' },
      world: { visitedZones: ['garden'], flags: { 'crow-met': true } },
      inventory: { items: { 'seed-glow-lily': 1, 'seed-lavender': 2 } },
      quests: { active: ['q-restore-beds'], completed: ['q-meet-crow'] },
    });

    await page.goto('/');
    await waitForGameBoot(page);

    const plantedIn = (save: SaveSnapshot | null): string | undefined =>
      (save?.ext.plants as { beds?: Record<string, { plantId: string }> } | undefined)?.beds?.['bed-extra']?.plantId;

    // E opens the picker (1 = Leuchtlilie, 2 = Lavendel); 2 plants the lavender
    await triggerUntil(
      page,
      async () => Boolean(plantedIn(await flushAndReadSave(page))),
      async () => {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
        await page.keyboard.press('KeyE');
        await page.waitForTimeout(350);
        await page.keyboard.press('Digit2');
      },
      { timeout: 15_000, attemptWaitMs: 3_000, label: 'plant lavender via seed picker' },
    );

    const save = (await flushAndReadSave(page)) as SaveSnapshot;
    expect(plantedIn(save)).toBe('lavender');
    expect(save.inventory.items['seed-lavender']).toBe(1);
    expect(save.inventory.items['seed-glow-lily']).toBe(1);
    expect(errors).toEqual([]);
  });

  test('crafts a bramble cutting at the workbench', async ({ page }) => {
    const errors = trackErrors(page);

    await seedSave(page, {
      // Standing in front of the workbench (3.2, 4.1)
      player: { mapId: 'workshop', x: 3.2 * 32, y: 4.7 * 32, facing: 'right' },
      world: {
        visitedZones: ['garden', 'workshop'],
        flags: { 'crow-met': true, 'saw-found': true, 'journal-read:page-bramble': true },
      },
      inventory: { items: { 'garden-saw': 1, 'produce-tendril': 2, 'resource-dew': 1 } },
      quests: { active: ['q-restore-beds'], completed: ['q-meet-crow'] },
    });

    await page.goto('/');
    await waitForGameBoot(page);

    // E opens the recipe list (1 = Brombeer-Steckling); 1 crafts it
    await triggerUntil(
      page,
      async () => ((await flushAndReadSave(page))?.inventory.items['craft-bramble-cutting'] ?? 0) === 1,
      async () => {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
        await page.keyboard.press('KeyE');
        await page.waitForTimeout(350);
        await page.keyboard.press('Digit1');
      },
      { timeout: 15_000, attemptWaitMs: 3_000, label: 'craft bramble cutting at workbench' },
    );

    const save = (await flushAndReadSave(page)) as SaveSnapshot;
    expect(save.inventory.items['produce-tendril']).toBeUndefined();
    expect(save.inventory.items['resource-dew']).toBeUndefined();
    expect(errors).toEqual([]);
  });

  test('opens the bag and crafts anywhere with the pocket workbench', async ({ page }) => {
    const errors = trackErrors(page);

    await seedSave(page, {
      // Out in the garden, far from any workbench
      player: { mapId: 'garden', x: 25.5 * 32, y: 36 * 32, facing: 'right' },
      world: {
        visitedZones: ['garden'],
        flags: { 'crow-met': true, 'journal-read:page-bramble': true },
      },
      inventory: { items: { 'pocket-workbench': 1, 'produce-tendril': 2, 'resource-dew': 1 } },
      quests: { active: ['q-restore-beds'], completed: ['q-meet-crow'] },
    });

    await page.goto('/');
    await waitForGameBoot(page);

    // The bag opens with I and blocks movement while open; Escape closes it again
    const before = (await flushAndReadSave(page)) as SaveSnapshot;
    await page.keyboard.press('KeyI');
    await page.waitForTimeout(300);
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(450);
    await page.keyboard.up('KeyD');
    expect(((await flushAndReadSave(page)) as SaveSnapshot).player.x).toBe(before.player.x);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);

    // C opens the recipe list anywhere (1 = Brombeer-Steckling)
    await triggerUntil(
      page,
      async () => ((await flushAndReadSave(page))?.inventory.items['craft-bramble-cutting'] ?? 0) === 1,
      async () => {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
        await page.keyboard.press('KeyC');
        await page.waitForTimeout(350);
        await page.keyboard.press('Digit1');
      },
      { timeout: 15_000, attemptWaitMs: 3_000, label: 'craft via pocket workbench' },
    );

    expect(((await flushAndReadSave(page)) as SaveSnapshot).world.flags['crafted:bramble-cutting']).toBe(true);
    expect(errors).toEqual([]);
  });

  test('completes greenhouse vestibule unlock and Episode 1 ending from seeded save', async ({ page }) => {
    const errors = trackErrors(page);

    await seedSave(page, {
      player: { mapId: 'garden', x: 25 * 32, y: 21 * 32, facing: 'right' },
      world: {
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
      quests: { active: ['q-greenhouse'], completed: ['q-meet-crow', 'q-restore-beds', 'q-journal-pages'] },
    });

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

    await waitFrames(page, 3);

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

  test('digs targeted slot from mixed bed into inventory with shovel and places free soil bed', async ({ page }) => {
    const errors = trackErrors(page);

    await page.addInitScript((key) => {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          // Standing right above slot 0 of bed-extra (x=30..34, y=41..43)
          player: { mapId: 'garden', x: 30.5 * 32, y: 40.7 * 32, facing: 'down' },
          world: { unblockedPaths: [], visitedZones: ['garden'], flags: { 'gathered-material': true } },
          inventory: { items: { 'tool-shovel': 1 } },
          quests: { active: ['q-meet-crow'], completed: [], progress: {} },
          ext: {
            tools: { equipped: 'tool-shovel' },
            plants: {
              beds: {
                'bed-extra': { bedId: 'bed-extra', plantId: 'lavender', plantedAt: Date.now() },
                'bed-extra#1': { bedId: 'bed-extra#1', plantId: 'glow-lily', plantedAt: Date.now() },
              },
            },
          },
        }),
      );
    }, SAVE_KEY);

    await page.goto('/');
    await waitForGameBoot(page);

    // Shovel is equipped -> press E to dig slot 0 -> lavender seed goes into inventory while slot 1 stays planted
    await expect
      .poll(
        async () => {
          const s = await flushAndReadSave(page);
          if ((s?.inventory.items['seed-lavender'] ?? 0) >= 1) return true;
          await page.keyboard.press('KeyE');
          await page.waitForTimeout(300);
          return ((await flushAndReadSave(page))?.inventory.items['seed-lavender'] ?? 0) >= 1;
        },
        { timeout: 15_000, intervals: [150] },
      )
      .toBe(true);

    let save = (await flushAndReadSave(page)) as SaveSnapshot;
    const bedsAfterDig = (save.ext.plants as { beds: Record<string, unknown> }).beds;
    expect(bedsAfterDig['bed-extra']).toBeUndefined();
    expect(bedsAfterDig['bed-extra#1']).toBeDefined();
    expect(save.inventory.items['seed-lavender']).toBe(1);

    // Close tool mode, open build mode (B), select free soil planter (Digit5), and place in front of player (KeyE)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    await expect
      .poll(
        async () => {
          const pieces = ((await flushAndReadSave(page))?.ext.building as { pieces?: { garden?: { id: string }[] } } | undefined)
            ?.pieces?.garden;
          if (pieces?.some((p) => p.id === 'planter')) return true;
          await page.keyboard.press('KeyB');
          await page.waitForTimeout(150);
          await page.keyboard.press('Digit5');
          await page.waitForTimeout(150);
          await page.keyboard.press('KeyE');
          await page.waitForTimeout(300);
          const next = ((await flushAndReadSave(page))?.ext.building as { pieces?: { garden?: { id: string }[] } } | undefined)
            ?.pieces?.garden;
          return next?.some((p) => p.id === 'planter') ?? false;
        },
        { timeout: 15_000, intervals: [150] },
      )
      .toBe(true);

    save = (await flushAndReadSave(page)) as SaveSnapshot;
    expect(save.inventory.items['mat-wood']).toBeUndefined();
    expect(errors).toEqual([]);
  });

  test('boards moored boat on river-farms, rows on water, and lands back on shore', async ({ page }) => {
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

    // Interact with farms-boat -> pick "Ins Boot steigen" (Digit1)
    await expect
      .poll(
        async () => {
          if (await isBoat()) return true;
          await page.keyboard.press('KeyE');
          await page.waitForTimeout(250);
          await page.keyboard.press('Digit1');
          await page.waitForTimeout(250);
          return isBoat();
        },
        { timeout: 15_000, intervals: [150] },
      )
      .toBe(true);

    // Row east across the river to the secluded east island (x >= 39 * 32)
    await page.keyboard.down('KeyD');
    await expect
      .poll(async () => (await flushAndReadSave(page))?.player.x ?? 0, { timeout: 15_000, intervals: [80] })
      .toBeGreaterThan(39.1 * 32);
    await page.keyboard.up('KeyD');

    // Disembark onto the east island -> lands at x ~ 40.5*32 and parks boat beside island
    await expect
      .poll(
        async () => {
          if (!(await isBoat())) return false;
          await page.keyboard.press('KeyR');
          await page.waitForTimeout(250);
          return isBoat();
        },
        { timeout: 15_000, intervals: [150] },
      )
      .toBe(false);

    const islandSave = await flushAndReadSave(page);
    expect(islandSave?.player.x).toBeGreaterThan(40 * 32);
    expect((islandSave?.ext.boat as { parked?: Record<string, { x: number; y: number }> } | undefined)?.parked?.['river-farms']).toBeDefined();

    // Walk east onto the island to verify the player is not stuck in collisions after disembarking
    const landX = islandSave!.player.x;
    await page.keyboard.down('KeyD');
    await expect
      .poll(async () => (await flushAndReadSave(page))?.player.x ?? landX, { timeout: 10_000, intervals: [80] })
      .toBeGreaterThan(landX + 20);
    await page.keyboard.up('KeyD');

    // Walk back toward the island's west bank and board the parked boat via KeyE
    await page.keyboard.down('KeyA');
    await expect
      .poll(async () => (await flushAndReadSave(page))?.player.x ?? 9999, { timeout: 10_000, intervals: [80] })
      .toBeLessThan(landX + 8);
    await page.keyboard.up('KeyA');

    await expect
      .poll(
        async () => {
          if (await isBoat()) return true;
          await page.keyboard.press('KeyE');
          await page.waitForTimeout(250);
          return isBoat();
        },
        { timeout: 15_000, intervals: [150] },
      )
      .toBe(true);

    // Row back west toward the pier and land back on the pier ("Anlegen" via KeyR)
    await page.keyboard.down('KeyA');
    await expect
      .poll(async () => (await flushAndReadSave(page))?.player.x ?? 9999, { timeout: 15_000, intervals: [80] })
      .toBeLessThan(37.6 * 32);
    await page.keyboard.up('KeyA');

    await expect
      .poll(
        async () => {
          if (!(await isBoat())) return false;
          await page.keyboard.press('KeyR');
          await page.waitForTimeout(250);
          return isBoat();
        },
        { timeout: 15_000, intervals: [150] },
      )
      .toBe(false);

    expect(errors).toEqual([]);
  });

  test('talks to the crow to unlock the main garden quest', async ({ page }) => {
    const errors = trackErrors(page);

    await seedSave(page, {
      player: { mapId: 'garden', x: 11.5 * 32, y: 32.8 * 32, facing: 'down' },
      world: { visitedZones: ['garden'] },
      quests: { active: ['q-meet-crow'] },
    });

    await page.goto('/');
    await waitForGameBoot(page);

    await expect
      .poll(
        async () => {
          const s = await flushAndReadSave(page);
          if (s?.world.flags['crow-met'] && s.quests.active.includes('q-restore-beds')) return true;
          await page.keyboard.press('KeyE');
          await page.waitForTimeout(250);
          return false;
        },
        { timeout: 15_000, intervals: [100] },
      )
      .toBe(true);

    expect(errors).toEqual([]);
  });

  test('waters a growing bed with dew', async ({ page }) => {
    const errors = trackErrors(page);

    await seedSave(page, {
      player: { mapId: 'garden', x: 16.5 * 32, y: 30 * 32, facing: 'right' },
      world: { visitedZones: ['garden'], flags: { 'crow-met': true } },
      inventory: { items: { 'resource-dew': 1 } },
      quests: { active: ['q-restore-beds'], completed: ['q-meet-crow'] },
      ext: {
        plants: {
          beds: { 'bed-bramble': { bedId: 'bed-bramble', plantId: 'bramble-vine', plantedAt: Date.now() - 3_000 } },
        },
      },
    });

    await page.goto('/');
    await waitForGameBoot(page);

    // Water growing bed ("Gießen") -> spends resource-dew and marks wateredStage = 1
    await triggerUntil(
      page,
      async () => ((await flushAndReadSave(page))?.inventory.items['resource-dew'] ?? 0) === 0,
      () => page.keyboard.press('KeyE'),
      { timeout: 10_000, attemptWaitMs: 2_000, label: 'water bed with dew' },
    );

    const wateredSave = (await flushAndReadSave(page))!;
    expect(
      (wateredSave.ext.plants as { beds: Record<string, { wateredStage?: number }> }).beds['bed-bramble'].wateredStage,
    ).toBe(1);

    expect(errors).toEqual([]);
  });

  test('clears bramble obstacle with crafted bramble cutting', async ({ page }) => {
    const errors = trackErrors(page);

    await seedSave(page, {
      player: { mapId: 'garden', x: 33.5 * 32, y: 15.4 * 32, facing: 'right' },
      world: { visitedZones: ['garden', 'greenhouse'], flags: { 'crow-met': true } },
      inventory: { items: { 'craft-bramble-cutting': 1 } },
      quests: { active: ['q-restore-beds'], completed: ['q-meet-crow'] },
    });

    await page.goto('/');
    await waitForGameBoot(page);

    await triggerUntil(
      page,
      async () => (await flushAndReadSave(page))?.world.unblockedPaths.includes('bramble-greenhouse-yard') ?? false,
      () => page.keyboard.press('KeyE'),
      { timeout: 10_000, attemptWaitMs: 2_500, label: 'unblock bramble-greenhouse-yard' },
    );

    const save = (await flushAndReadSave(page))!;
    expect(save.inventory.items['craft-bramble-cutting']).toBeUndefined();
    expect(save.world.unblockedPaths).toContain('bramble-greenhouse-yard');
    expect(errors).toEqual([]);
  });

  test('builds a fence, clears forest with Roden, and dismantles for refund', async ({ page }) => {
    const errors = trackErrors(page);

    await seedSave(page, {
      // Standing on overgrownPath (22, 46) adjacent to clearable forest (23, 46)
      player: { mapId: 'garden', x: 22.5 * 32, y: 46.5 * 32, facing: 'right' },
      world: { visitedZones: ['garden'], flags: { 'crow-met': true, 'gathered-material': true } },
      inventory: { items: { 'mat-wood': 4 } },
      quests: { completed: ['q-meet-crow'] },
    });

    await page.goto('/');
    await waitForGameBoot(page);

    const clearedCount = async () =>
      (((await flushAndReadSave(page))?.ext.building as { cleared?: { garden?: string[] } } | undefined)?.cleared?.garden ?? [])
        .length;
    const piecesCount = async () =>
      (((await flushAndReadSave(page))?.ext.building as { pieces?: { garden?: unknown[] } } | undefined)?.pieces?.garden ?? [])
        .length;

    // B opens BuildBar, Digit1 selects Roden (clearing forest at (23, 46)), E clears 3x3 forest patch
    await triggerUntil(
      page,
      async () => (await countColorPixels(page, { x: 483, y: 461, width: 314, height: 249 }, SUN_GOLD_RGB, 30)) > 80,
      () => page.keyboard.press('KeyB'),
      { timeout: 8_000, attemptWaitMs: 1_500, label: 'open BuildBar with B' },
    );
    await page.keyboard.press('Digit1');
    await page.waitForTimeout(150);
    await triggerUntil(
      page,
      async () => (await clearedCount()) > 0,
      () => page.keyboard.press('KeyE'),
      { timeout: 10_000, attemptWaitMs: 2_500, label: 'clear forest with Roden' },
    );
    expect((await flushAndReadSave(page))!.inventory.items['mat-wood']).toBe(2);

    // Select Zaun (Digit2) and place fence on the newly cleared forest tile (23, 46), then dismantle it with E
    await page.keyboard.press('Digit2');
    await page.waitForTimeout(150);
    await triggerUntil(
      page,
      async () => (await piecesCount()) === 1,
      () => page.keyboard.press('KeyE'),
      { timeout: 10_000, attemptWaitMs: 2_500, label: 'place fence on cleared tile' },
    );
    expect((await flushAndReadSave(page))!.inventory.items['mat-wood']).toBe(1);

    await triggerUntil(
      page,
      async () => (await piecesCount()) === 0,
      () => page.keyboard.press('KeyE'),
      { timeout: 10_000, attemptWaitMs: 2_500, label: 'dismantle fence for refund' },
    );
    expect((await flushAndReadSave(page))!.inventory.items['mat-wood']).toBe(2);

    expect(errors).toEqual([]);
  });

  test('uses sickle, satchel, and shovel tools via tool bar', async ({ page }) => {
    const errors = trackErrors(page);

    await seedSave(page, {
      player: { mapId: 'garden', x: 20.5 * 32, y: 30 * 32, facing: 'right' },
      world: { visitedZones: ['garden'], flags: { 'crow-met': true, 'bed-restored:bed-bramble': true } },
      inventory: { items: { 'tool-sickle': 1, 'tool-shovel': 1, 'tool-satchel': 1 } },
      quests: { active: ['q-restore-beds'], completed: ['q-meet-crow'] },
      ext: {
        plants: {
          beds: {
            // harvests: 1 yields produce-tendril cleanly; digging afterwards returns seed-bramble-vine
            // bed-bramble#3 sits at x=19.5, y=29.5 (1.12 tiles from player at 20.5, 30)
            'bed-bramble#3': {
              bedId: 'bed-bramble#3',
              plantId: 'bramble-vine',
              plantedAt: Date.now() - 600_000,
              harvests: 1,
            },
          },
        },
      },
    });

    await page.goto('/');
    await waitForGameBoot(page);

    const equippedTool = async () =>
      ((await flushAndReadSave(page))?.ext.tools as { equipped?: string } | undefined)?.equipped;

    // T opens ToolBar and Digit1 equips sickle (and closes bar)
    await triggerUntil(
      page,
      async () => (await equippedTool()) === 'tool-sickle',
      async () => {
        await page.keyboard.press('KeyT');
        await page.waitForTimeout(150);
        await page.keyboard.press('Digit1');
      },
      { timeout: 10_000, attemptWaitMs: 1_500, label: 'equip sickle via ToolBar' },
    );

    await triggerUntil(
      page,
      async () => (await flushAndReadSave(page))?.world.flags['used-tool:sickle'] === true,
      () => page.keyboard.press('KeyE'),
      { timeout: 10_000, attemptWaitMs: 2_500, label: 'harvest with sickle' },
    );
    expect((await flushAndReadSave(page))!.inventory.items['produce-tendril']).toBe(1);

    // T -> Digit2 equips shovel; E digs bed-bramble#3 back into inventory as seed-bramble-vine
    await triggerUntil(
      page,
      async () => (await equippedTool()) === 'tool-shovel',
      async () => {
        await page.keyboard.press('KeyT');
        await page.waitForTimeout(150);
        await page.keyboard.press('Digit2');
      },
      { timeout: 10_000, attemptWaitMs: 1_500, label: 'equip shovel via ToolBar' },
    );
    await triggerUntil(
      page,
      async () => (await flushAndReadSave(page))?.world.flags['used-tool:shovel'] === true,
      () => page.keyboard.press('KeyE'),
      { timeout: 10_000, attemptWaitMs: 2_500, label: 'dig plant with shovel' },
    );

    const afterDig = (await flushAndReadSave(page))!;
    expect((afterDig.ext.plants as { beds: Record<string, unknown> }).beds['bed-bramble#3']).toBeUndefined();
    expect(afterDig.inventory.items['seed-bramble-vine']).toBe(1);

    // Walk east into satchel reach of bed-lily (center x = 30.5, reach = 4 -> x >= 28.5 * 32)
    await page.keyboard.down('KeyD');
    await expect
      .poll(async () => (await flushAndReadSave(page))?.player.x ?? 0, { timeout: 20_000, intervals: [150] })
      .toBeGreaterThan(28.5 * 32);
    await page.keyboard.up('KeyD');

    // T -> Digit3 equips satchel; E sows seed-bramble-vine into bed-lily
    await triggerUntil(
      page,
      async () => (await equippedTool()) === 'tool-satchel',
      async () => {
        await page.keyboard.press('KeyT');
        await page.waitForTimeout(150);
        await page.keyboard.press('Digit3');
      },
      { timeout: 10_000, attemptWaitMs: 1_500, label: 'equip satchel via ToolBar' },
    );
    await triggerUntil(
      page,
      async () =>
        Boolean(
          ((await flushAndReadSave(page))?.ext.plants as { beds?: Record<string, { plantId: string }> } | undefined)?.beds?.[
            'bed-lily'
          ]?.plantId,
        ),
      () => page.keyboard.press('KeyE'),
      { timeout: 10_000, attemptWaitMs: 2_500, label: 'sow with satchel' },
    );

    const endSave = (await flushAndReadSave(page))!;
    expect((endSave.ext.plants as { beds: Record<string, { plantId: string }> }).beds['bed-lily'].plantId).toBe('bramble-vine');
    expect(endSave.inventory.items['seed-bramble-vine']).toBeUndefined();
    expect(endSave.world.flags['used-tool:satchel']).toBe(true);
    expect(errors).toEqual([]);
  });

  test('collects eggs from henhouse, loads drying rack, and rests at shelter', async ({ page }) => {
    const errors = trackErrors(page);

    await seedSave(page, {
      player: { mapId: 'garden', x: 23.5 * 32, y: 37.3 * 32, facing: 'up' },
      world: { visitedZones: ['garden'], flags: { 'crow-met': true, 'gathered-material': true, 'horse-tamed': true } },
      inventory: { items: { 'produce-tendril': 1 } },
      quests: { completed: ['q-meet-crow'] },
      ext: {
        horse: { riding: false },
        building: {
          pieces: {
            garden: [
              { id: 'henhouse', x: 23, y: 36 },
              { id: 'stable', x: 25, y: 36 },
              { id: 'drying-rack', x: 27, y: 36 },
              { id: 'shelter', x: 29, y: 36 },
            ],
          },
        },
        animals: { stamps: { 'garden:23:36': Date.now() - 200_000 }, rested: false },
      },
    });

    await page.goto('/');
    await waitForGameBoot(page);

    // Collect eggs from henhouse
    await triggerUntil(
      page,
      async () => ((await flushAndReadSave(page))?.inventory.items['produce-egg'] ?? 0) >= 2,
      () => page.keyboard.press('KeyE'),
      { timeout: 10_000, attemptWaitMs: 2_500, label: 'collect eggs from henhouse' },
    );

    // Walk east to drying-rack (x = 27.5 * 32) and hang produce-tendril to dry
    await page.keyboard.down('KeyD');
    await expect
      .poll(async () => (await flushAndReadSave(page))?.player.x ?? 0, { timeout: 10_000, intervals: [80] })
      .toBeGreaterThan(27.2 * 32);
    await page.keyboard.up('KeyD');

    await triggerUntil(
      page,
      async () =>
        Boolean(
          ((await flushAndReadSave(page))?.ext.machines as { stations?: Record<string, unknown> } | undefined)?.stations?.[
            'garden:27:36'
          ],
        ),
      () => page.keyboard.press('KeyE'),
      { timeout: 10_000, attemptWaitMs: 2_500, label: 'start drying rack' },
    );
    expect((await flushAndReadSave(page))!.inventory.items['produce-tendril']).toBeUndefined();

    // Walk further east to shelter (x = 29.5 * 32) and rest until morning -> runs nightAtStable -> rested = true
    await page.keyboard.down('KeyD');
    await expect
      .poll(async () => (await flushAndReadSave(page))?.player.x ?? 0, { timeout: 10_000, intervals: [80] })
      .toBeGreaterThan(29.2 * 32);
    await page.keyboard.up('KeyD');

    await triggerUntil(
      page,
      async () => ((await flushAndReadSave(page))?.ext.animals as { rested?: boolean } | undefined)?.rested === true,
      () => page.keyboard.press('KeyE'),
      { timeout: 10_000, attemptWaitMs: 2_500, label: 'rest at shelter until morning' },
    );
    expect(errors).toEqual([]);
  });

  test('browses Almanach entries with H and eats a meal from the bag', async ({ page }) => {
    const errors = trackErrors(page);

    await seedSave(page, {
      player: { mapId: 'garden', x: 25.5 * 32, y: 36 * 32, facing: 'right' },
      world: { visitedZones: ['garden'], flags: { 'crow-met': true, 'bed-restored:bed-bramble': true } },
      inventory: { items: { 'meal-berry-mash': 1 } },
      quests: { completed: ['q-meet-crow'] },
    });

    await page.goto('/');
    await waitForGameBoot(page);

    // Open Almanach (H), select first entry, open detail view, step back with Escape, then close
    await page.keyboard.press('KeyH');
    await waitFrames(page, 4);
    await expect
      .poll(() => countColorPixels(page, { x: 460, y: 180, width: 360, height: 320 }, PANEL_BG_RGB, 18), {
        timeout: 10_000,
        intervals: [100],
      })
      .toBeGreaterThan(400);

    await page.keyboard.press('ArrowDown');
    await waitFrames(page, 2);
    await expect
      .poll(() => countColorPixels(page, { x: 420, y: 90, width: 320, height: 100 }, SUN_GOLD_RGB, 32), {
        timeout: 10_000,
        intervals: [100],
      })
      .toBeGreaterThan(15);
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(150);
    await page.keyboard.press('Escape'); // detail -> list
    await page.waitForTimeout(150);
    await page.keyboard.press('Escape'); // list -> closed
    await page.waitForTimeout(150);

    // Open Bag with I, locate golden "Essen" pill, click it -> eats meal-berry-mash
    await triggerUntil(
      page,
      async () => (await flushAndReadSave(page))?.world.flags['ate-meal'] === true,
      async () => {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
        await page.keyboard.press('KeyI');
        await page.waitForTimeout(300);
        const pill = await findColorCenter(page, { x: 640, y: 160, width: 250, height: 240 }, EAT_PILL_RGB, 20);
        if (pill && pill.count > 40) {
          await page.mouse.click(pill.x, pill.y);
        }
      },
      { timeout: 12_000, attemptWaitMs: 3_000, label: 'eat meal from bag' },
    );

    const afterEat = (await flushAndReadSave(page))!;
    expect(afterEat.inventory.items['meal-berry-mash']).toBeUndefined();
    expect((afterEat.ext.meal as { effect: string } | undefined)?.effect).toBe('swift');
    expect(errors).toEqual([]);
  });

  test('helps Hanne and Piet to restore the village plaza and unlock the next quarter', async ({ page }) => {
    const errors = trackErrors(page);

    await seedSave(page, {
      player: { mapId: 'garden', x: 25.4 * 32, y: 64.5 * 32, facing: 'up' },
      world: {
        visitedZones: ['garden', 'bus-stop'],
        flags: { 'crow-met': true, 'episode-1-complete': true, 'chronicle-ending-garden': true },
      },
      inventory: { items: { 'craft-flour': 2, 'produce-egg': 2, 'produce-honey': 1, 'produce-glowcap': 2 } },
      quests: { active: ['q-village-plaza'], completed: ['q-meet-crow'] },
    });

    await page.goto('/');
    await waitForGameBoot(page);

    // Hand over bread ingredients to Hanne (25.4, 63.6)
    await expect
      .poll(
        async () => {
          const s = await flushAndReadSave(page);
          if (s?.world.flags['village-helped:hanne']) return true;
          await page.keyboard.press('KeyE');
          await page.waitForTimeout(250);
          return false;
        },
        { timeout: 12_000, intervals: [100] },
      )
      .toBe(true);

    // Walk west across the plaza to Piet (17.2, 64.6)
    await page.keyboard.down('KeyA');
    await expect
      .poll(async () => (await flushAndReadSave(page))?.player.x ?? 999, { timeout: 15_000, intervals: [80] })
      .toBeLessThan(18 * 32);
    await page.keyboard.up('KeyA');

    // Hand over lantern supplies to Piet -> completes q-village-plaza, restores plaza, unblocks fallen-tree-canal
    await expect
      .poll(
        async () => {
          const s = await flushAndReadSave(page);
          if (s?.world.flags['village-restored:plaza']) return true;
          await page.keyboard.press('KeyE');
          await page.waitForTimeout(250);
          return false;
        },
        { timeout: 12_000, intervals: [100] },
      )
      .toBe(true);

    const restoredSave = (await flushAndReadSave(page))!;
    expect(restoredSave.world.flags['village-helped:piet']).toBe(true);
    expect(restoredSave.quests.completed).toContain('q-village-plaza');
    expect(restoredSave.quests.active).toContain('q-village-farms');
    expect(restoredSave.world.unblockedPaths).toContain('fallen-tree-canal');
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

  test('selects tools without keeping bar open, switches seeds, collects wood with sickle via E, and deselects', async ({
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
          inventory: { items: { 'tool-sickle': 1, 'tool-satchel': 1, 'seed-glow-lily': 2, 'seed-lavender': 2 } },
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

    // Open tool bar with T and pick slot 1 (tool-sickle): bar closes and sickle is active
    await page.keyboard.press('KeyT');
    await page.waitForTimeout(250);
    await page.keyboard.press('Digit1');
    await expect.poll(equipped, { timeout: 6_000, intervals: [100] }).toBe('tool-sickle');

    // E triggers the active sickle directly (bar stays closed) and collects wood-garden-2
    await expect
      .poll(
        async () => {
          const wood = (await flushAndReadSave(page))?.inventory.items['mat-wood'] ?? 0;
          if (wood >= 2) return wood;
          await page.keyboard.press('KeyE');
          await page.waitForTimeout(250);
          return (await flushAndReadSave(page))?.inventory.items['mat-wood'] ?? 0;
        },
        { timeout: 10_000, intervals: [150] },
      )
      .toBe(2);

    // T -> Digit6 (Ablegen) deselects the tool
    await page.keyboard.press('KeyT');
    await page.waitForTimeout(250);
    await page.keyboard.press('Digit6');
    await expect.poll(equipped, { timeout: 6_000, intervals: [100] }).toBeNull();

    // T -> Digit3 equips satchel, pressing Digit3 again cycles seed, clicking seed 1 in seed strip picks glow-lily directly
    await expect
      .poll(
        async () => {
          if ((await equipped()) === 'tool-satchel') return 'tool-satchel';
          await page.keyboard.press('KeyT');
          await page.waitForTimeout(250);
          await page.keyboard.press('Digit3');
          await page.waitForTimeout(250);
          return equipped();
        },
        { timeout: 10_000, intervals: [150] },
      )
      .toBe('tool-satchel');

    await page.keyboard.press('KeyT');
    await page.waitForTimeout(250);
    await page.keyboard.press('Digit3');
    await expect.poll(sowSeed, { timeout: 6_000, intervals: [100] }).toBe('lavender');

    // Bar stays open on cycle when 2+ seeds exist; click the first seed slot (glow-lily at 1050, 399)
    await page.mouse.click(1050, 399);
    await expect.poll(sowSeed, { timeout: 6_000, intervals: [100] }).toBe('glow-lily');

    await page.keyboard.press('Escape');
    await expect.poll(equipped, { timeout: 6_000, intervals: [100] }).toBeNull();

    expect(errors).toEqual([]);
  });

  test('renders stacked and adjacent light plants without white blowout', async ({ page }) => {
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

    // 16 mature light plants stacked in bed-lily + adjacent planters must not saturate the center to pure white.
    const whitePixels = await countColorPixels(page, { x: 520, y: 240, width: 240, height: 180 }, [255, 255, 255], 6);
    expect(whitePixels).toBeLessThan(200);
    expect(errors).toEqual([]);
  });

  test('interacts with a door while keeping a work tool equipped', async ({ page }) => {
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
          inventory: { items: { 'tool-sickle': 1 } },
          quests: { active: ['q-meet-crow'], completed: [], progress: {} },
          ext: { tools: { equipped: 'tool-sickle' } },
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

    const doorSave = await flushAndReadSave(page);
    expect((doorSave?.ext.tools as { equipped?: string } | undefined)?.equipped).toBe('tool-sickle');
    expect(errors).toEqual([]);
  });

  test('opens Almanach with H to read ??? hint and finds old trowel on workshop shelf', async ({ page }) => {
    const errors = trackErrors(page);

    await page.addInitScript((key) => {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          player: { mapId: 'workshop', x: 9 * 32, y: 4.5 * 32, facing: 'up' },
          world: { unblockedPaths: [], visitedZones: ['garden', 'workshop'], flags: { 'crow-met': true } },
          inventory: { items: {} },
          quests: { active: ['q-restore-beds'], completed: ['q-meet-crow'], progress: {} },
          ext: {},
        }),
      );
    }, SAVE_KEY);

    await page.goto('/');
    await waitForGameBoot(page);

    const startX = (await flushAndReadSave(page))!.player.x;

    // Open Almanach with H, verify modal blocks movement, step down to an unknown ??? entry, open hint, and close
    await page.keyboard.press('KeyH');
    await page.waitForTimeout(250);
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(300);
    await page.keyboard.up('KeyD');
    expect(((await flushAndReadSave(page)) as SaveSnapshot).player.x).toBe(startX);

    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(60);
    }
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Interact with workshop-shelf -> receives Alte Pflanzkelle (trowel) and sets trowel-found
    await expect
      .poll(
        async () => {
          const s = await flushAndReadSave(page);
          if ((s?.inventory.items['trowel'] ?? 0) >= 1) return true;
          await page.keyboard.press('KeyE');
          await page.waitForTimeout(300);
          return ((await flushAndReadSave(page))?.inventory.items['trowel'] ?? 0) >= 1;
        },
        { timeout: 15_000, intervals: [150] },
      )
      .toBe(true);

    // Dismiss remaining dialogue lines
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(200);
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(200);

    const save = (await flushAndReadSave(page)) as SaveSnapshot;
    expect(save.inventory.items['trowel']).toBe(1);
    expect(save.world.flags['trowel-found']).toBe(true);
    expect(errors).toEqual([]);
  });

  test('draws dew from old well and respects cooldown on repeat interaction', async ({ page }) => {
    const errors = trackErrors(page);

    await page.addInitScript((key) => {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          player: { mapId: 'garden', x: 41.5 * 32, y: 16.4 * 32, facing: 'up' },
          world: {
            unblockedPaths: ['bramble-greenhouse-yard'],
            visitedZones: ['garden', 'greenhouse-yard'],
            flags: { 'crow-met': true },
          },
          inventory: { items: {} },
          quests: { active: [], completed: ['q-meet-crow'], progress: {} },
          ext: {},
        }),
      );
    }, SAVE_KEY);

    await page.goto('/');
    await waitForGameBoot(page);

    // Draw 1× Tau from old-well -> cooldown recorded and resource-dew increases by 1
    await expect
      .poll(
        async () => {
          const s = await flushAndReadSave(page);
          if ((s?.inventory.items['resource-dew'] ?? 0) >= 1) return true;
          await page.keyboard.press('KeyE');
          await page.waitForTimeout(300);
          return ((await flushAndReadSave(page))?.inventory.items['resource-dew'] ?? 0) >= 1;
        },
        { timeout: 15_000, intervals: [150] },
      )
      .toBe(true);

    let save = (await flushAndReadSave(page)) as SaveSnapshot;
    const cooldowns = (save.ext.interactables as { cooldowns?: Record<string, number> } | undefined)?.cooldowns;
    expect(cooldowns?.['well:old-well']).toBeGreaterThan(0);

    // Dismiss draw dialogue and interact again -> cooldown prevents a second immediate draw
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(200);
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(250);
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(200);

    save = (await flushAndReadSave(page)) as SaveSnapshot;
    expect(save.inventory.items['resource-dew']).toBe(1);
    expect(errors).toEqual([]);
  });

  test('cooks honey cake at M.s stove using filtered stove recipes', async ({ page }) => {
    const errors = trackErrors(page);

    await page.addInitScript((key) => {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          player: { mapId: 'orchard-cottage', x: 2.8 * 32, y: 4.8 * 32, facing: 'up' },
          world: {
            unblockedPaths: [],
            visitedZones: ['orchard-cottage'],
            flags: { 'crow-met': true, 'collected-flour': true, 'harvested-once': true },
          },
          inventory: { items: { 'craft-flour': 1, 'produce-honey': 1, 'produce-egg': 1, 'mat-wood': 2, 'mat-scrap': 1 } },
          quests: { active: [], completed: ['q-meet-crow'], progress: {} },
          ext: {},
        }),
      );
    }, SAVE_KEY);

    await page.goto('/');
    await waitForGameBoot(page);

    // Press E to open filtered stove cooking panel, then Digit1 to cook Honigkuchen (not workbench tools)
    await expect
      .poll(
        async () => {
          const s = await flushAndReadSave(page);
          if ((s?.inventory.items['meal-honey-cake'] ?? 0) >= 1) return true;
          await page.keyboard.press('KeyE');
          await page.waitForTimeout(200);
          await page.keyboard.press('Digit1');
          await page.waitForTimeout(250);
          return ((await flushAndReadSave(page))?.inventory.items['meal-honey-cake'] ?? 0) >= 1;
        },
        { timeout: 15_000, intervals: [150] },
      )
      .toBe(true);

    await page.keyboard.press('Escape');
    const save = (await flushAndReadSave(page)) as SaveSnapshot;
    expect(save.inventory.items['meal-honey-cake']).toBe(1);
    expect(save.inventory.items['craft-flour']).toBeUndefined();
    expect(save.inventory.items['tool-sickle']).toBeUndefined();
    expect(errors).toEqual([]);
  });
});

