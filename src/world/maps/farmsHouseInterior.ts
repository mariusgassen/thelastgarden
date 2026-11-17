import type { MapDef } from '../types';

/** Interior parlor and kitchen of the first farmhouse at Die drei Höfe (16 × 12 tiles). */
export const FARMS_HOUSE_INTERIOR_MAP: MapDef = {
  id: 'farms-house-interior',
  name: 'Flusshof · Bauernstube',
  width: 16,
  height: 12,
  baseTile: 'woodWall',
  backgroundColor: 0x18130e,
  indoor: true,
  layout: [
    { op: 'rect', tile: 'floor', rect: { x: 1, y: 2, w: 14, h: 9 } },
    { op: 'rect', tile: 'floor', rect: { x: 7, y: 11, w: 2, h: 1 } },
  ],
  zones: [{ id: 'farms-house-interior', name: 'Bauernstube', rect: { x: 0, y: 0, w: 16, h: 12 } }],
  obstacles: [],
  props: [
    { texture: 'stove', at: { x: 2.8, y: 3.8 }, solid: { x: 1.5, y: 2.0, w: 2.6, h: 1.7 } },
    { texture: 'flour-barrels', at: { x: 6.2, y: 3.4 }, solid: { x: 5.2, y: 2.2, w: 2.0, h: 1.2 } },
    { texture: 'shelf', at: { x: 10.2, y: 3.0 }, solid: { x: 8.8, y: 2.0, w: 2.8, h: 1.0 } },
    { texture: 'farm-bed', at: { x: 13.4, y: 4.2 }, solid: { x: 12.2, y: 3.0, w: 2.4, h: 1.2 } },
    { texture: 'tea-table', at: { x: 8.0, y: 7.4 }, solid: { x: 6.7, y: 6.3, w: 2.6, h: 1.0 } },
    { texture: 'pots', at: { x: 2.4, y: 9.2 }, solid: { x: 1.7, y: 8.5, w: 1.4, h: 0.7 } },
    { texture: 'rug', at: { x: 8.0, y: 9.0 }, ground: true },
  ],
  interactables: [
    {
      id: 'farms-hearth',
      type: 'craft',
      at: { x: 2.8, y: 4.2 },
      label: 'Kochen',
      title: 'Bauernofen',
      recipeIds: ['berry-mash', 'turnip-stew', 'honey-cake', 'turnip-bread'],
      emptyDialogueId: 'farms-hearth',
    },
    {
      id: 'farms-pantry',
      type: 'dialogue',
      at: { x: 6.2, y: 3.8 },
      label: 'Nachsehen',
      dialogueId: 'farms-pantry-empty',
      variants: [
        {
          dialogueId: 'farms-pantry-found',
          forbids: ['farms-pantry-taken'],
          setFlags: ['farms-pantry-taken'],
          giveItems: [{ itemId: 'produce-honey', count: 1 }],
        },
      ],
    },
    {
      id: 'farms-shelf',
      type: 'dialogue',
      at: { x: 10.2, y: 3.4 },
      label: 'Ansehen',
      dialogueId: 'farms-shelf',
    },
    {
      id: 'farms-bed',
      type: 'rest',
      at: { x: 13.4, y: 4.6 },
      label: 'Ausruhen',
      message: 'Du ruhst dich in der warmen Bauernstube am Fluss aus, bis der Morgen über dem Wasser dämmert.',
    },
    {
      id: 'farms-table',
      type: 'dialogue',
      at: { x: 8.0, y: 7.7 },
      label: 'Ansehen',
      dialogueId: 'farms-table-waiting',
      variants: [
        {
          dialogueId: 'farms-table-supper',
          requires: ['village-restored:farms'],
          giveItems: [{ itemId: 'meal-turnip-bread', count: 1 }],
          cooldownKey: 'farms-table-supper',
          cooldownMs: 180_000,
        },
        {
          dialogueId: 'farms-table-restored',
          requires: ['village-restored:farms'],
        },
      ],
    },
    {
      id: 'farms-house-exit',
      type: 'door',
      at: { x: 8.0, y: 11.4 },
      label: 'Hinausgehen',
      target: { mapId: 'river-farms', spawn: 'house' },
    },
  ],
  resourceNodes: [
    { id: 'farms-int-seed-turnip', itemId: 'seed-gold-turnip', at: { x: 13.0, y: 9.2 }, label: 'Samen einsammeln' },
    { id: 'curio-farms-int-1', itemId: 'resource-curio', at: { x: 4.4, y: 9.2 }, label: 'Aufheben' },
  ],
  spawns: {
    default: { x: 8, y: 10.2 },
    entrance: { x: 8, y: 10.2 },
  },
};
