import type { MapDef } from '../types';

/** Interior of M.'s hillside garden cottage (16 × 12 tiles). */
export const ORCHARD_COTTAGE_MAP: MapDef = {
  id: 'orchard-cottage',
  name: 'M.s Gartenhaus',
  width: 16,
  height: 12,
  baseTile: 'woodWall',
  backgroundColor: 0x18130e,
  layout: [
    { op: 'rect', tile: 'floor', rect: { x: 1, y: 2, w: 14, h: 9 } },
    { op: 'rect', tile: 'floor', rect: { x: 7, y: 11, w: 2, h: 1 } },
  ],
  zones: [{ id: 'orchard-cottage', name: 'M.s Gartenhaus', rect: { x: 0, y: 0, w: 16, h: 12 } }],
  obstacles: [],
  props: [
    { texture: 'stove', at: { x: 2.8, y: 4.1 }, solid: { x: 1.5, y: 2.1, w: 2.6, h: 1.8 } },
    { texture: 'valley-map', at: { x: 8, y: 2.7 }, solid: { x: 6.5, y: 2, w: 3, h: 0.6 } },
    { texture: 'herb-rack', at: { x: 13.2, y: 3.6 }, solid: { x: 11.7, y: 2, w: 3, h: 1.4 } },
    { texture: 'tea-table', at: { x: 8, y: 7.4 }, solid: { x: 6.7, y: 6.3, w: 2.6, h: 1.0 } },
    { texture: 'seed-chest', at: { x: 13.2, y: 9.4 }, solid: { x: 12.1, y: 8.4, w: 2.2, h: 0.9 } },
    { texture: 'pots', at: { x: 2.6, y: 9.4 }, solid: { x: 1.9, y: 8.7, w: 1.4, h: 0.7 } },
    { texture: 'rug', at: { x: 8, y: 9.2 }, ground: true },
  ],
  interactables: [
    { id: 'cottage-stove', type: 'dialogue', at: { x: 2.8, y: 4.4 }, label: 'Ansehen', dialogueId: 'cottage-stove' },
    {
      id: 'cottage-valley-map',
      type: 'dialogue',
      at: { x: 8, y: 3.0 },
      label: 'Betrachten',
      dialogueId: 'cottage-valley-map',
      radius: 64,
    },
    // M.'s herb rack doubles as a workbench, so hedge and sluice can be handled without the long walk home.
    { id: 'cottage-herb-rack', type: 'craft', at: { x: 13.2, y: 3.9 }, label: 'Werkeln', emptyDialogueId: 'cottage-herb-rack' },
    { id: 'cottage-tea-table', type: 'dialogue', at: { x: 8, y: 7.7 }, label: 'Ansehen', dialogueId: 'cottage-tea-table' },
    {
      id: 'cottage-seed-chest',
      type: 'dialogue',
      at: { x: 13.2, y: 9.6 },
      label: 'Öffnen',
      dialogueId: 'cottage-seed-chest-done',
      variants: [
        {
          dialogueId: 'cottage-seed-chest',
          forbids: ['cottage-chest-opened'],
          setFlags: ['cottage-chest-opened'],
          giveItems: [{ itemId: 'seed-night-violet', count: 1 }],
        },
      ],
    },
    {
      id: 'cottage-exit',
      type: 'door',
      at: { x: 8, y: 11.4 },
      label: 'Hinausgehen',
      target: { mapId: 'orchard', spawn: 'cottage' },
    },
  ],
  journalPages: [
    {
      id: 'page-orchard',
      at: { x: 6.0, y: 7.6 },
      dialogueId: 'journal-page-orchard',
      appearsWhenFlag: 'm-met',
      itemId: 'journal-page-orchard',
    },
  ],
  resourceNodes: [{ id: 'curio-cottage-1', itemId: 'resource-curio', at: { x: 4.5, y: 9.2 }, label: 'Aufheben' }],
  spawns: {
    default: { x: 8, y: 10.2 },
    entrance: { x: 8, y: 10.2 },
  },
};
