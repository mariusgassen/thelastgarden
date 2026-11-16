import type { MapDef } from '../types';

/**
 * The Three Silent River Farms south of the Old Mill (40 × 26 tiles).
 * Features a stone village well and farm bell on the western yard, a bramble-choked
 * farm gate leading to the riverfront hollyhock garden, and a moored wooden riverboat.
 */
export const RIVER_FARMS_MAP: MapDef = {
  id: 'river-farms',
  name: 'Die drei Höfe am Fluss',
  width: 40,
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
  ],
  zones: [
    { id: 'river-farms-yard', name: 'Die drei Höfe · Dorfplatz', rect: { x: 0, y: 0, w: 22, h: 26 } },
    { id: 'river-farms-garden', name: 'Die drei Höfe · Flussgarten', rect: { x: 22, y: 0, w: 18, h: 26 } },
  ],
  obstacles: [
    {
      id: 'bramble-farm-gate',
      blockedBy: 'bramble',
      removable: true,
      rect: { x: 20.6, y: 10.8, w: 2.8, h: 3.4 },
      name: 'Verwachsenes Hoftor',
      hint: 'Dichte Brombeerranken haben das alte Hoftor zum Flussgarten überwuchert. Eine reife Brombeerranke im Garten weiß, wie man sie teilt.',
    },
  ],
  props: [
    { texture: 'hut-roof', at: { x: 7.5, y: 8.2 }, scale: 0.72 },
    { texture: 'hut-door', at: { x: 7.5, y: 9.0 } },
    { texture: 'well', at: { x: 12.5, y: 13.0 }, solid: { x: 11.7, y: 12.0, w: 1.6, h: 1.0 } },
    { texture: 'farm-bell', at: { x: 16.5, y: 10.5 }, solid: { x: 15.9, y: 9.8, w: 1.2, h: 0.7 } },
    { texture: 'bench', at: { x: 29.0, y: 9.0 }, solid: { x: 27.9, y: 8.2, w: 2.2, h: 0.8 } },
    { texture: 'river-boat', at: { x: 38.0, y: 16.4 } },
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
    { id: 'farms-well', type: 'dialogue', at: { x: 12.5, y: 13.3 }, label: 'Ansehen', dialogueId: 'farms-well' },
    {
      id: 'farms-bell',
      type: 'dialogue',
      at: { x: 16.5, y: 10.8 },
      label: 'Ansehen',
      dialogueId: 'farms-bell-quiet',
      variants: [{ dialogueId: 'farms-bell-awakened', requires: ['bed-restored:bed-farms-hollyhock'] }],
    },
    {
      id: 'farms-boat',
      type: 'dialogue',
      at: { x: 36.2, y: 16.0 },
      label: 'Ansehen',
      dialogueId: 'farms-boat',
      radius: 72,
    },
  ],
  plantingBeds: [{ id: 'bed-farms-hollyhock', rect: { x: 27, y: 11, w: 4, h: 2 }, plantId: 'hollyhock' }],
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
    { id: 'farms-seed-hollyhock', itemId: 'seed-hollyhock', at: { x: 9.0, y: 14.5 }, label: 'Samen einsammeln' },
    { id: 'sun-farms-1', itemId: 'resource-sunlight', at: { x: 15.0, y: 16.5 }, label: 'Sonnenlicht sammeln', respawnMs: 45_000 },
    { id: 'dew-farms-1', itemId: 'resource-dew', at: { x: 32.0, y: 17.5 }, label: 'Tau sammeln', respawnMs: 45_000 },
    { id: 'curio-farms-1', itemId: 'resource-curio', at: { x: 26.5, y: 18.0 }, label: 'Aufheben' },
  ],
  spawns: {
    default: { x: 12.5, y: 2.0 },
    north: { x: 12.5, y: 2.0 },
  },
};
