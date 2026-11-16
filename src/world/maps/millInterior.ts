import type { MapDef } from '../types';

/** Interior of the Old Watermill's grinding room (16 × 12 tiles). */
export const MILL_INTERIOR_MAP: MapDef = {
  id: 'mill-interior',
  name: 'Alte Mühle · Mahlstube',
  width: 16,
  height: 12,
  baseTile: 'brickWall',
  backgroundColor: 0x1a1512,
  layout: [
    { op: 'rect', tile: 'floor', rect: { x: 1, y: 2, w: 14, h: 9 } },
    { op: 'rect', tile: 'floor', rect: { x: 7, y: 11, w: 2, h: 1 } },
  ],
  zones: [{ id: 'mill-interior', name: 'Mahlstube', rect: { x: 0, y: 0, w: 16, h: 12 } }],
  obstacles: [],
  props: [
    { texture: 'millstone', at: { x: 4.5, y: 5.2 }, solid: { x: 3.3, y: 3.6, w: 2.4, h: 1.6 } },
    { texture: 'mill-ledger', at: { x: 8.5, y: 4.6 }, solid: { x: 7.4, y: 3.6, w: 2.2, h: 1.0 } },
    { texture: 'flour-sacks', at: { x: 12.8, y: 5.0 }, solid: { x: 11.7, y: 3.8, w: 2.2, h: 1.2 } },
    { texture: 'shelf', at: { x: 12.8, y: 2.6 }, solid: { x: 11.4, y: 2.0, w: 2.8, h: 0.7 } },
    { texture: 'rug', at: { x: 8.0, y: 8.4 }, ground: true },
  ],
  interactables: [
    { id: 'mill-interior-stone', type: 'dialogue', at: { x: 4.5, y: 5.5 }, label: 'Ansehen', dialogueId: 'mill-interior-stone' },
    { id: 'mill-interior-ledger', type: 'dialogue', at: { x: 8.5, y: 4.9 }, label: 'Aufschlagen', dialogueId: 'mill-interior-ledger' },
    { id: 'mill-interior-sacks', type: 'dialogue', at: { x: 12.8, y: 5.3 }, label: 'Ansehen', dialogueId: 'mill-interior-sacks' },
    {
      id: 'mill-exit',
      type: 'door',
      at: { x: 8, y: 11.4 },
      label: 'Hinausgehen',
      target: { mapId: 'old-mill', spawn: 'mill' },
    },
  ],
  journalPages: [
    {
      id: 'page-mill',
      at: { x: 8.5, y: 6.4 },
      dialogueId: 'journal-page-mill',
      appearsWhenFlag: 'jakob-met',
      itemId: 'journal-page-mill',
    },
  ],
  resourceNodes: [
    { id: 'mill-seed-hollyhock', itemId: 'seed-hollyhock', at: { x: 3.0, y: 9.2 }, label: 'Samen einsammeln' },
    { id: 'curio-mill-1', itemId: 'resource-curio', at: { x: 13.4, y: 9.4 }, label: 'Aufheben' },
  ],
  spawns: {
    default: { x: 8, y: 10.2 },
    entrance: { x: 8, y: 10.2 },
  },
};
