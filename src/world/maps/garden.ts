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
      hint: 'Undurchdringliche Brombeerranken. Vielleicht könnte sich ein junger Steckling hindurchwinden …',
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
    { texture: 'greenhouse-door', at: { x: 25, y: 20 }, hideWhenFlag: 'greenhouse-unlocked' },
    { texture: 'greenhouse-door-open', at: { x: 25, y: 20 }, showWhenFlag: 'greenhouse-unlocked' },
    { texture: 'hut-roof', at: { x: 7, y: 30.4 } },
    { texture: 'hut-door', at: { x: 7, y: 32 } },
    { texture: 'stump', at: { x: 11.5, y: 34.8 }, solid: { x: 11, y: 34.2, w: 1, h: 0.6 } },
    { texture: 'sign', at: { x: 28.2, y: 33.2 }, solid: { x: 27.9, y: 32.8, w: 0.6, h: 0.4 } },
    { texture: 'bench', at: { x: 21, y: 32.4 }, solid: { x: 19.9, y: 31.6, w: 2.2, h: 0.8 } },
    { texture: 'bench', at: { x: 30, y: 39.6 }, solid: { x: 28.9, y: 38.8, w: 2.2, h: 0.8 }, flipX: true },
    { texture: 'well', at: { x: 41.5, y: 15.6 }, solid: { x: 40.7, y: 14.6, w: 1.6, h: 1 } },
    { texture: 'lily-pad', at: { x: 40.8, y: 35.2 }, ground: true },
    { texture: 'lily-pad', at: { x: 44, y: 37.4 }, scale: 0.8, ground: true },
    { texture: 'lily-pad', at: { x: 43, y: 33.6 }, scale: 0.9, ground: true },
    { texture: 'bus-shelter', at: { x: 20, y: 61.6 }, solid: { x: 18.1, y: 60.3, w: 3.8, h: 1.3 } },
    { texture: 'bus-sign', at: { x: 23.4, y: 62 }, solid: { x: 23.2, y: 61.6, w: 0.4, h: 0.4 } },
    { texture: 'signpost-east', at: { x: 48.8, y: 65.8 } },
    { texture: 'feather', at: { x: 11.5, y: 34.3 }, showWhenFlag: 'episode-1-complete', hideWhenFlag: 'water-tower-crow-met' },

    // The village plaza, restored by q-village-plaza (content/village.ts).
    { texture: 'village-bakery', at: { x: 27.6, y: 61.4 }, solid: { x: 25.7, y: 59.9, w: 3.8, h: 1.4 }, showWhenFlag: 'village-restored:plaza' },
    { texture: 'village-stall', at: { x: 14.6, y: 61.6 }, solid: { x: 13.4, y: 60.6, w: 2.4, h: 0.9 }, showWhenFlag: 'village-restored:plaza' },
    { texture: 'village-lamp', at: { x: 12.4, y: 60.2 }, solid: { x: 12.2, y: 59.8, w: 0.4, h: 0.3 }, showWhenFlag: 'village-restored:plaza' },
    { texture: 'village-lamp', at: { x: 12.4, y: 65.2 }, solid: { x: 12.2, y: 64.8, w: 0.4, h: 0.3 }, showWhenFlag: 'village-restored:plaza' },
    { texture: 'village-lamp', at: { x: 29.4, y: 65.2 }, solid: { x: 29.2, y: 64.8, w: 0.4, h: 0.3 }, showWhenFlag: 'village-restored:plaza' },
    { texture: 'village-lamp', at: { x: 24.2, y: 59.8 }, solid: { x: 24, y: 59.4, w: 0.4, h: 0.3 }, showWhenFlag: 'village-restored:plaza' },
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
      keyItemId: 'greenhouse-key',
      unlockedDialogueId: 'greenhouse-unlock',
      target: { mapId: 'greenhouse-vestibule', spawn: 'entrance' },
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
    {
      id: 'crow-stump-note',
      type: 'dialogue',
      at: { x: 11.5, y: 34.5 },
      label: 'Ansehen',
      dialogueId: 'crow-stump-note',
      showWhenFlag: 'episode-1-complete',
      hideWhenFlag: 'water-tower-crow-met',
      radius: 66,
    },
    {
      id: 'tramline-exit',
      type: 'door',
      at: { x: 48.5, y: 67.5 },
      label: 'Zur Trasse',
      locked: true,
      unlockFlag: 'episode-1-complete',
      lockedDialogueId: 'tramline-locked',
      target: { mapId: 'tramline', spawn: 'west' },
      radius: 64,
    },
    {
      id: 'village-bakery-door',
      type: 'dialogue',
      at: { x: 27.6, y: 61.8 },
      label: 'Ansehen',
      dialogueId: 'village-plaza-bakery',
      showWhenFlag: 'village-restored:plaza',
    },
    {
      id: 'village-market-stall',
      type: 'dialogue',
      at: { x: 14.6, y: 62.1 },
      label: 'Ansehen',
      dialogueId: 'village-plaza-stall',
      showWhenFlag: 'village-restored:plaza',
    },
  ],
  // The 3 "verwilderte Beete" Quest 3 (Wave 3) restores, plus one open bed. See
  // ARCHITECTURE.md § Plant Abilities for how Wave 3 should check restoration.
  plantingBeds: [
    { id: 'bed-bramble', rect: { x: 16, y: 29, w: 4, h: 2 }, plantId: 'bramble-vine' },
    { id: 'bed-lily', rect: { x: 30, y: 29, w: 4, h: 2 }, plantId: 'glow-lily' },
    { id: 'bed-lavender', rect: { x: 16, y: 41, w: 4, h: 2 }, plantId: 'lavender' },
    { id: 'bed-extra', rect: { x: 30, y: 41, w: 4, h: 2 } },
  ],
  resourceNodes: [
    { id: 'garden-seed-honeyberry', itemId: 'seed-honeyberry', at: { x: 36.5, y: 33.5 }, label: 'Samen einsammeln' },
    { id: 'garden-seed-gold-turnip', itemId: 'seed-gold-turnip', at: { x: 13.5, y: 44.5 }, label: 'Samen einsammeln' },
    // Sonnenlicht — sunny open spots, respawn.
    { id: 'sun-1', itemId: 'resource-sunlight', at: { x: 17, y: 22 }, label: 'Sonnenlicht sammeln', respawnMs: 45_000 },
    { id: 'sun-2', itemId: 'resource-sunlight', at: { x: 20, y: 34 }, label: 'Sonnenlicht sammeln', respawnMs: 45_000 },
    { id: 'sun-3', itemId: 'resource-sunlight', at: { x: 10, y: 61 }, label: 'Sonnenlicht sammeln', respawnMs: 45_000 },
    // Tau — near water and wild grass, respawn.
    { id: 'dew-1', itemId: 'resource-dew', at: { x: 38, y: 31 }, label: 'Tau sammeln', respawnMs: 45_000 },
    { id: 'dew-2', itemId: 'resource-dew', at: { x: 44, y: 17 }, label: 'Tau sammeln', respawnMs: 45_000 },
    { id: 'dew-3', itemId: 'resource-dew', at: { x: 11, y: 35 }, label: 'Tau sammeln', respawnMs: 45_000 },
    // Fundstücke — tucked into corners, including places only reachable after an obstacle clears. One-time.
    { id: 'curio-1', itemId: 'resource-curio', at: { x: 41, y: 14 }, label: 'Aufheben' },
    { id: 'curio-2', itemId: 'resource-curio', at: { x: 18, y: 56 }, label: 'Aufheben' },
    { id: 'curio-3', itemId: 'resource-curio', at: { x: 6, y: 50 }, label: 'Aufheben' },
    // Samen — one-time, 2 per species, placed near the obstacle each plant eventually clears.
    { id: 'seed-bramble-1', itemId: 'seed-bramble-vine', at: { x: 33, y: 22 }, label: 'Samen einsammeln' },
    { id: 'seed-bramble-2', itemId: 'seed-bramble-vine', at: { x: 17, y: 12 }, label: 'Samen einsammeln' },
    { id: 'seed-lily-1', itemId: 'seed-glow-lily', at: { x: 45, y: 32 }, label: 'Samen einsammeln' },
    { id: 'seed-lily-2', itemId: 'seed-glow-lily', at: { x: 39, y: 42 }, label: 'Samen einsammeln' },
    { id: 'seed-lavender-1', itemId: 'seed-lavender', at: { x: 9, y: 33 }, label: 'Samen einsammeln' },
    { id: 'seed-lavender-2', itemId: 'seed-lavender', at: { x: 3, y: 36 }, label: 'Samen einsammeln' },
    // Piles to chop, dig and salvage: raw material for build mode (systems/building.ts).
    { id: 'wood-garden-1', itemId: 'mat-wood', at: { x: 34.5, y: 28.5 }, label: 'Holz hacken', respawnMs: 60_000, texture: 'node-wood', count: 2 },
    { id: 'wood-garden-2', itemId: 'mat-wood', at: { x: 15, y: 38.5 }, label: 'Holz hacken', respawnMs: 60_000, texture: 'node-wood', count: 2 },
    { id: 'wood-garden-3', itemId: 'mat-wood', at: { x: 33, y: 60.5 }, label: 'Holz hacken', respawnMs: 60_000, texture: 'node-wood', count: 2 },
    { id: 'stone-garden-1', itemId: 'mat-stone', at: { x: 38.5, y: 44 }, label: 'Steine ausgraben', respawnMs: 60_000, texture: 'node-stone' },
    { id: 'stone-garden-2', itemId: 'mat-stone', at: { x: 3.5, y: 30.5 }, label: 'Steine ausgraben', respawnMs: 60_000, texture: 'node-stone' },
    { id: 'scrap-garden-1', itemId: 'mat-scrap', at: { x: 27, y: 64.5 }, label: 'Schrott bergen', respawnMs: 60_000, texture: 'node-scrap' },
    { id: 'scrap-garden-2', itemId: 'mat-scrap', at: { x: 10.5, y: 27.5 }, label: 'Schrott bergen', respawnMs: 60_000, texture: 'node-scrap' },
  ],
  // The crow perches on the stump until Episode 1 completes; in Episode 4 all friends gather on the central plaza.
  npcs: [
    { npcId: 'crow', at: { x: 11.5, y: 34.3 }, radius: 70, hideWhenFlag: 'episode-1-complete' },
    { npcId: 'crow', at: { x: 22.5, y: 35.2 }, radius: 64, showWhenFlag: 'jakob-ready-to-return' },
    { npcId: 'm', at: { x: 24.8, y: 36.2 }, radius: 70, showWhenFlag: 'jakob-ready-to-return' },
    { npcId: 'jakob', at: { x: 27.6, y: 36.2 }, radius: 70, showWhenFlag: 'jakob-ready-to-return' },
    { npcId: 'hanne', at: { x: 25.4, y: 63.6 }, radius: 68, showWhenFlag: 'village-open:plaza' },
    { npcId: 'piet', at: { x: 17.2, y: 64.6 }, radius: 68, showWhenFlag: 'village-open:plaza' },
  ],
  // One journal page per restored bed, lying right next to it (see systems/journal.ts).
  journalPages: [
    {
      id: 'page-bramble',
      at: { x: 21.3, y: 30.4 },
      dialogueId: 'journal-page-bramble',
      appearsWhenFlag: 'bed-restored:bed-bramble',
      itemId: 'journal-page-bramble',
    },
    {
      id: 'page-lily',
      at: { x: 28.8, y: 30.4 },
      dialogueId: 'journal-page-lily',
      appearsWhenFlag: 'bed-restored:bed-lily',
      itemId: 'journal-page-lily',
    },
    {
      id: 'page-lavender',
      at: { x: 21.3, y: 42.4 },
      dialogueId: 'journal-page-lavender',
      appearsWhenFlag: 'bed-restored:bed-lavender',
      itemId: 'journal-page-lavender',
    },
  ],
  // Where the blight grows from once Episode 1 is done (systems/blight.ts).
  blightHearts: [
    { id: 'heart-plaza', at: { x: 7, y: 62 }, reach: 6 },
    { id: 'heart-pond', at: { x: 46, y: 43 }, reach: 6 },
    { id: 'heart-clearing', at: { x: 16, y: 11 }, reach: 7 },
  ],
  spawns: {
    default: { x: 25.5, y: 31 },
    'workshop-door': { x: 7, y: 33.4 },
    'greenhouse-door': { x: 25, y: 21.6 },
    tramline: { x: 47.2, y: 67.5 },
  },
};
