import type { MapDef } from '../types';

/**
 * Misty ridge path climbing north of the Water Tower toward the old orchards (38 × 26 tiles).
 */
export const HILL_PATH_MAP: MapDef = {
  id: 'hill-path',
  name: 'Hügelpfad · Im Nebel',
  width: 38,
  height: 26,
  baseTile: 'forest',
  backgroundColor: 0x182321,
  decorate: { trees: true, flowers: true, seed: 3023 },
  layout: [
    // Southern trailhead up from the Water Tower
    { op: 'rect', tile: 'overgrownPath', rect: { x: 8, y: 17, w: 3, h: 9 } },
    { op: 'rect', tile: 'wildGrass', rect: { x: 5, y: 10, w: 12, h: 9 } },
    { op: 'rect', tile: 'grass', rect: { x: 7, y: 11, w: 8, h: 6 } },
    { op: 'rect', tile: 'paving', rect: { x: 8, y: 12, w: 5, h: 3 } },

    // Narrow misty ridge chokepoint (forest flanks y=11 and y=15, sealed by fog-hill-ridge)
    { op: 'rect', tile: 'overgrownPath', rect: { x: 15, y: 12, w: 10, h: 3 } },

    // Upper ridge terrace and northern descent to the Orchard
    { op: 'rect', tile: 'grass', rect: { x: 22, y: 5, w: 12, h: 12 } },
    { op: 'rect', tile: 'soil', rect: { x: 25, y: 12, w: 4, h: 2 } },
    { op: 'rect', tile: 'overgrownPath', rect: { x: 29, y: 0, w: 3, h: 8 } },

    // Hidden sunlit nook west of the upper terrace (behind tallgrass-hill-nook)
    { op: 'rect', tile: 'wildGrass', rect: { x: 16, y: 5, w: 8, h: 3 } },
    { op: 'rect', tile: 'grass', rect: { x: 6, y: 3, w: 10, h: 6 } },
    { op: 'rect', tile: 'soil', rect: { x: 7, y: 4, w: 2, h: 2 } },
  ],
  zones: [
    { id: 'hill-south', name: 'Hügelpfad · Südhang', rect: { x: 0, y: 10, w: 19, h: 16 } },
    { id: 'hill-crest', name: 'Nebelkamm', rect: { x: 19, y: 0, w: 19, h: 26 } },
  ],
  obstacles: [
    {
      id: 'fog-hill-ridge',
      blockedBy: 'denseFog',
      removable: true,
      rect: { x: 18.2, y: 11.8, w: 2.8, h: 3.4 },
      name: 'Dichte Nebelbank',
      hint: 'Undurchdringlicher Nebel liegt auf dem Kamm. Ohne das silberne Licht des Mondfarns verliert man hier sofort den Weg.',
    },
    {
      id: 'tallgrass-hill-nook',
      blockedBy: 'tallGrass',
      removable: true,
      rect: { x: 16.2, y: 4.8, w: 2.6, h: 3.4 },
      name: 'Hohes Berggras',
      hint: 'Mannshohes Gras voller Zecken versperrt den Seitenpfad. Ein reifer Lavendel im Garten beruhigt die Tiere.',
    },
  ],
  props: [
    { texture: 'hill-lantern', at: { x: 10.5, y: 12.6 }, solid: { x: 9.9, y: 11.9, w: 1.2, h: 0.7 } },
    { texture: 'waystone', at: { x: 13.8, y: 14.5 }, solid: { x: 13.2, y: 13.8, w: 1.2, h: 0.6 } },
    { texture: 'bench', at: { x: 26.5, y: 8.6 }, solid: { x: 25.4, y: 7.8, w: 2.2, h: 0.8 } },
    { texture: 'bench', at: { x: 13.5, y: 4.4 }, solid: { x: 12.4, y: 3.6, w: 2.2, h: 0.8 }, flipX: true },
    { texture: 'waystone', at: { x: 32.2, y: 5.5 }, solid: { x: 31.6, y: 4.8, w: 1.2, h: 0.6 } },
    { texture: 'signpost-north', at: { x: 28, y: 5.5 } },
  ],
  interactables: [
    {
      id: 'hill-to-tower',
      type: 'door',
      at: { x: 9.5, y: 24.4 },
      label: 'Zum Wasserturm',
      target: { mapId: 'water-tower', spawn: 'north' },
    },
    {
      id: 'hill-lantern',
      type: 'dialogue',
      at: { x: 10.5, y: 12.9 },
      label: 'Ansehen',
      dialogueId: 'hill-lantern',
    },
    {
      id: 'bench-hill-crest',
      type: 'rest',
      at: { x: 26.5, y: 8.8 },
      label: 'Ausruhen',
      message: 'Du ruhst dich auf der Bank am Nebelkamm aus, bis der Morgen anbricht.',
    },
    {
      id: 'bench-hill-nook',
      type: 'rest',
      at: { x: 13.5, y: 4.6 },
      label: 'Ausruhen',
      message: 'Du ruhst dich auf der sonnigen Lichtung hinter dem Hügel aus, bis der Morgen anbricht.',
    },
    {
      id: 'hill-cairn',
      type: 'dialogue',
      at: { x: 32.2, y: 5.8 },
      label: 'Lesen',
      dialogueId: 'hill-cairn',
    },
    {
      id: 'hill-to-orchard',
      type: 'door',
      at: { x: 30.5, y: 1.4 },
      label: 'Zu den Obstwiesen',
      target: { mapId: 'orchard', spawn: 'south' },
      radius: 64,
    },
  ],
  npcs: [{ npcId: 'crow', at: { x: 13.8, y: 13.9 }, radius: 70, wander: 2, showWhenFlag: 'episode-2-complete', hideWhenFlag: 'crow-orchard-talked' }],
  plantingBeds: [
    { id: 'bed-hill-extra', rect: { x: 25, y: 12, w: 4, h: 2 } },
    { id: 'bed-hill-nook', rect: { x: 7, y: 4, w: 2, h: 2 } },
  ],
  resourceNodes: [
    { id: 'hill-seed-thornroot', itemId: 'seed-thornroot', at: { x: 14.5, y: 14 }, label: 'Samen einsammeln' },
    { id: 'sun-hill-1', itemId: 'resource-sunlight', at: { x: 8, y: 16 }, label: 'Sonnenlicht sammeln', respawnMs: 45_000 },
    { id: 'sun-hill-nook', itemId: 'resource-sunlight', at: { x: 8.5, y: 7.5 }, label: 'Sonnenlicht sammeln', respawnMs: 45_000 },
    { id: 'dew-hill-1', itemId: 'resource-dew', at: { x: 23, y: 10 }, label: 'Tau sammeln', respawnMs: 45_000 },
    { id: 'curio-hill-1', itemId: 'resource-curio', at: { x: 10, y: 5.8 }, label: 'Aufheben' },
    { id: 'hill-seed-lavender', itemId: 'seed-lavender', at: { x: 12, y: 6.2 }, label: 'Samen einsammeln' },
  ],
  spawns: {
    default: { x: 9.5, y: 22.8 },
    south: { x: 9.5, y: 22.8 },
    north: { x: 30.5, y: 2.8 },
  },
};
