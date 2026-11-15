import type { PlantDef } from './types';

/** Abilities are NOT implemented in Wave 1 — `clears`/`abilityId` are hooks for Wave 2. */
export const PLANTS: PlantDef[] = [
  {
    id: 'bramble-vine',
    name: 'Brombeerranke',
    description: 'Eine zähe Ranke, die sich durch dichtes Gestrüpp windet.',
    seedItemId: 'seed-bramble-vine',
    growthStages: 3,
    clears: ['bramble'],
    abilityId: 'weave-through-brambles',
    color: 0x6b2e4a,
  },
  {
    id: 'glow-lily',
    name: 'Leuchtlilie',
    description: 'Ihre Blüten speichern Sonnenlicht und leuchten im Dunkeln.',
    seedItemId: 'seed-glow-lily',
    growthStages: 3,
    abilityId: 'emit-light',
    color: 0xf3e38a,
    lightRadius: 150,
  },
  {
    id: 'lavender',
    name: 'Lavendel',
    description: 'Ein beruhigender Duft, der Tiere anlockt.',
    seedItemId: 'seed-lavender',
    growthStages: 2,
    clears: ['tallGrass'],
    abilityId: 'calm-animals',
    color: 0x9b84d6,
  },
  {
    id: 'moon-fern',
    name: 'Mondfarn',
    description: 'Ein uralter Farn aus dem Herzraum, dessen Wedel wie stilles Wasser im Mondlicht schimmern.',
    seedItemId: 'seed-moon-fern',
    growthStages: 3,
    abilityId: 'awaken-heart',
    color: 0x7ae7c7,
    lightRadius: 180,
  },
];
