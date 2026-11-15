import type { QuestDef } from './types';

/**
 * Episode 1 quest chain. Objectives are evaluated by systems/quests.ts purely from save
 * state (flags, inventory, zones, unblocked paths), so nothing here needs extra bookkeeping.
 * The chain: q-meet-crow → q-restore-beds (+ q-journal-pages as pages appear) → q-greenhouse.
 * Finishing q-greenhouse sets `episode-1-complete`.
 */
export const QUESTS: QuestDef[] = [
  {
    id: 'q-meet-crow',
    title: 'Ein Rascheln im Geäst',
    summary: 'Irgendetwas beobachtet dich von der Gartenhütte aus.',
    autoStart: true,
    objectives: [
      {
        type: 'flag',
        flag: 'crow-met',
        description: 'Sieh nach, wer dich bei der Gartenhütte beobachtet.',
        markers: ['npc:crow'],
      },
    ],
  },
  {
    id: 'q-restore-beds',
    title: 'Drei verwilderte Beete',
    summary: 'Die Krähe will, dass du die drei alten Beete wieder zum Blühen bringst. Samen liegen im Garten verstreut.',
    startsWhen: ['crow-met'],
    objectives: [
      {
        type: 'flag',
        flag: 'bed-restored:bed-bramble',
        description: 'Pflanze Brombeerranken ins nordwestliche Beet und lass sie reifen.',
        markers: ['bed:bed-bramble', 'resource:seed-bramble-1', 'resource:seed-bramble-2'],
      },
      {
        type: 'flag',
        flag: 'bed-restored:bed-lily',
        description: 'Pflanze eine Leuchtlilie ins nordöstliche Beet und lass sie reifen.',
        markers: ['bed:bed-lily', 'resource:seed-lily-1', 'resource:seed-lily-2'],
      },
      {
        type: 'flag',
        flag: 'bed-restored:bed-lavender',
        description: 'Pflanze Lavendel ins südwestliche Beet und lass ihn reifen.',
        markers: ['bed:bed-lavender', 'resource:seed-lavender-1', 'resource:seed-lavender-2'],
      },
    ],
  },
  {
    id: 'q-journal-pages',
    title: 'Seiten eines Tagebuchs',
    summary: 'Zwischen den wiederhergestellten Beeten tauchen vergilbte Seiten auf — in der Handschrift der früheren Gärtnerin.',
    startsWhen: ['bed-restored:bed-bramble', 'bed-restored:bed-lily', 'bed-restored:bed-lavender'],
    objectives: [
      {
        type: 'flag',
        flag: 'journal-read:page-bramble',
        description: 'Lies die Seite beim Brombeerbeet.',
        markers: ['journal:page-bramble'],
      },
      {
        type: 'flag',
        flag: 'journal-read:page-lily',
        description: 'Lies die Seite beim Lilienbeet.',
        markers: ['journal:page-lily'],
      },
      {
        type: 'flag',
        flag: 'journal-read:page-lavender',
        description: 'Lies die Seite beim Lavendelbeet.',
        markers: ['journal:page-lavender'],
      },
    ],
  },
  {
    id: 'q-greenhouse',
    title: 'Was hinter dem Glas wartet',
    summary: 'Die Gärtnerin hat der Krähe etwas anvertraut. Und das Gewächshaus wartet seit Jahren auf jemanden, der die Beete versteht.',
    startsWhen: ['quest-completed:q-journal-pages'],
    objectives: [
      {
        type: 'flag',
        flag: 'crow-gave-key',
        description: 'Erzähl der Krähe von den Seiten.',
        markers: ['npc:crow'],
      },
      {
        type: 'flag',
        flag: 'greenhouse-unlocked',
        description: 'Öffne die Tür des Gewächshauses.',
        markers: ['greenhouse-door'],
      },
      {
        type: 'flag',
        flag: 'greenhouse-hint-read',
        description: 'Sieh dir den Plan an der Wand im Vorraum an.',
        markers: ['greenhouse-door', 'map-board'],
      },
    ],
    rewardFlags: ['episode-1-complete'],
  },
];
