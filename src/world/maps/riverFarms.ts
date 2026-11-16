import type { MapDef } from '../types';

/**
 * The Three Silent River Farms south of the Old Mill (40 × 26 tiles).
 * Features a stone village well and farm bell on the western yard, a bramble-choked
 * farm gate leading to the riverfront hollyhock garden, and a moored wooden riverboat.
 */
export const RIVER_FARMS_MAP: MapDef = {
  id: 'river-farms',
  name: 'Die drei Höfe am Fluss',
  width: 45,
  height: 26,
  baseTile: 'forest',
  backgroundColor: 0x1c291e,
  decorate: { trees: true, flowers: true, seed: 4017 },
  layout: [
    // Northern lane from the Old Mill
    { op: 'rect', tile: 'overgrownPath', rect: { x: 11, y: 0, w: 3, h: 6 } },

    // Western farmstead plaza & weathered farmhouses
    { op: 'rect', tile: 'wildGrass', rect: { x: 4, y: 5, w: 16, h: 15 } },
    { op: 'rect', tile: 'paving', rect: { x: 7, y: 8, w: 10, h: 9 } },
    { op: 'rect', tile: 'hutWall', rect: { x: 5, y: 6, w: 5, h: 3 } },
    { op: 'rect', tile: 'brickWall', rect: { x: 15, y: 6, w: 4, h: 3 } },

    // Narrow eastern gate chokepoint sealed by bramble-farm-gate
    { op: 'rect', tile: 'overgrownPath', rect: { x: 20, y: 11, w: 5, h: 3 } },

    // Eastern riverfront garden, pier & river
    { op: 'rect', tile: 'orchardGrass', rect: { x: 24, y: 5, w: 11, h: 15 } },
    { op: 'rect', tile: 'grass', rect: { x: 25, y: 7, w: 8, h: 10 } },
    { op: 'rect', tile: 'soil', rect: { x: 27, y: 11, w: 4, h: 2 } },
    { op: 'rect', tile: 'water', rect: { x: 35, y: 0, w: 5, h: 26 } },
    { op: 'rect', tile: 'floor', rect: { x: 33, y: 15, w: 4, h: 2 } },

    // Secluded eastern river island reachable by boat (or bridge)
    { op: 'rect', tile: 'orchardGrass', rect: { x: 40, y: 6, w: 4, h: 13 } },
    { op: 'rect', tile: 'soil', rect: { x: 41, y: 12, w: 2, h: 2 } },
  ],
  zones: [
    { id: 'river-farms-yard', name: 'Die drei Höfe · Dorfplatz', rect: { x: 0, y: 0, w: 22, h: 26 } },
    { id: 'river-farms-garden', name: 'Die drei Höfe · Flussgarten', rect: { x: 22, y: 0, w: 17, h: 26 } },
    { id: 'river-farms-island', name: 'Ostufer · Schilfinsel', rect: { x: 39, y: 0, w: 6, h: 26 } },
  ],
  obstacles: [
    {
      id: 'bramble-farm-gate',
      blockedBy: 'bramble',
      removable: true,
      rect: { x: 20.6, y: 10.8, w: 2.8, h: 3.4 },
      name: 'Verwachsenes Hoftor',
      hint: 'Dichte Brombeerranken haben das alte Hoftor zum Flussgarten überwuchert. Ein Brombeer-Steckling von der Werkbank würde sich hier hindurchwinden.',
    },
  ],
  props: [
    { texture: 'hut-roof', at: { x: 7.5, y: 8.2 }, scale: 0.72 },
    { texture: 'hut-door', at: { x: 7.5, y: 9.0 } },
    { texture: 'well', at: { x: 12.5, y: 13.0 }, solid: { x: 11.7, y: 12.0, w: 1.6, h: 1.0 } },
    { texture: 'farm-bell', at: { x: 16.5, y: 10.5 }, solid: { x: 15.9, y: 9.8, w: 1.2, h: 0.7 } },
    { texture: 'bench', at: { x: 29.0, y: 9.0 }, solid: { x: 27.9, y: 8.2, w: 2.2, h: 0.8 } },
    { texture: 'river-boat', at: { x: 38.0, y: 16.4 } },

    // The farms, restored by q-village-farms (content/village.ts).
    { texture: 'village-shop', at: { x: 11.4, y: 19.0 }, solid: { x: 9.5, y: 17.5, w: 3.8, h: 1.4 }, showWhenFlag: 'village-restored:farms' },
    { texture: 'village-washing', at: { x: 18.2, y: 14.2 }, solid: { x: 17.2, y: 13.9, w: 2.0, h: 0.3 }, showWhenFlag: 'village-restored:farms' },
    { texture: 'village-crates', at: { x: 14.4, y: 18.4 }, solid: { x: 13.6, y: 17.9, w: 1.6, h: 0.5 }, showWhenFlag: 'village-restored:farms' },
  ],
  interactables: [
    {
      id: 'farms-to-mill',
      type: 'door',
      at: { x: 12.5, y: 1.4 },
      label: 'Zur Alten Mühle',
      target: { mapId: 'old-mill', spawn: 'south' },
    },
    { id: 'farms-house-door', type: 'dialogue', at: { x: 7.5, y: 9.3 }, label: 'Ansehen', dialogueId: 'farms-house' },
    {
      id: 'farms-well',
      type: 'dialogue',
      at: { x: 12.5, y: 13.3 },
      label: 'Schöpfen',
      dialogueId: 'farms-well',
      variants: [
        {
          dialogueId: 'farms-well-draw',
          giveItems: [{ itemId: 'resource-dew', count: 1 }],
          cooldownKey: 'well:farms-well',
          cooldownMs: 60_000,
        },
      ],
    },
    {
      id: 'farms-bell',
      type: 'dialogue',
      at: { x: 16.5, y: 10.8 },
      label: 'Ansehen',
      dialogueId: 'farms-bell-quiet',
      variants: [{ dialogueId: 'farms-bell-awakened', requires: ['bed-restored:bed-farms-hollyhock'] }],
    },
    {
      id: 'bench-river-farms',
      type: 'rest',
      at: { x: 29.0, y: 9.2 },
      label: 'Ausruhen',
      message: 'Du ruhst dich auf der Bank im Flussgarten der drei Höfe aus, bis der Morgen anbricht.',
    },
    {
      id: 'farms-boat',
      type: 'boat',
      at: { x: 36.2, y: 16.0 },
      label: 'Boot',
      description: 'Ein alter, verwitterter Holzkahn liegt am Steg vertäut. Auf der Planke liegen die Ruder bereit.',
      waterAt: { x: 37.5, y: 17.5 },
      radius: 72,
      ferry: { mapId: 'old-mill', spawn: 'pier', label: 'Zur Alten Mühle rudern' },
    },
    {
      id: 'village-farm-shop',
      type: 'dialogue',
      at: { x: 11.4, y: 19.3 },
      label: 'Besuchen',
      dialogueId: 'village-farms-shop',
      showWhenFlag: 'village-restored:farms',
      variants: [
        {
          dialogueId: 'village-farms-shop-gift',
          giveItems: [
            { itemId: 'produce-gold-turnip', count: 1 },
            { itemId: 'produce-egg', count: 1 },
          ],
          cooldownKey: 'village-farm-shop',
          cooldownMs: 180_000,
        },
      ],
    },
  ],
  npcs: [
    { npcId: 'wilma', at: { x: 9.6, y: 12.6 }, radius: 68, wander: 1.5, showWhenFlag: 'village-open:farms' },
    { npcId: 'bruno', at: { x: 14.8, y: 14.6 }, radius: 68, wander: 1.5, showWhenFlag: 'village-open:farms' },
  ],
  plantingBeds: [
    { id: 'bed-farms-hollyhock', rect: { x: 27, y: 11, w: 4, h: 2 }, plantId: 'hollyhock' },
    { id: 'bed-farms-island', rect: { x: 41, y: 12, w: 2, h: 2 } },
  ],
  journalPages: [
    {
      id: 'page-farms',
      at: { x: 29.0, y: 15.0 },
      dialogueId: 'journal-page-farms',
      appearsWhenFlag: 'jakob-met',
      itemId: 'journal-page-farms',
    },
  ],
  resourceNodes: [
    { id: 'farms-seed-willow', itemId: 'seed-willow', at: { x: 19.2, y: 15.0 }, label: 'Samen einsammeln' },
    { id: 'farms-seed-hollyhock', itemId: 'seed-hollyhock', at: { x: 9.0, y: 14.5 }, label: 'Samen einsammeln' },
    { id: 'sun-farms-1', itemId: 'resource-sunlight', at: { x: 15.0, y: 16.5 }, label: 'Sonnenlicht sammeln', respawnMs: 45_000 },
    { id: 'dew-farms-1', itemId: 'resource-dew', at: { x: 32.0, y: 17.5 }, label: 'Tau sammeln', respawnMs: 45_000 },
    { id: 'dew-farms-island', itemId: 'resource-dew', at: { x: 41.0, y: 15.5 }, label: 'Tau sammeln', respawnMs: 45_000 },
    { id: 'curio-farms-1', itemId: 'resource-curio', at: { x: 26.5, y: 18.0 }, label: 'Aufheben' },
    { id: 'curio-farms-island', itemId: 'resource-curio', at: { x: 42.0, y: 9.5 }, label: 'Aufheben' },
    { id: 'wood-farms-1', itemId: 'mat-wood', at: { x: 31.5, y: 18.0 }, label: 'Holz hacken', respawnMs: 60_000, texture: 'node-wood', count: 2 },
  ],
  clearable: [
    { x: 24, y: 20, w: 10, h: 5 },
    { x: 40, y: 19, w: 4, h: 5 },
  ],
  spawns: {
    default: { x: 12.5, y: 10.2 },
    north: { x: 12.5, y: 10.2 },
    pier: { x: 35.5, y: 16.0 },
  },
};
