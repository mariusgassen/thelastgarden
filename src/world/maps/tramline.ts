import type { MapDef } from '../types';

/**
 * Overgrown tram corridor east of the garden (52 × 20 tiles).
 * Connects the bus stop road to the Water Tower at the edge of Erlenbrück.
 */
export const TRAMLINE_MAP: MapDef = {
  id: 'tramline',
  name: 'Alte Trasse · Linie 3',
  width: 52,
  height: 20,
  baseTile: 'forest',
  backgroundColor: 0x1b291a,
  decorate: { trees: true, flowers: true, seed: 3003 },
  layout: [
    { op: 'rect', tile: 'wildGrass', rect: { x: 2, y: 6, w: 48, h: 9 } },
    { op: 'rect', tile: 'road', rect: { x: 0, y: 8, w: 5, h: 4 } },
    { op: 'rect', tile: 'rails', rect: { x: 4, y: 9, w: 45, h: 2 } },
    { op: 'rect', tile: 'overgrownPath', rect: { x: 4, y: 11, w: 45, h: 2 } },
    { op: 'rect', tile: 'overgrownPath', rect: { x: 48, y: 9, w: 4, h: 4 } },

    // Signal box yard north of tracks
    { op: 'rect', tile: 'paving', rect: { x: 20, y: 5, w: 7, h: 4 } },
    { op: 'rect', tile: 'brickWall', rect: { x: 22, y: 4, w: 3, h: 2 } },

    // Sunlit clearing south of tracks with planting bed
    { op: 'rect', tile: 'grass', rect: { x: 12, y: 14, w: 13, h: 4 } },
    { op: 'rect', tile: 'soil', rect: { x: 16, y: 15, w: 4, h: 2 } },

    // Chokepoint around x 28..31 so bramble-tram-switch blocks eastward passage until cleared
    { op: 'rect', tile: 'forest', rect: { x: 28, y: 5, w: 3, h: 3 } },
    { op: 'rect', tile: 'forest', rect: { x: 28, y: 13, w: 3, h: 4 } },
  ],
  zones: [
    { id: 'tram-tracks', name: 'Alte Trasse · Linie 3', rect: { x: 0, y: 0, w: 29, h: 20 } },
    { id: 'tram-east', name: 'Gleisende am Stadtrand', rect: { x: 29, y: 0, w: 23, h: 20 } },
  ],
  obstacles: [
    {
      id: 'bramble-tram-switch',
      blockedBy: 'bramble',
      removable: true,
      rect: { x: 28.4, y: 8, w: 2.4, h: 5 },
      name: 'Verwilderte Weiche',
      hint: 'Dichte Brombeerranken haben die alte Weiche überwuchert. Ein Brombeer-Steckling von der Werkbank würde sich hier hindurchwinden.',
    },
  ],
  props: [
    { texture: 'tram-stop', at: { x: 15, y: 8.6 }, solid: { x: 13.3, y: 7.4, w: 3.4, h: 1.1 } },
    { texture: 'signal-box', at: { x: 23.5, y: 6.5 }, solid: { x: 22.1, y: 5, w: 2.8, h: 1.4 } },
    { texture: 'bench', at: { x: 38, y: 8.6 }, solid: { x: 36.9, y: 7.8, w: 2.2, h: 0.7 } },
    { texture: 'signpost-east', at: { x: 47.5, y: 9.2 } },
  ],
  interactables: [
    {
      id: 'tramline-to-garden',
      type: 'door',
      at: { x: 1.5, y: 10.5 },
      label: 'Zum Garten',
      target: { mapId: 'garden', spawn: 'tramline' },
    },
    { id: 'tram-stop-sign', type: 'dialogue', at: { x: 15, y: 8.9 }, label: 'Lesen', dialogueId: 'tram-stop-sign' },
    { id: 'signal-box-door', type: 'dialogue', at: { x: 23.5, y: 6.8 }, label: 'Ansehen', dialogueId: 'signal-box-door' },
    { id: 'tramline-sign-east', type: 'dialogue', at: { x: 47.5, y: 9.5 }, label: 'Lesen', dialogueId: 'tramline-sign-east' },
    {
      id: 'tramline-to-tower',
      type: 'door',
      at: { x: 49.8, y: 11 },
      label: 'Zum Wasserturm',
      target: { mapId: 'water-tower', spawn: 'west' },
    },
  ],
  plantingBeds: [{ id: 'bed-tram-bramble', rect: { x: 16, y: 15, w: 4, h: 2 }, plantId: 'bramble-vine' }],
  resourceNodes: [
    { id: 'tram-seed-bramble', itemId: 'seed-bramble-vine', at: { x: 13.5, y: 16 }, label: 'Samen einsammeln' },
    { id: 'sun-tram-1', itemId: 'resource-sunlight', at: { x: 21, y: 16 }, label: 'Sonnenlicht sammeln', respawnMs: 45_000 },
    { id: 'dew-tram-1', itemId: 'resource-dew', at: { x: 36, y: 13.5 }, label: 'Tau sammeln', respawnMs: 45_000 },
    { id: 'curio-tram-1', itemId: 'resource-curio', at: { x: 26, y: 6.8 }, label: 'Aufheben' },
  ],
  spawns: {
    default: { x: 3, y: 10.5 },
    west: { x: 3, y: 10.5 },
    east: { x: 48.2, y: 11 },
  },
};
