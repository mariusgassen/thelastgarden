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
  // Optional side quest placed before q-journal-pages so the HUD tracker highlights the main journey first.
  {
    id: 'q-first-harvest',
    title: 'Was der Garten zurückgibt',
    summary: 'Ausgewachsene Pflanzen tragen immer wieder: Triebe, Pollen, Duft — und manchmal neue Samen.',
    startsWhen: ['bed-restored:bed-bramble', 'bed-restored:bed-lily', 'bed-restored:bed-lavender'],
    objectives: [
      {
        type: 'flag',
        flag: 'harvested-once',
        description: 'Ernte eine ausgewachsene Pflanze in einem deiner Beete.',
        markers: ['bed:bed-bramble', 'bed:bed-lily', 'bed:bed-lavender'],
      },
    ],
    rewardItems: [{ itemId: 'resource-dew', count: 1 }],
  },
  {
    id: 'q-old-trowel',
    title: 'Das erste Werkzeug',
    summary: 'In der Werkstatt der Gartenhütte soll noch M.s älteste Pflanzkelle im Regal liegen — und daneben ein paar Notizen für später.',
    startsWhen: ['bed-restored:bed-bramble', 'bed-restored:bed-lily', 'bed-restored:bed-lavender'],
    objectives: [
      {
        type: 'flag',
        flag: 'trowel-found',
        description: 'Sieh dir das Regal in der Gartenhütte an.',
        markers: ['workshop-door', 'workshop-shelf'],
      },
    ],
    rewardItems: [{ itemId: 'resource-sunlight', count: 1 }],
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
  // Crafting tutorials: one per everyday recipe, each naming what to harvest and what the recipe
  // costs. Placed before q-greenhouse (same start flag) so the HUD tracker keeps the main journey.
  {
    id: 'q-craft-cutting',
    title: 'Ein Steckling für die Dornen',
    summary: 'M.s Seite über die Brombeere beschreibt, wie man an der Werkbank einen Steckling zieht. Wer das kann, bekommt ihre Werkzeugrolle — eine Werkbank für unterwegs.',
    startsWhen: ['quest-completed:q-journal-pages'],
    objectives: [
      {
        type: 'flag',
        flag: 'harvested:produce-tendril',
        description: 'Ernte Brombeertriebe von einer ausgewachsenen Brombeerranke. Sie wachsen jede Minute nach.',
        markers: ['bed:bed-bramble'],
      },
      {
        type: 'flag',
        flag: 'crafted:bramble-cutting',
        description: 'Stelle an der Werkbank in der Gartenhütte einen Brombeer-Steckling her (2 Brombeertriebe, 1 Tau).',
        markers: ['workshop-door', 'workbench'],
      },
    ],
    rewardItems: [{ itemId: 'pocket-workbench', count: 1 }],
  },
  {
    id: 'q-craft-lantern',
    title: 'Licht für eine Nacht',
    summary: 'Eine Lilienlaterne schützt die Beete eine Nacht lang vor Wühlmäusen, auch dort, wo keine Leuchtlilie steht.',
    startsWhen: ['quest-completed:q-journal-pages'],
    objectives: [
      {
        type: 'flag',
        flag: 'harvested:produce-light-pollen',
        description: 'Ernte Lichtpollen von einer ausgewachsenen Leuchtlilie.',
        markers: ['bed:bed-lily'],
      },
      {
        type: 'flag',
        flag: 'crafted:lily-lantern',
        description: 'Stelle eine Lilienlaterne her (2 Lichtpollen, 1 Sonnenlicht).',
        markers: ['workshop-door', 'workbench'],
      },
    ],
    rewardItems: [{ itemId: 'resource-sunlight', count: 1 }],
  },
  {
    id: 'q-craft-sachet',
    title: 'Duft gegen Schnecken',
    summary: 'Ein Lavendelsäckchen hält eine Nacht lang die Schnecken fern, auch von Beeten, zu denen kein Lavendel hinüberduftet.',
    startsWhen: ['quest-completed:q-journal-pages'],
    objectives: [
      {
        type: 'flag',
        flag: 'harvested:produce-scent-bundle',
        description: 'Ernte Duftbündel von einem ausgewachsenen Lavendel.',
        markers: ['bed:bed-lavender'],
      },
      {
        type: 'flag',
        flag: 'crafted:lavender-sachet',
        description: 'Stelle ein Lavendelsäckchen her (2 Duftbündel, 1 Sonnenlicht).',
        markers: ['workshop-door', 'workbench'],
      },
    ],
    rewardItems: [{ itemId: 'resource-dew', count: 1 }],
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
  // Optional: the horse. Placed before q-tramline so the HUD tracker keeps the main journey.
  {
    id: 'q-horse',
    title: 'Die Stute an der alten Trasse',
    summary: 'Auf der Lichtung an der alten Trasse grast ein Pferd. Wer sein Vertrauen gewinnt, ist draußen viel schneller unterwegs.',
    startsWhen: ['episode-1-complete'],
    objectives: [
      {
        type: 'flag',
        flag: 'horse-met',
        description: 'Sieh nach, wer auf der Lichtung südlich der Gleise an der alten Trasse grast.',
        markers: ['tramline-exit', 'npc:mohn'],
      },
      {
        type: 'flag',
        flag: 'journal-read:page-mohn',
        description: 'Lies den Zettel am Zaunpfahl neben der Stute.',
        markers: ['journal:page-mohn'],
      },
      {
        type: 'flag',
        flag: 'crafted:horse-treat',
        description: 'Stelle Kräuterleckerli her (1 Brombeertrieb, 1 Duftbündel, 1 Tau).',
        markers: ['workshop-door', 'workbench'],
      },
      {
        type: 'flag',
        flag: 'horse-tamed',
        description: 'Bring Mohn die Kräuterleckerli.',
        markers: ['tramline-exit', 'npc:mohn'],
      },
    ],
  },
  // Optional, like q-horse: gathering, building and the blight that wakes with Episode 2.
  {
    id: 'q-blight',
    title: 'Die Welke',
    summary:
      'An den Rändern des Gartens kriecht nachts etwas Graues über den Boden. Es weicht dem Licht und allem, was wächst. Zeit, selbst Hand anzulegen.',
    startsWhen: ['episode-1-complete'],
    objectives: [
      {
        type: 'flag',
        flag: 'gathered-material',
        description: 'Sammle Baumaterial: Holzstapel, Steinhaufen und Schrott liegen an den Rändern des Gartens.',
        markers: ['resource:wood-garden-1', 'resource:wood-garden-2', 'resource:scrap-garden-2', 'resource:stone-garden-2'],
      },
      {
        type: 'flag',
        flag: 'built-once',
        description: 'Öffne den Baumodus (Hammer-Knopf oder Taste B) und stelle etwas auf, zum Beispiel einen Zaun (1 Holz).',
      },
      {
        type: 'flag',
        flag: 'blight-seen',
        description: 'Sieh dir einen Welkenherd an. Einer sitzt am Westrand der alten Bushaltestelle.',
        markers: ['blight-heart:heart-plaza', 'blight-heart:heart-pond', 'blight-heart:heart-clearing'],
      },
      {
        type: 'flag',
        flag: 'blight-heart-sealed',
        description:
          'Versiegle einen Herd: Stelle eine Laterne (1 Schrott, 1 Lichtpollen) dicht daneben. Wo noch Welke liegt, arbeite dich Laterne um Laterne vor.',
        markers: ['blight-heart:heart-plaza', 'blight-heart:heart-pond', 'blight-heart:heart-clearing'],
      },
    ],
    rewardItems: [
      { itemId: 'mat-wood', count: 4 },
      { itemId: 'mat-scrap', count: 2 },
    ],
  },
  {
    id: 'q-honeyberry-mash',
    title: 'Süße Beeren vom Teich',
    summary:
      'Östlich des Hauptgartens wachsen wilde Honigbeeren. Wer essbare Früchte erntet, entdeckt an der Werkbank ganz von selbst wärmende Rezepte.',
    startsWhen: ['episode-1-complete'],
    objectives: [
      {
        type: 'flag',
        flag: 'harvested:produce-honeyberry',
        description: 'Finde Honigbeeren-Samen beim Teich, pflanze sie in ein Beet und ernte die Beeren.',
        markers: ['resource:garden-seed-honeyberry', 'bed:bed-extra'],
      },
      {
        type: 'flag',
        flag: 'crafted:berry-mash',
        description: 'Stelle an der Werkbank Beerenmus her (2 Honigbeeren, 1 Sonnenlicht).',
        markers: ['workshop-door', 'workbench'],
      },
      {
        type: 'flag',
        flag: 'ate-meal',
        description: 'Öffne den Beutel (I) und iss dein Beerenmus über „Essen“.',
      },
    ],
    rewardItems: [{ itemId: 'resource-sunlight', count: 1 }],
  },
  {
    id: 'q-bees-and-hens',
    title: 'Bienen und Hühner im Garten',
    summary: 'Wo Beete blühen, lassen sich bald auch Bienen und Hühner nieder — sie schenken Honig, frische Eier und halten Schnecken fern.',
    startsWhen: ['quest-completed:q-blight'],
    objectives: [
      {
        type: 'flag',
        flag: 'built:beehive',
        description: 'Baue im Baumodus einen Bienenstock (3 Holz, 1 Lichtpollen) neben einem bepflanzten Beet.',
      },
      {
        type: 'flag',
        flag: 'animal-produce:produce-honey',
        description: 'Hol Honig am Bienenstock ab, sobald Beete daneben blühen.',
      },
      {
        type: 'flag',
        flag: 'built:henhouse',
        description: 'Baue im Baumodus einen Hühnerstall (4 Holz, 1 Schrott).',
      },
      {
        type: 'flag',
        flag: 'animal-produce:produce-egg',
        description: 'Sammle frische Eier am Hühnerstall ein.',
      },
    ],
    rewardItems: [
      { itemId: 'mat-stone', count: 3 },
      { itemId: 'mat-wood', count: 2 },
    ],
  },
  {
    id: 'q-tools-field',
    title: 'Werkzeuge für das Tagwerk',
    summary: 'Sichel, Spaten und Saatbeutel werden nicht verbraucht und erleichtern die Arbeit im wachsenden Garten.',
    startsWhen: ['quest-completed:q-blight'],
    objectives: [
      {
        type: 'flag',
        flag: 'crafted:tool-sickle',
        description: 'Stelle an der Werkbank eine Sichel her (2 Holz, 1 Schrott).',
        markers: ['workshop-door', 'workbench'],
      },
      {
        type: 'flag',
        flag: 'crafted:tool-shovel',
        description: 'Stelle einen Spaten her (2 Holz, 1 Feldstein), um Pflanzen samt Samen umzusetzen.',
        markers: ['workshop-door', 'workbench'],
      },
      {
        type: 'flag',
        flag: 'crafted:tool-satchel',
        description: 'Stelle einen Saatbeutel her (1 Brombeertrieb, 1 Duftbündel, 1 Schrott).',
        markers: ['workshop-door', 'workbench'],
      },
    ],
  },
  {
    id: 'q-tool-pole-lantern',
    title: 'Licht an langer Stange',
    summary: 'Wer einmal eine Laterne gebaut hat, versteht auch, wie man ihr Licht auf den eigenen Wegen gegen die Welke trägt.',
    startsWhen: ['quest-completed:q-blight'],
    objectives: [
      {
        type: 'flag',
        flag: 'built:lantern',
        description: 'Stelle im Baumodus eine Laterne auf (1 Schrott, 1 Lichtpollen).',
      },
      {
        type: 'flag',
        flag: 'crafted:tool-pole-lantern',
        description: 'Stelle an der Werkbank eine Stablaterne her (1 Holz, 1 Schrott, 2 Lichtpollen).',
        markers: ['workshop-door', 'workbench'],
      },
    ],
    rewardItems: [{ itemId: 'resource-sunlight', count: 2 }],
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
        description: 'Öffne das Dornengestrüpp auf den Gleisen mit einem Brombeer-Steckling (2 Brombeertriebe, 1 Tau).',
        markers: ['obstacle:bramble-tram-switch', 'bed:bed-tram-bramble', 'resource:tram-seed-bramble', 'workshop-door', 'workbench'],
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
    id: 'q-glowcap',
    title: 'Leuchtkappen auf den Gleisen',
    summary: 'Hinter dem Gestrüpp an der Weiche schimmern grüne Sporen. Leuchtkappen halten die Welke fern und bereichern spätere Mahlzeiten.',
    startsWhen: ['quest-completed:q-tramline'],
    objectives: [
      {
        type: 'flag',
        flag: 'harvested:produce-glowcap',
        description: 'Sammle Leuchtkappen-Sporen bei der alten Weiche auf Linie 3, pflanze sie ein und ernte Leuchtkappen.',
        markers: ['resource:tram-seed-glowcap', 'bed:bed-tram-bramble', 'bed:bed-tower-lily'],
      },
    ],
  },
  {
    id: 'q-turnip-stew',
    title: 'Goldrüben & Rübeneintopf',
    summary:
      'Im Südwesten des Hauptgartens liegen Goldrüben-Samen. Mit einer Leuchtkappe gekocht, lässt dich ihr Eintopf ungebremst über die Welke laufen.',
    startsWhen: ['quest-completed:q-glowcap'],
    objectives: [
      {
        type: 'flag',
        flag: 'harvested:produce-gold-turnip',
        description: 'Finde Goldrüben-Samen im Südwesten des Hauptgartens, pflanze sie ein und ernte Goldrüben.',
        markers: ['resource:garden-seed-gold-turnip', 'bed:bed-extra'],
      },
      {
        type: 'flag',
        flag: 'crafted:turnip-stew',
        description: 'Stelle an der Werkbank einen Rübeneintopf her (2 Goldrüben, 1 Leuchtkappe).',
        markers: ['workshop-door', 'workbench'],
      },
    ],
    rewardItems: [{ itemId: 'resource-dew', count: 2 }],
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
        description: 'Repariere das Zisternen-Ventil: 2 Sonnenlicht, 1 Fundstück und eine Ventildichtung (herstellen aus 1 Brombeertrieb, 1 Duftbündel).',
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
    id: 'q-thornroot',
    title: 'Lebende Dornenhecke',
    summary: 'Am Südhang des Hügelpfads wachsen stachelige Knollen. Als Hecke gepflanzt, hält ihre Dornenranke die Welke weit auf Abstand.',
    startsWhen: ['episode-2-complete'],
    objectives: [
      {
        type: 'flag',
        flag: 'harvested:produce-thorn-cane',
        description: 'Sammle Dornwurz-Knollen am Südhang des Hügelpfads, pflanze sie ein und ernte Dornenranken.',
        markers: ['tower-to-hill', 'resource:hill-seed-thornroot', 'bed:bed-extra', 'bed:bed-hill-extra'],
      },
      {
        type: 'flag',
        flag: 'built:thorn-hedge',
        description: 'Baue im Baumodus eine Dornenhecke (2 Dornenranken), um die Welke weit zurückzudrängen.',
      },
    ],
    rewardItems: [{ itemId: 'resource-sunlight', count: 1 }],
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
        description: 'Teile die Dornenhecke am Hang zur oberen Terrasse mit einem Brombeer-Steckling (2 Brombeertriebe, 1 Tau).',
        markers: ['obstacle:bramble-orchard-terrace', 'orchard-to-cottage', 'cottage-herb-rack'],
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
        description: 'Repariere die alte Bewässerungsrinne: 1 Sonnenlicht, 1 Fundstück und ein Dichtzopf (herstellen aus 2 Duftbündeln, 1 Tau).',
        markers: ['orchard-sluice', 'cottage-herb-rack'],
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
  // Optional side quests placed before q-valley-mill so the HUD tracker highlights the main journey first.
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
    id: 'q-reed',
    title: 'Schilf für Steg und Floß',
    summary: 'An der Steinbrücke bei der Alten Mühle wachsen kräftige Schilfhalme — zu Bündeln geschnürt tragen sie dich übers Wasser.',
    startsWhen: ['episode-3-complete'],
    objectives: [
      {
        type: 'flag',
        flag: 'harvested:produce-reed-bundle',
        description: 'Sammle Schilfrhizome an der Brücke der Alten Mühle, pflanze sie ein und ernte Schilfbündel.',
        markers: ['orchard-to-mill', 'resource:mill-seed-reed', 'bed:bed-mill-extra'],
      },
      {
        type: 'flag',
        flag: 'built:reed-bridge',
        description: 'Baue im Baumodus am Ufer einen Schilfsteg über das Wasser (2 Schilfbündel).',
      },
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
    id: 'q-windmill-flour',
    title: 'Blütenmehl aus eigener Mühle',
    summary: 'Jakob erzählt gern von früheren Backtagen: Mit einer eigenen Windmühle mahlst du aus deiner Ernte feines Blütenmehl.',
    startsWhen: ['quest-completed:q-valley-mill'],
    objectives: [
      {
        type: 'flag',
        flag: 'built:windmill',
        description: 'Baue im Baumodus eine Windmühle (4 Holz, 3 Feldstein, 2 Schrott).',
      },
      {
        type: 'flag',
        flag: 'collected-flour',
        description: 'Lege 2 Ernten an der Windmühle ein („Mahlen“) und hol anschließend dein Blütenmehl ab.',
      },
    ],
    rewardItems: [{ itemId: 'resource-dew', count: 2 }],
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
        description: 'Mache das alte Mühlrad wieder gangbar: 2 Sonnenlicht, 2 Fundstücke und Achsenwachs (herstellen aus 2 Nachtviolen-Nektar, 1 Sonnenlicht).',
        markers: ['mill-wheel', 'mill-workbench'],
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
        description: 'Öffne das verwachsene Hoftor mit einem Brombeer-Steckling (2 Brombeertriebe, 1 Tau).',
        markers: ['obstacle:bramble-farm-gate', 'mill-workbench'],
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
    id: 'q-craft-seed-mix',
    title: 'Jakobs Saattütchen',
    summary: 'In der Chronik der Mühle steht, wie aus Stockrosenkapseln neue Samen für den ganzen Garten werden.',
    startsWhen: ['journal-read:page-mill'],
    objectives: [
      {
        type: 'flag',
        flag: 'harvested:produce-seed-pod',
        description: 'Ernte Samenkapseln von einer ausgewachsenen Stockrose.',
        markers: ['bed:bed-mill-hollyhock'],
      },
      {
        type: 'flag',
        flag: 'crafted:seed-mix',
        description: 'Mische ein Saattütchen (2 Samenkapseln, 1 Tau). Es enthält je einen Samen für Brombeere, Leuchtlilie und Lavendel.',
        markers: ['mill-workbench'],
      },
    ],
    rewardItems: [{ itemId: 'resource-dew', count: 1 }],
  },
  {
    id: 'q-willow',
    title: 'Geflochtener Schutz',
    summary: 'Bei den drei Höfen liegen Weidenstecklinge. Aus ihren biegsamen Ruten entsteht im Handumdrehen ein dichter Flechtzaun gegen die Welke.',
    startsWhen: ['journal-read:page-mill'],
    objectives: [
      {
        type: 'flag',
        flag: 'harvested:produce-willow-switch',
        description: 'Sammle Weidenstecklinge am östlichen Rand des Hofplatzes, pflanze sie ein und ernte Weidenruten.',
        markers: ['mill-to-farms', 'resource:farms-seed-willow', 'bed:bed-mill-extra'],
      },
      {
        type: 'flag',
        flag: 'built:wattle',
        description: 'Baue im Baumodus einen Flechtzaun (2 Weidenruten).',
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
