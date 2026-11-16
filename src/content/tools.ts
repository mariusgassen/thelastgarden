import type { ToolDef } from './types';

/**
 * Tools of the tool mode (systems/tools.ts). Each is also an `ItemDef` with `category: 'tool'`
 * and a workbench recipe; none is ever used up. Order = order in the tool bar.
 */
export const TOOLS: ToolDef[] = [
  {
    id: 'tool-sickle',
    kind: 'sickle',
    hint: 'Erntet alles Reife und sammelt Holz, Steine und Funde ringsum auf einmal.',
    reachTiles: 3.2,
  },
  {
    id: 'tool-shovel',
    kind: 'shovel',
    hint: 'Gräbt eine Pflanze aus und legt ihren Samen zurück in den Beutel.',
    reachTiles: 3.2,
  },
  {
    id: 'tool-satchel',
    kind: 'satchel',
    hint: 'Sät die gewählte Sorte in alle freien Beete ringsum.',
    reachTiles: 4,
  },
  {
    id: 'tool-pole-lantern',
    kind: 'light',
    hint: 'Leuchtet, wohin du gehst, und drängt die Welke um dich zurück.',
    lightRadius: 130,
    pushBackTiles: 2.4,
  },
];
