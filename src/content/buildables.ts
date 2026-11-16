import type { BuildableDef } from './types';

/**
 * Pieces of the build mode (systems/building.ts). Order = order in the build bar.
 * Every piece stops the blight from growing over its own tile; `wardRadius` also keeps the
 * tiles around it clear (systems/blight.ts).
 */
export const BUILDABLES: BuildableDef[] = [
  {
    id: 'fence',
    name: 'Zaun',
    description: 'Hält die Welke auf: Sie wächst nicht durch einen Zaun.',
    cost: [{ itemId: 'mat-wood', count: 1 }],
    on: 'ground',
    solid: { x: 0, y: 0.45, w: 1, h: 0.5 },
  },
  {
    id: 'hedge',
    name: 'Hecke',
    description: 'Eine lebende Mauer. Sie hält auch die Felder direkt um sich frei.',
    cost: [
      { itemId: 'mat-wood', count: 1 },
      { itemId: 'produce-tendril', count: 1 },
    ],
    on: 'ground',
    solid: { x: 0, y: 0.3, w: 1, h: 0.65 },
    wardRadius: 1.5,
  },
  {
    id: 'lantern',
    name: 'Laterne',
    description: 'Ihr Licht drängt die Welke zurück und hellt die Nacht auf.',
    cost: [
      { itemId: 'mat-scrap', count: 1 },
      { itemId: 'produce-light-pollen', count: 1 },
    ],
    on: 'ground',
    solid: { x: 0.3, y: 0.6, w: 0.4, h: 0.35 },
    wardRadius: 2.5,
    lightRadius: 110,
  },
  {
    id: 'planter',
    name: 'Pflanzkübel',
    description: 'Ein Beet zum Mitnehmen. Was darin ausgewachsen ist, hält die Welke weit auf Abstand.',
    cost: [
      { itemId: 'mat-wood', count: 2 },
      { itemId: 'mat-stone', count: 1 },
    ],
    on: 'ground',
    solid: { x: 0.08, y: 0.5, w: 0.84, h: 0.45 },
    planter: true,
  },
  {
    id: 'bridge',
    name: 'Steg',
    description: 'Planken über das Wasser. Stück für Stück kommst du ans andere Ufer.',
    cost: [{ itemId: 'mat-wood', count: 2 }],
    on: 'water',
  },
  {
    id: 'shelter',
    name: 'Unterstand',
    description: 'Ein sicherer Fleck: Hier kannst du bis zum Morgen rasten, und die Welke bleibt fern.',
    cost: [
      { itemId: 'mat-wood', count: 4 },
      { itemId: 'mat-stone', count: 2 },
      { itemId: 'mat-scrap', count: 1 },
    ],
    on: 'ground',
    solid: { x: 0.05, y: 0.25, w: 0.9, h: 0.4 },
    wardRadius: 3.5,
    rest: true,
  },
  {
    id: 'thorn-hedge',
    name: 'Dornenhecke',
    description: 'Eine lebende Mauer aus Dornwurz-Ranken. Nichts kommt durch, und die Welke bleibt auf Abstand.',
    cost: [{ itemId: 'produce-thorn-cane', count: 2 }],
    on: 'ground',
    solid: { x: 0, y: 0.25, w: 1, h: 0.7 },
    wardRadius: 2.5,
  },
  {
    id: 'wattle',
    name: 'Flechtzaun',
    description: 'Weidenruten, um Pfosten geflochten. Leicht, dicht und rasch gebaut.',
    cost: [{ itemId: 'produce-willow-switch', count: 2 }],
    on: 'ground',
    solid: { x: 0, y: 0.4, w: 1, h: 0.55 },
    wardRadius: 1,
  },
  {
    id: 'reed-bridge',
    name: 'Schilfsteg',
    description: 'Dicht gebundene Schilfbündel tragen dich über das Wasser.',
    cost: [{ itemId: 'produce-reed-bundle', count: 2 }],
    on: 'water',
  },
];
