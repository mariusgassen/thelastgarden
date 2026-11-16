import type { MapDef } from '../types';

/**
 * Inner sanctuary of the greenhouse (20 × 16 tiles).
 * Unlocked once the Water Tower spring water parts the inner vines.
 */
export const GREENHOUSE_HEART_MAP: MapDef = {
  id: 'greenhouse-heart',
  name: 'Gewächshaus · Herzraum',
  width: 20,
  height: 16,
  baseTile: 'greenhouse',
  backgroundColor: 0x10211c,
  indoor: true,
  layout: [
    { op: 'rect', tile: 'paving', rect: { x: 2, y: 2, w: 16, h: 12 } },
    { op: 'rect', tile: 'grass', rect: { x: 6, y: 5, w: 8, h: 6 } },
    { op: 'rect', tile: 'soil', rect: { x: 8, y: 7, w: 4, h: 2 } },
    { op: 'rect', tile: 'paving', rect: { x: 9, y: 14, w: 2, h: 2 } },
  ],
  zones: [{ id: 'greenhouse-heart', name: 'Gewächshaus · Herzraum', rect: { x: 0, y: 0, w: 20, h: 16 } }],
  obstacles: [],
  props: [
    { texture: 'fountain-basin', at: { x: 4.5, y: 5.5 }, solid: { x: 3.2, y: 4.1, w: 2.6, h: 1.3 } },
    { texture: 'seed-archive', at: { x: 15.2, y: 4.2 }, solid: { x: 13.6, y: 2.6, w: 3.2, h: 1.5 } },
    { texture: 'moon-desk', at: { x: 5, y: 12.2 }, solid: { x: 3.6, y: 11, w: 2.8, h: 1.1 } },
    { texture: 'bench', at: { x: 15, y: 12.4 }, solid: { x: 13.9, y: 11.6, w: 2.2, h: 0.8 }, flipX: true },
    { texture: 'pots', at: { x: 2.8, y: 9 }, solid: { x: 2.1, y: 8.3, w: 1.4, h: 0.7 } },
    { texture: 'bush', at: { x: 17, y: 8 } },
  ],
  interactables: [
    {
      id: 'fountain-basin',
      type: 'dialogue',
      at: { x: 4.5, y: 5.8 },
      label: 'Schöpfen',
      dialogueId: 'fountain-basin',
      radius: 64,
      variants: [
        {
          dialogueId: 'fountain-basin-draw',
          giveItems: [{ itemId: 'resource-dew', count: 1 }],
          cooldownKey: 'well:fountain-basin',
          cooldownMs: 60_000,
        },
      ],
    },
    { id: 'seed-archive', type: 'dialogue', at: { x: 15.2, y: 4.5 }, label: 'Ansehen', dialogueId: 'seed-archive', radius: 64 },
    { id: 'moon-desk', type: 'dialogue', at: { x: 5, y: 12.5 }, label: 'Ansehen', dialogueId: 'moon-desk' },
    {
      id: 'bench-heart',
      type: 'rest',
      at: { x: 15, y: 12.6 },
      label: 'Ausruhen',
      message: 'Du ruhst dich auf der Bank im warmen Licht des Herzraums aus, bis der Morgen anbricht.',
    },
    {
      id: 'heart-exit',
      type: 'door',
      at: { x: 10, y: 15.4 },
      label: 'Zurück',
      target: { mapId: 'greenhouse-vestibule', spawn: 'inner-door' },
    },
  ],
  npcs: [{ npcId: 'crow', at: { x: 13, y: 8.5 }, radius: 72, wander: 1.5, showWhenFlag: 'greenhouse-inner-unlocked', hideWhenFlag: 'hill-crow-talked' }],
  journalPages: [
    {
      id: 'page-heart',
      at: { x: 5, y: 12.8 },
      dialogueId: 'journal-page-heart',
      appearsWhenFlag: 'greenhouse-inner-unlocked',
      itemId: 'journal-page-heart',
    },
  ],
  plantingBeds: [{ id: 'bed-heart-fern', rect: { x: 8, y: 7, w: 4, h: 2 }, plantId: 'moon-fern' }],
  resourceNodes: [
    { id: 'heart-seed-moon-fern', itemId: 'seed-moon-fern', at: { x: 14.5, y: 5.5 }, label: 'Sporen nehmen' },
    { id: 'dew-heart-1', itemId: 'resource-dew', at: { x: 4.5, y: 7.2 }, label: 'Tau sammeln', respawnMs: 45_000 },
  ],
  spawns: {
    default: { x: 10, y: 14 },
    entrance: { x: 10, y: 14 },
  },
};
