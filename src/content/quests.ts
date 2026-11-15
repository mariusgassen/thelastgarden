import type { QuestDef } from './types';

/** Placeholder quest; the quest system itself arrives in Wave 3. */
export const QUESTS: QuestDef[] = [
  {
    id: 'q-first-steps',
    title: 'Ein verwildertes Erbe',
    summary: 'Sieh dich im alten Garten um.',
    objectives: [
      { type: 'visitZone', zoneId: 'pond', description: 'Finde den alten Teich.' },
      { type: 'visitZone', zoneId: 'bus-stop', description: 'Folge dem Pfad zur Bushaltestelle.' },
      { type: 'visitZone', zoneId: 'workshop', description: 'Betritt die Gartenhütte.' },
    ],
    rewardFlags: ['explored-garden'],
  },
];
