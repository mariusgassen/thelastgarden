import type { MapDef } from '../types';

/**
 * Entry room of the greenhouse (14 × 10 tiles). Episode 1 ends here: the map board on the
 * wall points to the next area (Linie 3 → Wasserturm). The inner door stays locked until a
 * later wave sets `greenhouse-inner-unlocked` and gives it a `target`.
 */
export const GREENHOUSE_VESTIBULE_MAP: MapDef = {
  id: 'greenhouse-vestibule',
  name: 'Gewächshaus · Vorraum',
  width: 14,
  height: 10,
  baseTile: 'greenhouse',
  backgroundColor: 0x152420,
  layout: [
    { op: 'rect', tile: 'paving', rect: { x: 1, y: 2, w: 12, h: 7 } },
    { op: 'rect', tile: 'soil', rect: { x: 8, y: 6, w: 4, h: 2 } },
    { op: 'rect', tile: 'paving', rect: { x: 6, y: 9, w: 2, h: 1 } },
  ],
  zones: [{ id: 'greenhouse-vestibule', name: 'Gewächshaus · Vorraum', rect: { x: 0, y: 0, w: 14, h: 10 } }],
  obstacles: [],
  props: [
    { texture: 'map-board', at: { x: 4, y: 2.7 }, solid: { x: 3, y: 2, w: 2, h: 0.5 } },
    { texture: 'inner-door', at: { x: 10, y: 2.6 }, solid: { x: 9.2, y: 2, w: 1.6, h: 0.4 } },
    { texture: 'planter-table', at: { x: 3.4, y: 7.3 }, solid: { x: 2.1, y: 6.3, w: 2.6, h: 0.8 } },
    { texture: 'pots', at: { x: 12, y: 8.2 }, solid: { x: 11.3, y: 7.5, w: 1.4, h: 0.6 } },
    { texture: 'bush', at: { x: 1.8, y: 4.4 } },
    { texture: 'bush', at: { x: 12.2, y: 4.8 }, scale: 0.8, flipX: true },
  ],
  interactables: [
    {
      id: 'map-board',
      type: 'dialogue',
      at: { x: 4, y: 2.9 },
      label: 'Ansehen',
      dialogueId: 'map-board',
      setFlag: 'greenhouse-hint-read',
      radius: 64,
    },
    {
      id: 'greenhouse-inner-door',
      type: 'door',
      at: { x: 10, y: 2.9 },
      label: 'Öffnen',
      locked: true,
      unlockFlag: 'greenhouse-inner-unlocked',
      lockedDialogueId: 'greenhouse-inner-locked',
    },
    { id: 'planter-table', type: 'dialogue', at: { x: 3.4, y: 7.5 }, label: 'Ansehen', dialogueId: 'planter-table' },
    {
      id: 'vestibule-exit',
      type: 'door',
      at: { x: 7, y: 9.4 },
      label: 'Hinausgehen',
      target: { mapId: 'garden', spawn: 'greenhouse-door' },
    },
  ],
  resourceNodes: [
    { id: 'vestibule-seed-lavender', itemId: 'seed-lavender', at: { x: 5.4, y: 7.2 }, label: 'Samen einsammeln' },
    { id: 'vestibule-seed-lily', itemId: 'seed-glow-lily', at: { x: 10, y: 7.6 }, label: 'Samen einsammeln' },
  ],
  spawns: {
    default: { x: 7, y: 8.2 },
    entrance: { x: 7, y: 8.2 },
  },
};
