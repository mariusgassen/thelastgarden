import type { MapDef } from '../types';

/** Interior of the overgrown railway signal box along Tramline 3 (14 × 10 tiles). */
export const SIGNAL_BOX_INTERIOR_MAP: MapDef = {
  id: 'signal-box-interior',
  name: 'Altes Stellwerk',
  width: 14,
  height: 10,
  baseTile: 'brickWall',
  backgroundColor: 0x181412,
  indoor: true,
  layout: [
    { op: 'rect', tile: 'floor', rect: { x: 1, y: 2, w: 12, h: 7 } },
    { op: 'rect', tile: 'floor', rect: { x: 6, y: 9, w: 2, h: 1 } },
  ],
  zones: [{ id: 'signal-box-interior', name: 'Altes Stellwerk', rect: { x: 0, y: 0, w: 14, h: 10 } }],
  obstacles: [],
  props: [
    { texture: 'signal-levers', at: { x: 4.5, y: 3.6 }, solid: { x: 2.9, y: 2.2, w: 3.2, h: 1.3 } },
    { texture: 'signal-desk', at: { x: 9.8, y: 3.6 }, solid: { x: 8.5, y: 2.2, w: 2.6, h: 1.3 } },
    { texture: 'signal-lamp', at: { x: 2.0, y: 6.0 }, solid: { x: 1.3, y: 5.2, w: 1.4, h: 0.8 } },
    { texture: 'pots', at: { x: 11.4, y: 7.4 }, solid: { x: 10.7, y: 6.7, w: 1.4, h: 0.7 } },
    { texture: 'rug', at: { x: 7.0, y: 6.8 }, ground: true },
  ],
  interactables: [
    {
      id: 'signal-box-levers',
      type: 'dialogue',
      at: { x: 4.5, y: 4.0 },
      label: 'Umlegen',
      dialogueId: 'signal-box-levers-done',
      variants: [
        {
          dialogueId: 'signal-box-levers',
          forbids: ['signal-lever-freed'],
          setFlags: ['signal-lever-freed'],
          giveItems: [
            { itemId: 'mat-scrap', count: 2 },
            { itemId: 'resource-curio', count: 1 },
          ],
        },
      ],
    },
    {
      id: 'signal-box-lamp',
      type: 'dialogue',
      at: { x: 2.0, y: 6.3 },
      label: 'Entzünden',
      dialogueId: 'signal-box-lamp',
      variants: [
        {
          dialogueId: 'signal-box-lamp-glow',
          giveItems: [{ itemId: 'resource-sunlight', count: 1 }],
          cooldownKey: 'signal-box-lamp',
          cooldownMs: 90_000,
        },
      ],
    },
    {
      id: 'signal-box-desk',
      type: 'dialogue',
      at: { x: 9.8, y: 4.0 },
      label: 'Lesen',
      dialogueId: 'signal-box-desk',
    },
    {
      id: 'signal-box-exit',
      type: 'door',
      at: { x: 7.0, y: 9.4 },
      label: 'Hinausgehen',
      target: { mapId: 'tramline', spawn: 'signal-box' },
    },
  ],
  resourceNodes: [
    { id: 'signal-seed-glowcap', itemId: 'seed-glowcap', at: { x: 3.2, y: 7.5 }, label: 'Samen einsammeln' },
    { id: 'curio-signal-1', itemId: 'resource-curio', at: { x: 11.2, y: 4.8 }, label: 'Aufheben' },
  ],
  spawns: {
    default: { x: 7, y: 8.2 },
    entrance: { x: 7, y: 8.2 },
  },
};
