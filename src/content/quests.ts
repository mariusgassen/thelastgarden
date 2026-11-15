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
  // ── Episode 2: Linie 3, Wasserturm & Das Herz des Gewächshauses ─────────
  {
    id: 'q-canal-path',
    title: 'Der versperrte Uferweg',
    summary: 'Am Kanal liegt ein alter Stamm quer über dem Pfad. Vielleicht liegt in der Werkstatt noch Werkzeug.',
    startsWhen: ['episode-1-complete'],
    objectives: [
      {
        type: 'flag',
        flag: 'saw-found',
        description: 'Sieh in der Werkstatt nach einem Werkzeug für den umgestürzten Baum.',
        markers: ['workshop-door', 'workbench'],
      },
      {
        type: 'unblock',
        obstacleId: 'fallen-tree-canal',
        description: 'Räume den umgestürzten Baum am Kanal aus dem Weg.',
        markers: ['obstacle:fallen-tree-canal'],
      },
    ],
    rewardItems: [
      { itemId: 'resource-curio', count: 1 },
      { itemId: 'seed-glow-lily', count: 1 },
    ],
  },
  {
    id: 'q-tramline',
    title: 'Linie 3',
    summary: 'Die Spur auf dem Stadtplan führt nach Osten: über die alte Straßenbahntrasse bis zum Wasserturm. Die Krähe ist schon vorausgeflogen.',
    startsWhen: ['episode-1-complete'],
    objectives: [
      {
        type: 'visitZone',
        zoneId: 'tram-tracks',
        description: 'Folge der Straße östlich der Bushaltestelle zur alten Trasse.',
        markers: ['tramline-exit'],
      },
      {
        type: 'unblock',
        obstacleId: 'bramble-tram-switch',
        description: 'Öffne einen Weg durch das Dornengestrüpp auf den Gleisen.',
        markers: ['obstacle:bramble-tram-switch', 'bed:bed-tram-bramble', 'resource:tram-seed-bramble'],
      },
      {
        type: 'visitZone',
        zoneId: 'water-tower-plaza',
        description: 'Gehe die Trasse weiter nach Osten bis zum Wasserturm.',
        markers: ['tramline-to-tower'],
      },
    ],
  },
  {
    id: 'q-water-tower',
    title: 'Der Wasserturm am Stadtrand',
    summary: 'Hier endet Linie 3. Finde heraus, was M. am Wasserturm über die Stadt und die alte Wasserleitung erfahren hat.',
    startsWhen: ['quest-completed:q-tramline'],
    objectives: [
      {
        type: 'flag',
        flag: 'water-tower-crow-met',
        description: 'Sprich am Wasserturm mit der Krähe.',
        markers: ['npc:crow'],
      },
      {
        type: 'flag',
        flag: 'owl-met',
        description: 'Sprich mit der Turmeule auf der Mauer.',
        markers: ['npc:owl'],
      },
      {
        type: 'flag',
        flag: 'journal-read:page-tower',
        description: 'Lies M.s Notiz am Aussichtsgeländer.',
        markers: ['journal:page-tower'],
      },
      {
        type: 'flag',
        flag: 'tower-cistern-repaired',
        description: 'Repariere das Zisternen-Ventil (3 Sonnenlicht, 3 Tau, 1 Fundstück).',
        markers: ['tower-cistern'],
      },
      {
        type: 'flag',
        flag: 'bed-restored:bed-tower-lily',
        description: 'Pflanze eine Leuchtlilie am Wasserturm und lass sie erblühen.',
        markers: ['bed:bed-tower-lily', 'resource:tower-seed-lily'],
      },
      {
        type: 'flag',
        flag: 'owl-gave-vial',
        description: 'Berichte der Turmeule vom fließenden Wasser und dem Licht.',
        markers: ['npc:owl'],
      },
    ],
  },
  {
    id: 'q-inner-greenhouse',
    title: 'Das Herz des Gewächshauses',
    summary: 'Mit dem Quellwasser vom Wasserturm geben die Ranken im Gewächshaus vielleicht den Weg in den inneren Raum frei.',
    startsWhen: ['quest-completed:q-water-tower'],
    objectives: [
      {
        type: 'flag',
        flag: 'greenhouse-inner-unlocked',
        description: 'Öffne die verwachsene Innentür im Vorraum des Gewächshauses.',
        markers: ['greenhouse-door', 'greenhouse-inner-door'],
      },
      {
        type: 'flag',
        flag: 'journal-read:page-heart',
        description: 'Lies M.s Brief auf dem Schreibtisch im Herzraum.',
        markers: ['journal:page-heart'],
      },
      {
        type: 'flag',
        flag: 'bed-restored:bed-heart-fern',
        description: 'Pflanze die Mondfarn-Sporen ins Herzbeet und lass sie erblühen.',
        markers: ['bed:bed-heart-fern', 'resource:heart-seed-moon-fern'],
      },
      {
        type: 'flag',
        flag: 'crow-heart-talked',
        description: 'Sprich im Herzraum mit der Krähe.',
        markers: ['npc:crow'],
      },
    ],
    rewardFlags: ['episode-2-complete'],
  },
];
