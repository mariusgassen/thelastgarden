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
  // ── Episode 3: Hügelpfad & Die alten Obstwiesen ─────────────────────────
  // Optional side quest placed before q-hill-mist so the HUD tracker highlights the main journey first.
  {
    id: 'q-vestibule-garden',
    title: 'Ein Beet für den Vorraum',
    summary: 'Im Vorraum des Gewächshauses liegt noch ein ungenutztes Pflanzbeet. Etwas Blühendes würde dem Glasraum gut tun.',
    startsWhen: ['episode-2-complete'],
    objectives: [
      {
        type: 'flag',
        flag: 'bed-restored:bed-vestibule',
        description: 'Bepflanze das Beet im Gewächshaus-Vorraum und lass die Pflanze reifen.',
        markers: ['greenhouse-door', 'bed:bed-vestibule'],
      },
    ],
    rewardItems: [
      { itemId: 'resource-sunlight', count: 2 },
      { itemId: 'resource-dew', count: 2 },
    ],
  },
  {
    id: 'q-hill-mist',
    title: 'Über den Hügel im Nebel',
    summary: 'Hinter dem Wasserturm führt ein alter Pfad über den Hügelkamm zu den Obstwiesen. Mit dem Licht des Mondfarns solltest du den Nebel teilen können.',
    startsWhen: ['episode-2-complete'],
    objectives: [
      {
        type: 'visitZone',
        zoneId: 'hill-south',
        description: 'Nimm den nördlichen Pfad beim Wasserturm hinauf zum Hügelpfad.',
        markers: ['tower-to-hill'],
      },
      {
        type: 'unblock',
        obstacleId: 'fog-hill-ridge',
        description: 'Teile den dichten Nebel auf dem Hügelkamm mit dem Licht des Mondfarns.',
        markers: ['obstacle:fog-hill-ridge'],
      },
      {
        type: 'visitZone',
        zoneId: 'orchard-entrance',
        description: 'Folge dem Kamm hinunter auf die alten Obstwiesen.',
        markers: ['hill-to-orchard'],
      },
    ],
  },
  {
    id: 'q-find-m',
    title: 'Die Gärtnerin am Mutterbaum',
    summary: 'Du hast die Obstwiesen hinter dem Hügel erreicht. Sprich mit der Krähe und finde M. auf der oberen Terrasse.',
    startsWhen: ['quest-completed:q-hill-mist'],
    objectives: [
      {
        type: 'flag',
        flag: 'crow-orchard-talked',
        description: 'Sprich am Eingang der Obstwiesen mit der Krähe.',
        markers: ['npc:crow'],
      },
      {
        type: 'unblock',
        obstacleId: 'bramble-orchard-terrace',
        description: 'Teile die Dornenhecke am Hang zur oberen Terrasse.',
        markers: ['obstacle:bramble-orchard-terrace'],
      },
      {
        type: 'flag',
        flag: 'm-met',
        description: 'Begegne M. beim alten Mutterbaum.',
        markers: ['npc:m'],
      },
    ],
  },
  {
    id: 'q-orchard-revival',
    title: 'Wenn die Obstwiesen erwachen',
    summary: 'Hilf M., die alten Bäume wiederzubeleben: öffne die Bewässerungsrinne, säe Nachtviolen für die Bienen und lies ihr Obstwiesen-Notizbuch.',
    startsWhen: ['quest-completed:q-find-m'],
    objectives: [
      {
        type: 'flag',
        flag: 'orchard-sluice-repaired',
        description: 'Repariere die alte Bewässerungsrinne (2 Sonnenlicht, 2 Tau, 1 Fundstück).',
        markers: ['orchard-sluice'],
      },
      {
        type: 'flag',
        flag: 'bed-restored:bed-orchard-violet',
        description: 'Pflanze Nachtviolen beim Bienenstand und lass sie erblühen.',
        markers: ['bed:bed-orchard-violet', 'resource:orchard-seed-violet-1'],
      },
      {
        type: 'flag',
        flag: 'journal-read:page-orchard',
        description: 'Lies M.s Obstwiesen-Notizbuch in ihrem Gartenhaus.',
        markers: ['orchard-to-cottage', 'journal:page-orchard'],
      },
      {
        type: 'flag',
        flag: 'm-orchard-celebrated',
        description: 'Kehre zu M. am Mutterbaum zurück.',
        markers: ['npc:m'],
      },
    ],
    rewardFlags: ['episode-3-complete'],
    rewardItems: [{ itemId: 'orchard-apple-graft', count: 1 }],
  },
  // ── Episode 4: Die alte Mühle am Fluss & Rückkehr nach Erlenbrück ─────────
  // Optional side quest placed before q-valley-mill so the HUD tracker highlights the main journey first.
  {
    id: 'q-orchard-meadow-bed',
    title: 'Ein Beet für die untere Wiese',
    summary: 'Auch am westlichen Eingang der Obstwiesen wartet noch ein freies Stück Erde auf neue Blüten.',
    startsWhen: ['episode-3-complete'],
    objectives: [
      {
        type: 'flag',
        flag: 'bed-restored:bed-orchard-extra',
        description: 'Bepflanze das westliche Beet auf den Obstwiesen und lass die Pflanze reifen.',
        markers: ['bed:bed-orchard-extra'],
      },
    ],
    rewardItems: [
      { itemId: 'resource-curio', count: 1 },
      { itemId: 'seed-hollyhock', count: 1 },
    ],
  },
  {
    id: 'q-valley-mill',
    title: 'Zur Alten Mühle am Fluss',
    summary: 'Östlich der Obstwiesen führt ein alter Weg zu einer Wassermühle am Fluss. Vielleicht kümmert sich dort noch jemand um das Tal.',
    startsWhen: ['episode-3-complete'],
    objectives: [
      {
        type: 'visitZone',
        zoneId: 'mill-riverbank',
        description: 'Folge dem östlichen Pfad der Obstwiesen bis zur Alten Mühle am Fluss.',
        markers: ['orchard-to-mill'],
      },
      {
        type: 'flag',
        flag: 'jakob-met',
        description: 'Sprich vor dem Mühlhaus mit dem alten Müller Jakob.',
        markers: ['npc:jakob'],
      },
    ],
  },
  {
    id: 'q-mill-and-farms',
    title: 'Mühlrad, Edelreis und die drei Höfe',
    summary: 'Hilf Jakob, das alte Mühlrad und die drei stillen Höfe flussabwärts wieder mit Leben zu füllen.',
    startsWhen: ['quest-completed:q-valley-mill'],
    objectives: [
      {
        type: 'flag',
        flag: 'mill-wheel-repaired',
        description: 'Mache das alte Mühlrad wieder gangbar (3 Sonnenlicht, 3 Tau, 2 Fundstücke).',
        markers: ['mill-wheel'],
      },
      {
        type: 'flag',
        flag: 'mill-apple-grafted',
        description: 'Veredle den alten Apfel-Wildling auf der Flusswiese mit dem Goldreinetten-Edelreis.',
        markers: ['mill-rootstock'],
      },
      {
        type: 'flag',
        flag: 'bed-restored:bed-mill-hollyhock',
        description: 'Pflanze eine Stockrose am Mühlenbeet und lass sie erblühen.',
        markers: ['bed:bed-mill-hollyhock'],
      },
      {
        type: 'flag',
        flag: 'journal-read:page-mill',
        description: 'Lies die Chronik der Alten Mühle in der Mahlstube.',
        markers: ['mill-door', 'journal:page-mill'],
      },
      {
        type: 'visitZone',
        zoneId: 'river-farms-yard',
        description: 'Folge dem südlichen Flussweg zu den drei stillen Höfen.',
        markers: ['mill-to-farms'],
      },
      {
        type: 'unblock',
        obstacleId: 'bramble-farm-gate',
        description: 'Öffne das verwachsene Hoftor mit der Brombeerranke.',
        markers: ['obstacle:bramble-farm-gate'],
      },
      {
        type: 'flag',
        flag: 'bed-restored:bed-farms-hollyhock',
        description: 'Pflanze eine Stockrose im Flussgarten der drei Höfe und lass sie erblühen.',
        markers: ['bed:bed-farms-hollyhock', 'resource:farms-seed-hollyhock'],
      },
      {
        type: 'flag',
        flag: 'journal-read:page-farms',
        description: 'Lies die Gedenknotiz im Flussgarten der drei Höfe.',
        markers: ['journal:page-farms'],
      },
    ],
  },
  {
    id: 'q-erlenbrueck-awakens',
    title: 'Rückkehr nach Erlenbrück',
    summary: 'Mühle und Flusshöfe erwachen wieder. Lade Jakob ein, mit M. und der Krähe im Botanischen Garten zusammenzukommen.',
    startsWhen: ['quest-completed:q-mill-and-farms'],
    objectives: [
      {
        type: 'flag',
        flag: 'jakob-ready-to-return',
        description: 'Kehre zu Jakob an der Alten Mühle zurück und berichte von den Höfen.',
        markers: ['farms-to-mill', 'npc:jakob'],
      },
      {
        type: 'flag',
        flag: 'garden-gathering-celebrated',
        description: 'Kehre in den Botanischen Garten zurück und sprich am runden Platz mit M.',
        markers: ['mill-to-orchard', 'orchard-to-hill', 'hill-to-tower', 'tower-to-tramline', 'tramline-to-garden', 'npc:m'],
      },
    ],
    rewardFlags: ['episode-4-complete'],
    rewardItems: [{ itemId: 'erlenbrueck-chronicle', count: 1 }],
  },
];
