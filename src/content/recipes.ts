import type { RecipeDef } from './types';

/**
 * Workbench recipes (systems/crafting.ts). Each one is unlocked by reading one of M.'s
 * (or Jakob's) pages, which sets `journal-read:<pageId>`.
 */
export const RECIPES: RecipeDef[] = [
  {
    id: 'bramble-cutting',
    name: 'Brombeer-Steckling',
    result: [{ itemId: 'craft-bramble-cutting', count: 1 }],
    cost: [
      { itemId: 'produce-tendril', count: 2 },
      { itemId: 'resource-dew', count: 1 },
    ],
    requiresFlag: 'journal-read:page-bramble',
  },
  {
    id: 'lily-lantern',
    name: 'Lilienlaterne',
    result: [{ itemId: 'craft-lily-lantern', count: 1 }],
    cost: [
      { itemId: 'produce-light-pollen', count: 2 },
      { itemId: 'resource-sunlight', count: 1 },
    ],
    requiresFlag: 'journal-read:page-lily',
  },
  {
    id: 'lavender-sachet',
    name: 'Lavendelsäckchen',
    result: [{ itemId: 'craft-lavender-sachet', count: 1 }],
    cost: [
      { itemId: 'produce-scent-bundle', count: 2 },
      { itemId: 'resource-sunlight', count: 1 },
    ],
    requiresFlag: 'journal-read:page-lavender',
  },
  {
    id: 'valve-seal',
    name: 'Ventildichtung',
    result: [{ itemId: 'craft-valve-seal', count: 1 }],
    cost: [
      { itemId: 'produce-tendril', count: 1 },
      { itemId: 'produce-scent-bundle', count: 1 },
    ],
    requiresFlag: 'journal-read:page-tower',
  },
  {
    id: 'sealing-braid',
    name: 'Dichtzopf',
    result: [{ itemId: 'craft-sealing-braid', count: 1 }],
    cost: [
      { itemId: 'produce-scent-bundle', count: 2 },
      { itemId: 'resource-dew', count: 1 },
    ],
    requiresFlag: 'journal-read:page-heart',
  },
  {
    id: 'axle-wax',
    name: 'Achsenwachs',
    result: [{ itemId: 'craft-axle-wax', count: 1 }],
    cost: [
      { itemId: 'produce-nectar', count: 2 },
      { itemId: 'resource-sunlight', count: 1 },
    ],
    requiresFlag: 'journal-read:page-orchard',
  },
  {
    id: 'horse-treat',
    name: 'Kräuterleckerli',
    result: [{ itemId: 'craft-horse-treat', count: 1 }],
    cost: [
      { itemId: 'produce-tendril', count: 1 },
      { itemId: 'produce-scent-bundle', count: 1 },
      { itemId: 'resource-dew', count: 1 },
    ],
    requiresFlag: 'journal-read:page-mohn',
  },
  {
    id: 'seed-mix',
    name: 'Saattütchen',
    result: [
      { itemId: 'seed-bramble-vine', count: 1 },
      { itemId: 'seed-glow-lily', count: 1 },
      { itemId: 'seed-lavender', count: 1 },
    ],
    cost: [
      { itemId: 'produce-seed-pod', count: 2 },
      { itemId: 'resource-dew', count: 1 },
    ],
    requiresFlag: 'journal-read:page-mill',
  },
  // Tools: unlocked by playing, not by a journal page (see ARCHITECTURE.md, "Tools and gadgets").
  {
    id: 'tool-sickle',
    name: 'Sichel',
    result: [{ itemId: 'tool-sickle', count: 1 }],
    cost: [
      { itemId: 'mat-wood', count: 2 },
      { itemId: 'mat-scrap', count: 1 },
    ],
    requiresFlag: 'harvested-once',
  },
  {
    id: 'tool-shovel',
    name: 'Spaten',
    result: [{ itemId: 'tool-shovel', count: 1 }],
    cost: [
      { itemId: 'mat-wood', count: 2 },
      { itemId: 'mat-stone', count: 1 },
    ],
    requiresFlag: 'gathered-material',
  },
  {
    id: 'tool-satchel',
    name: 'Saatbeutel',
    result: [{ itemId: 'tool-satchel', count: 1 }],
    cost: [
      { itemId: 'produce-tendril', count: 1 },
      { itemId: 'produce-scent-bundle', count: 1 },
      { itemId: 'mat-scrap', count: 1 },
    ],
    requiresFlag: 'harvested-once',
  },
  {
    id: 'tool-pole-lantern',
    name: 'Stablaterne',
    result: [{ itemId: 'tool-pole-lantern', count: 1 }],
    cost: [
      { itemId: 'mat-wood', count: 1 },
      { itemId: 'mat-scrap', count: 1 },
      { itemId: 'produce-light-pollen', count: 2 },
    ],
    requiresFlag: 'built:lantern',
  },
];
