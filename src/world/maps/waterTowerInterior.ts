import type { MapDef } from '../types';

/** Interior pumping room of the Water Tower at the edge of Erlenbrück (14 × 14 tiles). */
export const WATER_TOWER_INTERIOR_MAP: MapDef = {
  id: 'water-tower-interior',
  name: 'Wasserturm · Pumpenraum',
  width: 14,
  height: 14,
  baseTile: 'brickWall',
  backgroundColor: 0x151a1d,
  indoor: true,
  layout: [
    { op: 'rect', tile: 'paving', rect: { x: 2, y: 2, w: 10, h: 10 } },
    { op: 'rect', tile: 'paving', rect: { x: 6, y: 12, w: 2, h: 2 } },
  ],
  zones: [{ id: 'water-tower-interior', name: 'Pumpenraum', rect: { x: 0, y: 0, w: 14, h: 14 } }],
  obstacles: [],
  props: [
    { texture: 'tower-pump', at: { x: 7.0, y: 5.2 }, solid: { x: 5.5, y: 3.8, w: 3.0, h: 1.4 } },
    { texture: 'pressure-gauge', at: { x: 3.6, y: 2.8 }, solid: { x: 2.4, y: 2.0, w: 2.4, h: 0.9 } },
    { texture: 'workbench', at: { x: 10.2, y: 3.4 }, solid: { x: 8.5, y: 2.0, w: 3.2, h: 1.4 } },
    { texture: 'fountain-basin', at: { x: 3.8, y: 9.0 }, solid: { x: 2.6, y: 8.0, w: 2.4, h: 1.2 } },
    { texture: 'moon-desk', at: { x: 10.2, y: 9.0 }, solid: { x: 8.8, y: 8.0, w: 2.8, h: 1.2 } },
    { texture: 'rug', at: { x: 7.0, y: 8.2 }, ground: true },
  ],
  interactables: [
    {
      id: 'water-tower-pump',
      type: 'dialogue',
      at: { x: 7.0, y: 5.6 },
      label: 'Prüfen',
      dialogueId: 'water-tower-pump-dry',
      variants: [{ dialogueId: 'water-tower-pump-flowing', requires: ['tower-cistern-repaired'] }],
    },
    {
      id: 'water-tower-gauge',
      type: 'dialogue',
      at: { x: 3.6, y: 3.2 },
      label: 'Ablesen',
      dialogueId: 'water-tower-gauge-low',
      variants: [{ dialogueId: 'water-tower-gauge-ok', requires: ['tower-cistern-repaired'] }],
    },
    {
      id: 'water-tower-workbench',
      type: 'craft',
      at: { x: 10.2, y: 3.8 },
      label: 'Werkeln',
      emptyDialogueId: 'water-tower-workbench',
    },
    {
      id: 'water-tower-basin',
      type: 'dialogue',
      at: { x: 3.8, y: 9.4 },
      label: 'Schöpfen',
      dialogueId: 'water-tower-basin',
      variants: [
        {
          dialogueId: 'water-tower-basin-draw',
          giveItems: [{ itemId: 'resource-dew', count: 1 }],
          cooldownKey: 'well:tower-basin',
          cooldownMs: 60_000,
        },
      ],
    },
    {
      id: 'water-tower-log',
      type: 'dialogue',
      at: { x: 10.2, y: 9.4 },
      label: 'Aufschlagen',
      dialogueId: 'water-tower-log',
    },
    {
      id: 'water-tower-exit',
      type: 'door',
      at: { x: 7.0, y: 13.4 },
      label: 'Hinausgehen',
      target: { mapId: 'water-tower', spawn: 'tower-door' },
    },
  ],
  resourceNodes: [
    { id: 'tower-int-seed-lily', itemId: 'seed-glow-lily', at: { x: 10.8, y: 6.2 }, label: 'Zwiebel einsammeln' },
    { id: 'curio-tower-int-1', itemId: 'resource-curio', at: { x: 2.8, y: 5.8 }, label: 'Aufheben' },
  ],
  spawns: {
    default: { x: 7, y: 11.4 },
    entrance: { x: 7, y: 11.4 },
  },
};
