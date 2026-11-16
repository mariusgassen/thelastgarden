import type { MapDef } from '../types';

/**
 * The Old Watermill by the River (46 × 30 tiles), east of the orchards.
 * Home to miller Jakob, the jammed waterwheel, a barren apple rootstock for M.'s graft,
 * an interior millroom (mill-interior), and the southern lane down to the Three River Farms.
 */
export const OLD_MILL_MAP: MapDef = {
  id: 'old-mill',
  name: 'Die Alte Mühle am Fluss',
  width: 46,
  height: 30,
  baseTile: 'forest',
  backgroundColor: 0x1e2c1c,
  decorate: { trees: true, flowers: true, seed: 4004 },
  layout: [
    // West path from the orchards
    { op: 'rect', tile: 'overgrownPath', rect: { x: 0, y: 12, w: 6, h: 3 } },

    // Mill courtyard & brick millhouse
    { op: 'rect', tile: 'grass', rect: { x: 5, y: 7, w: 14, h: 15 } },
    { op: 'rect', tile: 'paving', rect: { x: 11, y: 12, w: 7, h: 5 } },
    { op: 'rect', tile: 'brickWall', rect: { x: 12, y: 8, w: 6, h: 4 } },
    { op: 'rect', tile: 'soil', rect: { x: 7, y: 15, w: 4, h: 2 } },

    // River flowing north-to-south & stone bridge across
    { op: 'rect', tile: 'water', rect: { x: 19, y: 0, w: 4, h: 30 } },
    { op: 'rect', tile: 'paving', rect: { x: 18, y: 15, w: 7, h: 3 } },

    // East river meadow & spare planting bed
    { op: 'rect', tile: 'orchardGrass', rect: { x: 23, y: 8, w: 19, h: 14 } },
    { op: 'rect', tile: 'soil', rect: { x: 34, y: 11, w: 4, h: 2 } },

    // Optional northern riverside pier behind a fallen tree
    { op: 'rect', tile: 'overgrownPath', rect: { x: 25, y: 5, w: 3, h: 3 } },
    { op: 'rect', tile: 'floor', rect: { x: 23, y: 2, w: 7, h: 3 } },

    // South path down to the Three River Farms
    { op: 'rect', tile: 'overgrownPath', rect: { x: 31, y: 22, w: 3, h: 8 } },
  ],
  zones: [
    { id: 'mill-riverbank', name: 'Alte Mühle · Mühlhof', rect: { x: 0, y: 0, w: 22, h: 30 } },
    { id: 'mill-meadow', name: 'Alte Mühle · Flusswiese', rect: { x: 22, y: 0, w: 24, h: 30 } },
  ],
  obstacles: [
    {
      id: 'fallen-tree-mill-bank',
      blockedBy: 'fallenTree',
      removable: true,
      rect: { x: 24.8, y: 5.5, w: 3.4, h: 2.0 },
      name: 'Alter Uferstamm',
      hint: 'Eine umgestürzte Erle versperrt den schmalen Weg zum alten Flusssteg. Nur eine Säge kommt hier durch.',
    },
  ],
  props: [
    { texture: 'mill-roof', at: { x: 15, y: 10.6 } },
    { texture: 'hut-door', at: { x: 14.5, y: 12 } },
    { texture: 'mill-wheel', at: { x: 19.2, y: 11.4 }, hideWhenFlag: 'mill-wheel-repaired' },
    { texture: 'mill-wheel-turning', at: { x: 19.2, y: 11.4 }, showWhenFlag: 'mill-wheel-repaired' },
    { texture: 'flour-barrels', at: { x: 11.2, y: 11.8 }, solid: { x: 10.4, y: 11.0, w: 1.6, h: 0.8 } },
    { texture: 'bench', at: { x: 8.5, y: 12.4 }, solid: { x: 7.4, y: 11.6, w: 2.2, h: 0.8 } },
    {
      texture: 'apple-rootstock',
      at: { x: 30, y: 14.5 },
      solid: { x: 29.3, y: 13.7, w: 1.4, h: 0.8 },
      hideWhenFlag: 'mill-apple-grafted',
    },
    {
      texture: 'apple-grafted-tree',
      at: { x: 30, y: 14.5 },
      showWhenFlag: 'mill-apple-grafted',
    },
    { texture: 'signpost-east', at: { x: 30.2, y: 23.0 } },
  ],
  interactables: [
    {
      id: 'mill-to-orchard',
      type: 'door',
      at: { x: 1.4, y: 13.5 },
      label: 'Zu den Obstwiesen',
      target: { mapId: 'orchard', spawn: 'east' },
    },
    {
      id: 'mill-door',
      type: 'door',
      at: { x: 14.5, y: 12.3 },
      label: 'Betreten',
      target: { mapId: 'mill-interior', spawn: 'entrance' },
    },
    {
      id: 'mill-wheel',
      type: 'repair',
      at: { x: 18.6, y: 12.2 },
      label: 'Reparieren',
      radius: 68,
      doneFlag: 'mill-wheel-repaired',
      cost: [
        { itemId: 'craft-axle-wax', count: 1 },
        { itemId: 'resource-sunlight', count: 2 },
        { itemId: 'resource-curio', count: 2 },
      ],
      missingDialogueId: 'mill-wheel-missing',
      repairedDialogueId: 'mill-wheel-repaired',
      doneDialogueId: 'mill-wheel-done',
    },
    {
      id: 'mill-barrels',
      type: 'dialogue',
      at: { x: 11.2, y: 12.0 },
      label: 'Ansehen',
      dialogueId: 'mill-flour-barrels',
    },
    {
      id: 'mill-rootstock',
      type: 'repair',
      at: { x: 30, y: 14.8 },
      label: 'Veredeln',
      radius: 66,
      doneFlag: 'mill-apple-grafted',
      cost: [{ itemId: 'orchard-apple-graft', count: 1 }],
      missingDialogueId: 'mill-rootstock-missing',
      repairedDialogueId: 'mill-rootstock-repaired',
      doneDialogueId: 'mill-rootstock-done',
      giveItems: [{ itemId: 'seed-hollyhock', count: 1 }],
    },
    {
      id: 'mill-sign-farms',
      type: 'dialogue',
      at: { x: 30.2, y: 23.3 },
      label: 'Lesen',
      dialogueId: 'mill-sign-farms',
    },
    {
      id: 'mill-to-farms',
      type: 'door',
      at: { x: 32.5, y: 28.6 },
      label: 'Zu den drei Höfen',
      target: { mapId: 'river-farms', spawn: 'north' },
      radius: 64,
    },
  ],
  npcs: [{ npcId: 'jakob', at: { x: 13.0, y: 13.6 }, radius: 72, hideWhenFlag: 'jakob-ready-to-return' }],
  plantingBeds: [
    { id: 'bed-mill-hollyhock', rect: { x: 7, y: 15, w: 4, h: 2 }, plantId: 'hollyhock' },
    { id: 'bed-mill-extra', rect: { x: 34, y: 11, w: 4, h: 2 } },
  ],
  resourceNodes: [
    { id: 'mill-seed-reed', itemId: 'seed-reed', at: { x: 21.5, y: 17.5 }, label: 'Samen einsammeln' },
    { id: 'sun-mill-1', itemId: 'resource-sunlight', at: { x: 9, y: 10 }, label: 'Sonnenlicht sammeln', respawnMs: 45_000 },
    { id: 'sun-mill-2', itemId: 'resource-sunlight', at: { x: 38, y: 16 }, label: 'Sonnenlicht sammeln', respawnMs: 45_000 },
    { id: 'dew-mill-1', itemId: 'resource-dew', at: { x: 17.5, y: 19 }, label: 'Tau sammeln', respawnMs: 45_000 },
    { id: 'dew-mill-2', itemId: 'resource-dew', at: { x: 25, y: 19 }, label: 'Tau sammeln', respawnMs: 45_000 },
    { id: 'curio-mill-yard', itemId: 'resource-curio', at: { x: 39, y: 11 }, label: 'Aufheben' },
    { id: 'curio-mill-pier', itemId: 'resource-curio', at: { x: 26.5, y: 3.2 }, label: 'Aufheben' },
    // Piles to chop, dig and salvage: raw material for build mode (systems/building.ts).
    { id: 'wood-mill-1', itemId: 'mat-wood', at: { x: 38, y: 20 }, label: 'Holz hacken', respawnMs: 60_000, texture: 'node-wood', count: 2 },
    { id: 'stone-mill-1', itemId: 'mat-stone', at: { x: 27, y: 10 }, label: 'Steine ausgraben', respawnMs: 60_000, texture: 'node-stone' },
    { id: 'scrap-mill-1', itemId: 'mat-scrap', at: { x: 7.5, y: 20 }, label: 'Schrott bergen', respawnMs: 60_000, texture: 'node-scrap' },
  ],
  // Where the blight grows from once Episode 1 is done (systems/blight.ts).
  blightHearts: [
    { id: 'heart-mill-meadow', at: { x: 40, y: 9 }, reach: 6 },
  ],
  spawns: {
    default: { x: 2.5, y: 13.5 },
    west: { x: 2.5, y: 13.5 },
    mill: { x: 14.5, y: 13.4 },
    south: { x: 32.5, y: 27.2 },
  },
};
