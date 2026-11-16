import type { MapDef } from '../types';

/**
 * Water Tower hilltop at the edge of Erlenbrück (32 × 28 tiles).
 * Home to the Barn Owl, the old cistern valve feeding the greenhouse, and a lookout over town.
 */
export const WATER_TOWER_MAP: MapDef = {
  id: 'water-tower',
  name: 'Am Wasserturm',
  width: 32,
  height: 28,
  baseTile: 'forest',
  backgroundColor: 0x1a2528,
  decorate: { trees: true, flowers: true, seed: 3011 },
  layout: [
    { op: 'rect', tile: 'rails', rect: { x: 0, y: 13, w: 7, h: 2 } },
    { op: 'rect', tile: 'overgrownPath', rect: { x: 0, y: 14, w: 8, h: 2 } },
    { op: 'rect', tile: 'grass', rect: { x: 7, y: 6, w: 20, h: 16 } },
    { op: 'rect', tile: 'paving', rect: { x: 10, y: 9, w: 14, h: 10 } },
    { op: 'rect', tile: 'brickWall', rect: { x: 14, y: 6, w: 4, h: 3 } },
    { op: 'rect', tile: 'soil', rect: { x: 20, y: 15, w: 4, h: 2 } },
    { op: 'rect', tile: 'paving', rect: { x: 24, y: 11, w: 5, h: 7 } },
    // Northern ridge trail toward Hill Path (unlocked once Episode 2 completes)
    { op: 'rect', tile: 'grass', rect: { x: 19, y: 4, w: 5, h: 3 } },
    { op: 'rect', tile: 'overgrownPath', rect: { x: 20, y: 0, w: 3, h: 7 } },
  ],
  zones: [{ id: 'water-tower-plaza', name: 'Am Wasserturm', rect: { x: 0, y: 0, w: 32, h: 28 } }],
  obstacles: [],
  props: [
    { texture: 'water-tower', at: { x: 16, y: 10 }, solid: { x: 14.2, y: 6.8, w: 3.6, h: 3.0 } },
    {
      texture: 'tower-cistern',
      at: { x: 11.5, y: 14 },
      solid: { x: 10.5, y: 12.8, w: 2, h: 1 },
      hideWhenFlag: 'tower-cistern-repaired',
    },
    {
      texture: 'tower-cistern-fixed',
      at: { x: 11.5, y: 14 },
      showWhenFlag: 'tower-cistern-repaired',
    },
    { texture: 'stump', at: { x: 8.5, y: 14.5 }, solid: { x: 8, y: 13.9, w: 1, h: 0.6 } },
    { texture: 'signpost-north', at: { x: 23.4, y: 5.5 } },
    { texture: 'railing', at: { x: 27.6, y: 13.5 }, solid: { x: 26.2, y: 12.7, w: 2.8, h: 0.6 } },
    { texture: 'railing', at: { x: 27.6, y: 16.5 }, solid: { x: 26.2, y: 15.7, w: 2.8, h: 0.6 } },
    { texture: 'bench', at: { x: 25.5, y: 11.8 }, solid: { x: 24.4, y: 11, w: 2.2, h: 0.7 } },
  ],
  interactables: [
    {
      id: 'tower-to-tramline',
      type: 'door',
      at: { x: 1.5, y: 14 },
      label: 'Zur Trasse',
      target: { mapId: 'tramline', spawn: 'east' },
    },
    {
      id: 'water-tower-sign-north',
      type: 'dialogue',
      at: { x: 23.4, y: 5.8 },
      label: 'Lesen',
      dialogueId: 'tower-sign-north',
    },
    {
      id: 'tower-to-hill',
      type: 'door',
      at: { x: 21.5, y: 1.4 },
      label: 'Zum Hügelpfad',
      locked: true,
      unlockFlag: 'episode-2-complete',
      lockedDialogueId: 'hill-path-locked',
      target: { mapId: 'hill-path', spawn: 'south' },
      radius: 64,
    },
    {
      id: 'water-tower-door',
      type: 'dialogue',
      at: { x: 16, y: 9.9 },
      label: 'Ansehen',
      dialogueId: 'water-tower-door',
      radius: 64,
    },
    {
      id: 'tower-cistern',
      type: 'repair',
      at: { x: 11.5, y: 14.2 },
      label: 'Reparieren',
      radius: 64,
      doneFlag: 'tower-cistern-repaired',
      cost: [
        { itemId: 'craft-valve-seal', count: 1 },
        { itemId: 'resource-sunlight', count: 2 },
        { itemId: 'resource-curio', count: 1 },
      ],
      missingDialogueId: 'cistern-missing',
      repairedDialogueId: 'cistern-repaired',
      doneDialogueId: 'cistern-done',
    },
    {
      id: 'tower-vista',
      type: 'dialogue',
      at: { x: 27.6, y: 14.8 },
      label: 'Aussicht',
      dialogueId: 'tower-vista',
      radius: 60,
    },
  ],
  npcs: [
    { npcId: 'crow', at: { x: 8.5, y: 14 }, radius: 70, showWhenFlag: 'episode-1-complete', hideWhenFlag: 'greenhouse-inner-unlocked' },
    { npcId: 'owl', at: { x: 16, y: 10.5 }, radius: 72 },
  ],
  journalPages: [
    {
      id: 'page-tower',
      at: { x: 25.5, y: 14.8 },
      dialogueId: 'journal-page-tower',
      appearsWhenFlag: 'owl-met',
      itemId: 'journal-page-tower',
    },
  ],
  plantingBeds: [{ id: 'bed-tower-lily', rect: { x: 20, y: 15, w: 4, h: 2 }, plantId: 'glow-lily' }],
  resourceNodes: [
    { id: 'tower-seed-lily', itemId: 'seed-glow-lily', at: { x: 19, y: 18 }, label: 'Zwiebel einsammeln' },
    { id: 'sun-tower-1', itemId: 'resource-sunlight', at: { x: 11, y: 20 }, label: 'Sonnenlicht sammeln', respawnMs: 45_000 },
    { id: 'dew-tower-1', itemId: 'resource-dew', at: { x: 22, y: 9 }, label: 'Tau sammeln', respawnMs: 45_000 },
    { id: 'curio-tower-1', itemId: 'resource-curio', at: { x: 9, y: 9 }, label: 'Aufheben' },
  ],
  spawns: {
    default: { x: 3, y: 14 },
    west: { x: 3, y: 14 },
    north: { x: 21.5, y: 2.8 },
  },
};
