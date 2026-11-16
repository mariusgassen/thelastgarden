import type { PlantDef } from './types';

/**
 * `clears` lets any mature plant of the species open matching obstacles. Brambles are the
 * exception: each one needs its own crafted cutting (see systems/plants.ts).
 */
export const PLANTS: PlantDef[] = [
  {
    id: 'bramble-vine',
    name: 'Brombeerranke',
    description: 'Eine zähe Ranke, die sich durch dichtes Gestrüpp windet.',
    seedItemId: 'seed-bramble-vine',
    produceItemId: 'produce-tendril',
    growthStages: 3,
    abilityId: 'weave-through-brambles',
    color: 0x6b2e4a,
  },
  {
    id: 'glow-lily',
    name: 'Leuchtlilie',
    description: 'Ihre Blüten speichern Sonnenlicht und leuchten im Dunkeln.',
    seedItemId: 'seed-glow-lily',
    produceItemId: 'produce-light-pollen',
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
    produceItemId: 'produce-scent-bundle',
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
    clears: ['denseFog'],
    abilityId: 'awaken-heart',
    color: 0x7ae7c7,
    lightRadius: 180,
  },
  {
    id: 'night-violet',
    name: 'Nachtviole',
    description: 'Duftende Blüten aus der Alten Mühle, deren blauer Schimmer Bienen und Nachtfalter selbst am kühlen Hügel weckt.',
    seedItemId: 'seed-night-violet',
    produceItemId: 'produce-nectar',
    growthStages: 3,
    abilityId: 'call-pollinators',
    color: 0x6f7bf7,
    lightRadius: 130,
  },
  {
    id: 'hollyhock',
    name: 'Stockrose',
    description: 'Eine stolze Bauerngartenblume aus dem alten Erlenbrück. Ihre rosafarbenen Blüten leuchten wie kleine Laternen entlang der Dorfwege.',
    seedItemId: 'seed-hollyhock',
    produceItemId: 'produce-seed-pod',
    growthStages: 3,
    abilityId: 'tower-bloom',
    color: 0xe8739c,
    lightRadius: 90,
  },
];
