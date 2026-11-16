import type { MapDef } from '../types';

/**
 * The old hillside orchards behind Erlenbrück (48 × 32 tiles).
 * Features M.'s cottage on the west bank, a spring brook with wooden bridge & irrigation
 * sluice, the apiary / Night Violet bed, and the ancient Mother Apple Tree on the terrace.
 */
export const ORCHARD_MAP: MapDef = {
  id: 'orchard',
  name: 'Die alten Obstwiesen',
  width: 48,
  height: 32,
  baseTile: 'forest',
  backgroundColor: 0x222e19,
  decorate: { trees: true, flowers: true, seed: 3037 },
  layout: [
    // South entry path & lower west orchard meadow
    { op: 'rect', tile: 'overgrownPath', rect: { x: 8, y: 25, w: 3, h: 7 } },
    { op: 'rect', tile: 'orchardGrass', rect: { x: 4, y: 15, w: 15, h: 12 } },
    { op: 'rect', tile: 'soil', rect: { x: 10, y: 20, w: 4, h: 2 } },

    // Northwest cottage yard & timber cottage footprint
    { op: 'rect', tile: 'grass', rect: { x: 4, y: 4, w: 14, h: 11 } },
    { op: 'rect', tile: 'hutWall', rect: { x: 7, y: 4, w: 6, h: 4 } },
    { op: 'rect', tile: 'paving', rect: { x: 8, y: 8, w: 4, h: 3 } },
    { op: 'rect', tile: 'path', rect: { x: 9, y: 11, w: 2, h: 5 } },

    // Mountain brook + wooden bridge crossing
    { op: 'rect', tile: 'water', rect: { x: 19, y: 3, w: 2, h: 26 } },
    { op: 'rect', tile: 'path', rect: { x: 15, y: 19, w: 4, h: 3 } },
    { op: 'rect', tile: 'floor', rect: { x: 18, y: 19, w: 4, h: 3 } },

    // East lower meadow: irrigation sluice, Night Violet bed, beehive, cider press
    { op: 'rect', tile: 'orchardGrass', rect: { x: 21, y: 14, w: 23, h: 14 } },
    { op: 'rect', tile: 'paving', rect: { x: 23, y: 15, w: 4, h: 4 } },
    { op: 'rect', tile: 'soil', rect: { x: 30, y: 19, w: 4, h: 2 } },

    // Bramble-gated slope up to the northeast Sun Terrace (forest flanks left & right)
    { op: 'rect', tile: 'overgrownPath', rect: { x: 34, y: 11, w: 3, h: 4 } },

    // Northeast Sun Terrace & Mother Apple Tree clearing
    { op: 'rect', tile: 'orchardGrass', rect: { x: 26, y: 3, w: 19, h: 8 } },
    { op: 'ellipse', tile: 'grass', cx: 36, cy: 7, rx: 5, ry: 3 },

    // East path leading to the Old Mill (Episode 4)
    { op: 'rect', tile: 'overgrownPath', rect: { x: 43, y: 20, w: 5, h: 3 } },
  ],
  zones: [
    { id: 'orchard-entrance', name: 'Alte Obstwiesen', rect: { x: 0, y: 15, w: 20, h: 17 } },
    { id: 'orchard-cottage-yard', name: 'M.s Gartenhaus', rect: { x: 0, y: 0, w: 20, h: 15 } },
    { id: 'orchard-meadow', name: 'Bienenwiese & Quellrinne', rect: { x: 20, y: 14, w: 28, h: 18 } },
    { id: 'orchard-terrace', name: 'Sonnenhang · Am Mutterbaum', rect: { x: 20, y: 0, w: 28, h: 14 } },
  ],
  obstacles: [
    {
      id: 'bramble-orchard-terrace',
      blockedBy: 'bramble',
      removable: true,
      rect: { x: 33.8, y: 11.4, w: 3.4, h: 2.8 },
      name: 'Dornenhecke am Hang',
      hint: 'Dichte Brombeerranken versperren den Aufstieg zur oberen Terrasse. Ein Brombeer-Steckling von der Werkbank würde sich hier hindurchwinden.',
    },
  ],
  props: [
    { texture: 'cottage-roof', at: { x: 10, y: 6.4 } },
    { texture: 'cottage-door', at: { x: 10, y: 8 } },
    { texture: 'pots', at: { x: 6.4, y: 9.2 }, solid: { x: 5.7, y: 8.5, w: 1.4, h: 0.7 } },
    { texture: 'bench', at: { x: 14.5, y: 8.8 }, solid: { x: 13.4, y: 8, w: 2.2, h: 0.8 } },
    { texture: 'stump', at: { x: 13.2, y: 25.5 }, solid: { x: 12.7, y: 24.9, w: 1, h: 0.6 } },
    { texture: 'signpost-east', at: { x: 44.5, y: 19.6 } },

    {
      texture: 'orchard-sluice',
      at: { x: 24.5, y: 17.5 },
      solid: { x: 23.3, y: 16.2, w: 2.4, h: 1.2 },
      hideWhenFlag: 'orchard-sluice-repaired',
    },
    {
      texture: 'orchard-sluice-fixed',
      at: { x: 24.5, y: 17.5 },
      showWhenFlag: 'orchard-sluice-repaired',
    },
    {
      texture: 'beehive',
      at: { x: 36.5, y: 20.5 },
      solid: { x: 35.6, y: 19.5, w: 1.8, h: 1.0 },
      hideWhenFlag: 'bed-restored:bed-orchard-violet',
    },
    {
      texture: 'beehive-active',
      at: { x: 36.5, y: 20.5 },
      showWhenFlag: 'bed-restored:bed-orchard-violet',
    },
    { texture: 'cider-press', at: { x: 40.5, y: 24.5 }, solid: { x: 39.5, y: 23.4, w: 2.0, h: 1.1 } },

    // Heritage apple trees burst into blossom once Episode 3 is completed
    { texture: 'apple-tree', at: { x: 7, y: 20.5 }, solid: { x: 6.4, y: 19.8, w: 1.2, h: 0.7 }, hideWhenFlag: 'episode-3-complete' },
    { texture: 'apple-tree-bloom', at: { x: 7, y: 20.5 }, showWhenFlag: 'episode-3-complete' },
    { texture: 'apple-tree', at: { x: 26.5, y: 25 }, solid: { x: 25.9, y: 24.3, w: 1.2, h: 0.7 }, hideWhenFlag: 'episode-3-complete' },
    { texture: 'apple-tree-bloom', at: { x: 26.5, y: 25 }, showWhenFlag: 'episode-3-complete' },
    { texture: 'apple-tree', at: { x: 41.5, y: 18 }, solid: { x: 40.9, y: 17.3, w: 1.2, h: 0.7 }, hideWhenFlag: 'episode-3-complete' },
    { texture: 'apple-tree-bloom', at: { x: 41.5, y: 18 }, showWhenFlag: 'episode-3-complete' },

    // Ancient Mother Apple Tree on the sunlit terrace
    {
      texture: 'mother-apple-tree',
      at: { x: 35.5, y: 7.4 },
      solid: { x: 34.4, y: 6.3, w: 2.2, h: 1.1 },
      hideWhenFlag: 'episode-3-complete',
    },
    {
      texture: 'mother-apple-tree-bloom',
      at: { x: 35.5, y: 7.4 },
      showWhenFlag: 'episode-3-complete',
    },

    // The orchard farm, restored by q-village-orchard (content/village.ts).
    { texture: 'village-press-house', at: { x: 31.2, y: 27.6 }, solid: { x: 29.2, y: 26, w: 4.0, h: 1.5 }, showWhenFlag: 'village-restored:orchard' },
    { texture: 'village-crates', at: { x: 34.4, y: 27.0 }, solid: { x: 33.6, y: 26.5, w: 1.6, h: 0.5 }, showWhenFlag: 'village-restored:orchard' },
  ],
  interactables: [
    {
      id: 'orchard-to-hill',
      type: 'door',
      at: { x: 9.5, y: 30.4 },
      label: 'Zum Hügelpfad',
      target: { mapId: 'hill-path', spawn: 'north' },
    },
    {
      id: 'orchard-to-cottage',
      type: 'door',
      at: { x: 10, y: 8.3 },
      label: 'Betreten',
      target: { mapId: 'orchard-cottage', spawn: 'entrance' },
    },
    {
      id: 'orchard-sign-east',
      type: 'dialogue',
      at: { x: 44.5, y: 19.9 },
      label: 'Lesen',
      dialogueId: 'orchard-sign-east',
    },
    {
      id: 'orchard-to-mill',
      type: 'door',
      at: { x: 46.8, y: 21.5 },
      label: 'Zur Alten Mühle',
      locked: true,
      unlockFlag: 'episode-3-complete',
      lockedDialogueId: 'mill-path-locked',
      target: { mapId: 'old-mill', spawn: 'west' },
      radius: 64,
    },
    {
      id: 'orchard-sluice',
      type: 'repair',
      at: { x: 24.5, y: 17.7 },
      label: 'Reparieren',
      radius: 66,
      doneFlag: 'orchard-sluice-repaired',
      cost: [
        { itemId: 'craft-sealing-braid', count: 1 },
        { itemId: 'resource-sunlight', count: 1 },
        { itemId: 'resource-curio', count: 1 },
      ],
      missingDialogueId: 'orchard-sluice-missing',
      repairedDialogueId: 'orchard-sluice-repaired',
      doneDialogueId: 'orchard-sluice-done',
    },
    {
      id: 'orchard-beehive',
      type: 'dialogue',
      at: { x: 36.5, y: 20.8 },
      label: 'Ansehen',
      dialogueId: 'orchard-beehive-quiet',
      variants: [{ dialogueId: 'orchard-beehive-active', requires: ['bed-restored:bed-orchard-violet'] }],
    },
    {
      id: 'orchard-cider-press',
      type: 'dialogue',
      at: { x: 40.5, y: 24.8 },
      label: 'Ansehen',
      dialogueId: 'orchard-cider-press',
    },
    {
      id: 'orchard-mother-tree',
      type: 'dialogue',
      at: { x: 35.5, y: 7.7 },
      label: 'Ansehen',
      dialogueId: 'mother-tree-dormant',
      variants: [{ dialogueId: 'mother-tree-bloom', requires: ['episode-3-complete'] }],
      radius: 68,
    },
    {
      id: 'village-orchard-press',
      type: 'dialogue',
      at: { x: 31.2, y: 27.9 },
      label: 'Ansehen',
      dialogueId: 'village-orchard-press',
      showWhenFlag: 'village-restored:orchard',
    },
  ],
  npcs: [
    { npcId: 'crow', at: { x: 13.2, y: 24.9 }, radius: 70, wander: 2.5, showWhenFlag: 'episode-2-complete', hideWhenFlag: 'jakob-ready-to-return' },
    { npcId: 'm', at: { x: 38.2, y: 8.4 }, radius: 74, wander: 2.5, hideWhenFlag: 'jakob-ready-to-return' },
    { npcId: 'ottilie', at: { x: 38.2, y: 21.8 }, radius: 68, wander: 1.5, showWhenFlag: 'village-open:orchard' },
    { npcId: 'konrad', at: { x: 42.6, y: 23.4 }, radius: 68, wander: 1.5, showWhenFlag: 'village-open:orchard' },
  ],
  plantingBeds: [
    { id: 'bed-orchard-extra', rect: { x: 10, y: 20, w: 4, h: 2 } },
    { id: 'bed-orchard-violet', rect: { x: 30, y: 19, w: 4, h: 2 }, plantId: 'night-violet' },
  ],
  resourceNodes: [
    { id: 'orchard-seed-violet-1', itemId: 'seed-night-violet', at: { x: 35, y: 23 }, label: 'Samen einsammeln' },
    { id: 'sun-orchard-1', itemId: 'resource-sunlight', at: { x: 15, y: 17 }, label: 'Sonnenlicht sammeln', respawnMs: 45_000 },
    { id: 'sun-orchard-2', itemId: 'resource-sunlight', at: { x: 32, y: 9 }, label: 'Sonnenlicht sammeln', respawnMs: 45_000 },
    { id: 'dew-orchard-1', itemId: 'resource-dew', at: { x: 22.5, y: 22 }, label: 'Tau sammeln', respawnMs: 45_000 },
    { id: 'dew-orchard-2', itemId: 'resource-dew', at: { x: 42, y: 16 }, label: 'Tau sammeln', respawnMs: 45_000 },
    { id: 'curio-orchard-1', itemId: 'resource-curio', at: { x: 43, y: 7 }, label: 'Aufheben' },
    { id: 'curio-orchard-2', itemId: 'resource-curio', at: { x: 6.5, y: 26 }, label: 'Aufheben' },
    // Piles to chop, dig and salvage: raw material for build mode (systems/building.ts).
    { id: 'wood-orchard-1', itemId: 'mat-wood', at: { x: 6, y: 17 }, label: 'Holz hacken', respawnMs: 60_000, texture: 'node-wood', count: 2 },
    { id: 'stone-orchard-1', itemId: 'mat-stone', at: { x: 40, y: 15.5 }, label: 'Steine ausgraben', respawnMs: 60_000, texture: 'node-stone' },
    { id: 'scrap-orchard-1', itemId: 'mat-scrap', at: { x: 16, y: 24.5 }, label: 'Schrott bergen', respawnMs: 60_000, texture: 'node-scrap' },
  ],
  // Where the blight grows from once Episode 1 is done (systems/blight.ts).
  blightHearts: [
    { id: 'heart-orchard-meadow', at: { x: 24, y: 26 }, reach: 5 },
  ],
  spawns: {
    default: { x: 9.5, y: 28.8 },
    south: { x: 9.5, y: 28.8 },
    cottage: { x: 10, y: 9.4 },
    east: { x: 45.2, y: 21.5 },
  },
};
