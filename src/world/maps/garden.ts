import type { MapDef } from '../types';

/**
 * The outdoor world (50 × 72 tiles). Layout (tile coords):
 *
 *   greenhouse clearing (15..34, 10..25) ─ bramble ─ hidden yard (37..45, 11..19)
 *          │
 *   hut yard (2..12) ── main garden (14..35, 27..44) ── pond (37..47, 29..45)
 *      │ tall grass             │ overgrown path            │ fallen tree (canal bank)
 *      └──────────── bus stop plaza (y 58..68) ─────────────┘
 */
export const GARDEN_MAP: MapDef = {
  id: 'garden',
  name: 'Botanischer Garten',
  width: 50,
  height: 72,
  baseTile: 'forest',
  backgroundColor: 0x1f2e1d,
  decorate: { trees: true, flowers: true, seed: 1911 },
  layout: [
    // Main garden
    { op: 'rect', tile: 'wildGrass', rect: { x: 14, y: 27, w: 22, h: 18 } },
    { op: 'rect', tile: 'grass', rect: { x: 18, y: 31, w: 14, h: 10 } },
    { op: 'rect', tile: 'soil', rect: { x: 16, y: 29, w: 4, h: 2 } },
    { op: 'rect', tile: 'soil', rect: { x: 30, y: 29, w: 4, h: 2 } },
    { op: 'rect', tile: 'soil', rect: { x: 16, y: 41, w: 4, h: 2 } },
    { op: 'rect', tile: 'soil', rect: { x: 30, y: 41, w: 4, h: 2 } },
    { op: 'ellipse', tile: 'paving', cx: 25.5, cy: 36, rx: 2.6, ry: 2.2 },

    // Greenhouse clearing + building
    { op: 'rect', tile: 'grass', rect: { x: 15, y: 10, w: 20, h: 16 } },
    { op: 'rect', tile: 'greenhouse', rect: { x: 19, y: 12, w: 12, h: 8 } },
    { op: 'rect', tile: 'path', rect: { x: 24, y: 20, w: 3, h: 8 } },

    // Hidden yard behind the bramble
    { op: 'rect', tile: 'wildGrass', rect: { x: 37, y: 11, w: 9, h: 9 } },
    { op: 'rect', tile: 'overgrownPath', rect: { x: 33, y: 14, w: 5, h: 3 } },

    // Pond + canal
    { op: 'rect', tile: 'grass', rect: { x: 37, y: 29, w: 11, h: 17 } },
    { op: 'rect', tile: 'path', rect: { x: 35, y: 35, w: 3, h: 2 } },
    { op: 'ellipse', tile: 'water', cx: 42.5, cy: 36, rx: 4.5, ry: 4 },
    { op: 'rect', tile: 'water', rect: { x: 42, y: 39, w: 2, h: 27 } },
    { op: 'rect', tile: 'overgrownPath', rect: { x: 39, y: 45, w: 2, h: 13 } },

    // Workshop hut yard
    { op: 'rect', tile: 'grass', rect: { x: 2, y: 25, w: 11, h: 14 } },
    { op: 'rect', tile: 'hutWall', rect: { x: 4, y: 27, w: 6, h: 5 } },
    { op: 'rect', tile: 'path', rect: { x: 6, y: 32, w: 2, h: 5 } },
    { op: 'rect', tile: 'path', rect: { x: 6, y: 35, w: 9, h: 2 } },
    { op: 'rect', tile: 'overgrownPath', rect: { x: 5, y: 39, w: 2, h: 19 } },

    // Overgrown path south to the bus stop
    {
      op: 'path',
      tile: 'overgrownPath',
      width: 2,
      points: [
        { x: 22, y: 44 },
        { x: 22, y: 49 },
        { x: 18, y: 53 },
        { x: 18, y: 59 },
      ],
    },

    // Bus stop plaza + road
    { op: 'rect', tile: 'wildGrass', rect: { x: 4, y: 58, w: 42, h: 8 } },
    { op: 'rect', tile: 'paving', rect: { x: 12, y: 59, w: 18, h: 7 } },
    { op: 'rect', tile: 'road', rect: { x: 0, y: 66, w: 50, h: 3 } },
    { op: 'rect', tile: 'water', rect: { x: 42, y: 58, w: 2, h: 8 } },
  ],
  zones: [
    { id: 'garden', name: 'Hauptgarten', rect: { x: 14, y: 27, w: 22, h: 18 } },
    { id: 'greenhouse', name: 'Altes Gewächshaus', rect: { x: 15, y: 10, w: 20, h: 17 } },
    { id: 'greenhouse-yard', name: 'Verborgener Winkel', rect: { x: 35, y: 11, w: 11, h: 9 } },
    { id: 'pond', name: 'Teich', rect: { x: 35, y: 29, w: 13, h: 17 } },
    { id: 'canal', name: 'Am Kanal', rect: { x: 38, y: 46, w: 6, h: 12 } },
    { id: 'overgrown-path', name: 'Überwucherter Pfad', rect: { x: 15, y: 45, w: 10, h: 13 } },
    { id: 'bus-stop', name: 'Alte Bushaltestelle', rect: { x: 0, y: 58, w: 50, h: 11 } },
    { id: 'workshop-yard', name: 'Gartenhütte', rect: { x: 2, y: 25, w: 12, h: 14 } },
    { id: 'hut-trail', name: 'Schmaler Trampelpfad', rect: { x: 4, y: 39, w: 4, h: 19 } },
  ],
  obstacles: [
    {
      id: 'bramble-greenhouse-yard',
      blockedBy: 'bramble',
      removable: true,
      rect: { x: 34.5, y: 13.6, w: 2.4, h: 3.6 },
      name: 'Dornengestrüpp',
      hint: 'Undurchdringliche Brombeerranken. Vielleicht könnte eine andere Pflanze sich hindurchwinden …',
    },
    {
      id: 'fallen-tree-canal',
      blockedBy: 'fallenTree',
      removable: true,
      rect: { x: 38.6, y: 49, w: 2.8, h: 1.6 },
      name: 'Umgestürzter Baum',
      hint: 'Ein mächtiger Stamm liegt quer über dem Uferweg. Allein bewegst du ihn nicht.',
    },
    {
      id: 'tallgrass-hut-trail',
      blockedBy: 'tallGrass',
      removable: true,
      rect: { x: 4.6, y: 45.5, w: 2.8, h: 3.5 },
      name: 'Hohes Gras',
      hint: 'Mannshohes Gras, voller Zecken und Disteln. Hier kommst du so nicht durch.',
    },
  ],
  props: [
    { texture: 'greenhouse-door', at: { x: 25, y: 20 } },
    { texture: 'hut-roof', at: { x: 7, y: 30.4 } },
    { texture: 'hut-door', at: { x: 7, y: 32 } },
    { texture: 'sign', at: { x: 28.2, y: 33.2 }, solid: { x: 27.9, y: 32.8, w: 0.6, h: 0.4 } },
    { texture: 'bench', at: { x: 21, y: 32.4 }, solid: { x: 19.9, y: 31.6, w: 2.2, h: 0.8 } },
    { texture: 'bench', at: { x: 30, y: 39.6 }, solid: { x: 28.9, y: 38.8, w: 2.2, h: 0.8 }, flipX: true },
    { texture: 'well', at: { x: 41.5, y: 15.6 }, solid: { x: 40.7, y: 14.6, w: 1.6, h: 1 } },
    { texture: 'lily-pad', at: { x: 40.8, y: 35.2 }, ground: true },
    { texture: 'lily-pad', at: { x: 44, y: 37.4 }, scale: 0.8, ground: true },
    { texture: 'lily-pad', at: { x: 43, y: 33.6 }, scale: 0.9, ground: true },
    { texture: 'bus-shelter', at: { x: 20, y: 61.6 }, solid: { x: 18.1, y: 60.3, w: 3.8, h: 1.3 } },
    { texture: 'bus-sign', at: { x: 23.4, y: 62 }, solid: { x: 23.2, y: 61.6, w: 0.4, h: 0.4 } },
  ],
  interactables: [
    { id: 'sign-garden', type: 'dialogue', at: { x: 28.2, y: 33.4 }, label: 'Lesen', dialogueId: 'sign-garden' },
    {
      id: 'greenhouse-door',
      type: 'door',
      at: { x: 25, y: 20.3 },
      label: 'Öffnen',
      locked: true,
      unlockFlag: 'greenhouse-unlocked',
      lockedDialogueId: 'greenhouse-locked',
    },
    {
      id: 'workshop-door',
      type: 'door',
      at: { x: 7, y: 32.3 },
      label: 'Betreten',
      target: { mapId: 'workshop', spawn: 'entrance' },
    },
    { id: 'pond-edge', type: 'dialogue', at: { x: 38.6, y: 36.5 }, label: 'Ansehen', dialogueId: 'pond-edge' },
    { id: 'old-well', type: 'dialogue', at: { x: 41.5, y: 15.8 }, label: 'Ansehen', dialogueId: 'old-well' },
    { id: 'bus-stop-sign', type: 'dialogue', at: { x: 23.4, y: 62.2 }, label: 'Lesen', dialogueId: 'bus-stop-sign' },
  ],
  spawns: {
    default: { x: 25.5, y: 31 },
    'workshop-door': { x: 7, y: 33.4 },
    'greenhouse-door': { x: 25, y: 21.6 },
  },
};
