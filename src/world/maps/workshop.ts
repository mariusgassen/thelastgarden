import type { MapDef } from '../types';

/** Interior of the garden hut (12 × 10 tiles). */
export const WORKSHOP_MAP: MapDef = {
  id: 'workshop',
  name: 'Werkstatt',
  width: 12,
  height: 10,
  baseTile: 'woodWall',
  backgroundColor: 0x16110d,
  layout: [
    { op: 'rect', tile: 'floor', rect: { x: 1, y: 2, w: 10, h: 7 } },
    { op: 'rect', tile: 'floor', rect: { x: 5, y: 9, w: 2, h: 1 } },
  ],
  zones: [{ id: 'workshop', name: 'Werkstatt', rect: { x: 0, y: 0, w: 12, h: 10 } }],
  obstacles: [],
  props: [
    { texture: 'workbench', at: { x: 3.2, y: 3.8 }, solid: { x: 1.2, y: 2, w: 4, h: 1.7 } },
    { texture: 'shelf', at: { x: 9, y: 3.4 }, solid: { x: 7.6, y: 2, w: 2.8, h: 1.3 } },
    { texture: 'pots', at: { x: 9.4, y: 7.6 }, solid: { x: 8.7, y: 6.9, w: 1.4, h: 0.7 } },
    { texture: 'rug', at: { x: 6, y: 7.4 }, ground: true },
  ],
  interactables: [
    { id: 'workbench', type: 'dialogue', at: { x: 3.2, y: 4.1 }, label: 'Ansehen', dialogueId: 'workbench' },
    { id: 'workshop-shelf', type: 'dialogue', at: { x: 9, y: 3.7 }, label: 'Ansehen', dialogueId: 'workshop-shelf' },
    {
      id: 'workshop-exit',
      type: 'door',
      at: { x: 6, y: 9.4 },
      label: 'Hinausgehen',
      target: { mapId: 'garden', spawn: 'workshop-door' },
    },
  ],
  spawns: {
    default: { x: 6, y: 8.2 },
    entrance: { x: 6, y: 8.2 },
  },
};
