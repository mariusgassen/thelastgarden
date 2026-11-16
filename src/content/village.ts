import type { DialogueDef, NpcDef, QuestDef, VillagePartDef, VillagerDef } from './types';
import { ITEMS } from './items';

/**
 * The living village: three quarters of Erlenbrück that wake up one after the other. The
 * Episode 4 ending the player chose decides which one opens first; the other two follow in
 * the fixed ring plaza → farms → orchard → plaza.
 *
 *   garden ending → plaza, farms, orchard
 *   valley ending → farms, orchard, plaza
 *   future ending → orchard, plaza, farms
 *
 * Everything else (NPCs, dialogues, quests) is generated from this data below; the world side
 * (buildings, villager spots) is in the maps, gated by `village-open:<part>` and
 * `village-restored:<part>`. Nothing is sold: villagers ask, the player hands over, a thank-you
 * comes back.
 */
export const VILLAGE_PARTS: VillagePartDef[] = [
  {
    id: 'plaza',
    name: 'Der Dorfplatz',
    description: 'Der gepflasterte Platz an der alten Haltestelle. Früher war hier jeden Morgen Markt.',
    mapId: 'garden',
    openedBy: ['chronicle-ending-garden', 'quest-completed:q-village-orchard'],
    ward: { x: 16, y: 63, radius: 6 },
    unblocks: ['fallen-tree-canal'],
    rewardItems: [
      { itemId: 'mat-wood', count: 3 },
      { itemId: 'seed-gold-turnip', count: 2 },
    ],
    restoredText: 'Der Dorfplatz lebt wieder. Die Laternen brennen, und die Leute räumen den umgestürzten Baum am Kanal weg.',
  },
  {
    id: 'farms',
    name: 'Die drei Höfe',
    description: 'Die Höfe am Fluss mit Brunnen, Glocke und dem Gemüsegarten hinter dem Tor.',
    mapId: 'river-farms',
    openedBy: ['chronicle-ending-valley', 'quest-completed:q-village-plaza'],
    rewardItems: [
      { itemId: 'mat-wood', count: 2 },
      { itemId: 'seed-honeyberry', count: 2 },
    ],
    restoredText: 'Auf den drei Höfen ist wieder Leben: Der Hofladen hat offen, und die Wäsche flattert im Wind.',
  },
  {
    id: 'orchard',
    name: 'Der Obsthof',
    description: 'Die Mosthütte und die Bienenwiese im Osten der alten Obstwiesen.',
    mapId: 'orchard',
    openedBy: ['chronicle-ending-future', 'quest-completed:q-village-farms'],
    ward: { x: 32, y: 25, radius: 6 },
    rewardItems: [
      { itemId: 'mat-stone', count: 2 },
      { itemId: 'seed-glowcap', count: 2 },
    ],
    restoredText: 'Der Obsthof duftet nach frischem Most. Die Mosthütte ist geöffnet, und die Bienen summen zwischen den Kisten.',
  },
];

export const VILLAGERS: VillagerDef[] = [
  {
    id: 'hanne',
    partId: 'plaza',
    name: 'Hanne',
    description: 'Die Bäckerin von Erlenbrück. Sie ist mit einem alten Backtrog unter dem Arm zurückgekommen.',
    look: { skin: 0xf0c29a, hair: 0x8a5a3a, top: 0xc98f5a, bottom: 0x5d4a3a, apron: 0xf3ead6, hat: 'scarf', hatColor: 0xb5533c },
    at: { x: 25.5, y: 63.4 },
    request: [
      { itemId: 'craft-flour', count: 2 },
      { itemId: 'produce-egg', count: 2 },
    ],
    gift: [
      { itemId: 'seed-honeyberry', count: 2 },
      { itemId: 'mat-scrap', count: 1 },
    ],
    lines: {
      ask: 'Ich bin wieder da! Der Ofen steht noch, aber im Trog liegt nichts als Spinnweben.',
      need: 'Für den ersten Teig fehlt mir alles. Wenn du mir Mehl aus der Windmühle und frische Eier bringst, backe ich dir etwas Warmes.',
      thanks: 'Mehl und Eier, noch warm! Riechst du das? In zwei Stunden riecht der ganze Platz nach Brot. Nimm das hier, es ist eine Handvoll von dem, was ich im Mantel mitgebracht habe.',
      after: 'Der erste Laib ist schon weg. Die Leute kommen zurück, einer nach dem anderen, nur wegen des Duftes.',
      restored: 'Schau, die Bäckerei hat wieder ein Schild! Wer hätte gedacht, dass ich noch einmal Brötchen für ein ganzes Dorf backe.',
    },
  },
  {
    id: 'piet',
    partId: 'plaza',
    name: 'Piet',
    description: 'Der Laternenwärter. Er trägt einen Eimer mit Lappen und eine Leiter, die größer ist als er.',
    look: { skin: 0xe2b48c, hair: 0x7c7c7c, top: 0x4a5f78, bottom: 0x3a3a44, hat: 'cap', hatColor: 0x2f3b4a, beard: true },
    at: { x: 15.5, y: 64.2 },
    request: [
      { itemId: 'produce-honey', count: 1 },
      { itemId: 'produce-glowcap', count: 2 },
    ],
    gift: [
      { itemId: 'mat-scrap', count: 2 },
      { itemId: 'resource-sunlight', count: 2 },
    ],
    lines: {
      ask: 'Die Laternen auf diesem Platz sind alle erloschen, jede einzelne. Das nagt an mir.',
      need: 'Mit Bienenwachs lassen sich die Dichtungen flicken, und eine Leuchtkappe in jede Laterne gesetzt brennt ohne Öl. Honig und Leuchtkappen hättest du doch bestimmt im Garten?',
      thanks: 'Honig für das Wachs, Leuchtkappen für den Schein. Jetzt werden die Laternen schon wieder hell! Hier, den Schrott habe ich beim Abmontieren übrig behalten, und etwas Sonne dazu.',
      after: 'Ich gehe jeden Abend die Reihe ab. Wenn die letzte brennt, weiß ich, dass niemand mehr im Dunkeln heimkommen muss.',
      restored: 'Alle Laternen brennen! Und seit sie leuchten, weicht die Welke vom Platz zurück. Das hätte ich dir gleich versprechen sollen.',
    },
  },
  {
    id: 'wilma',
    partId: 'farms',
    name: 'Wilma',
    description: 'Die Bäuerin vom mittleren Hof. Sie hat Stroh im Haar und noch immer die Schürze von früher um.',
    look: { skin: 0xf2c9a0, hair: 0xc9a46a, top: 0x6e8f5a, bottom: 0x6a4a3a, apron: 0xe3d7b8, hat: 'scarf', hatColor: 0x7fa8c9 },
    at: { x: 9.5, y: 12.4 },
    request: [
      { itemId: 'meal-turnip-stew', count: 1 },
      { itemId: 'meal-berry-mash', count: 1 },
    ],
    gift: [
      { itemId: 'seed-gold-turnip', count: 2 },
      { itemId: 'seed-reed', count: 1 },
    ],
    lines: {
      ask: 'Endlich ein Mensch! Ich habe mich im Haus eingerichtet, aber mein Herd ist seit Jahren kalt.',
      need: 'Ich würde gern erst einmal wissen, ob wieder etwas Warmes aus diesem Garten kommen kann. Einen Rübeneintopf und ein Schälchen Beerenmus, mehr brauche ich nicht zum Anfangen.',
      thanks: 'Nach diesem Eintopf bleibe ich! Und das Beerenmus erst. Jetzt traue ich mich, den Herd anzumachen. Nimm bitte ein paar Samen von meinem Hof mit.',
      after: 'Ich habe die Fenster aufgerissen. Der Hof atmet wieder, und ich glaube, die Hühner kommen von allein zurück.',
      restored: 'Der Hofladen hat offen, und die Wäsche hängt draußen. Mehr brauche ich nicht, um zu wissen, dass ich zu Hause bin.',
    },
  },
  {
    id: 'bruno',
    partId: 'farms',
    name: 'Bruno',
    description: 'Der Sohn des alten Müllers Jakob. Er schiebt einen Handkarren mit zwei Rädern, die nicht zueinander passen.',
    look: { skin: 0xe8b88e, hair: 0x5a3f2e, top: 0xa5603f, bottom: 0x3f5f3a, hat: 'beret', hatColor: 0x6a3f2f },
    at: { x: 14.8, y: 14.8 },
    request: [
      { itemId: 'produce-gold-turnip', count: 3 },
      { itemId: 'produce-honey', count: 1 },
    ],
    gift: [
      { itemId: 'mat-wood', count: 3 },
      { itemId: 'resource-dew', count: 2 },
    ],
    lines: {
      ask: 'Vater hat mir erzählt, dass die Höfe wieder leben. Ich wollte es nicht glauben, bis ich den Rauch sah.',
      need: 'Ich will den Gemüsegarten hinter dem Tor wieder aufmachen. Aber erst einmal brauche ich Goldrüben für die Saat und einen Löffel Honig zum Beizen.',
      thanks: 'Drei pralle Goldrüben! So wächst ein Garten zurück. Das Holz hier ist von meinem Karren, ich baue mir einen besseren.',
      after: 'Ich habe die Goldrüben in den Boden gesteckt. Bis zum nächsten Frühling reicht das für drei Höfe.',
      restored: 'Jakob war zu stolz, um es zu sagen, aber er freut sich. Und ich auch, weißt du.',
    },
  },
  {
    id: 'ottilie',
    partId: 'orchard',
    name: 'Ottilie',
    description: 'Die Imkerin. Sie trägt einen Hut mit Schleier und summt leise vor sich hin, wenn sie nachdenkt.',
    look: { skin: 0xf1cba5, hair: 0xd9d4c9, top: 0xe3c565, bottom: 0x5a4a3a, apron: 0x8a6a4a, hat: 'straw', hatColor: 0xc9b98a },
    at: { x: 35.2, y: 22.6 },
    request: [
      { itemId: 'produce-honey', count: 2 },
      { itemId: 'produce-nectar', count: 1 },
    ],
    gift: [
      { itemId: 'seed-night-violet', count: 2 },
      { itemId: 'resource-dew', count: 1 },
    ],
    lines: {
      ask: 'Die Bienen sind vor mir zurückgekommen. Sie wussten es besser als ich.',
      need: 'Meine Waben sind leer. Wenn du mir etwas Honig als Starthilfe bringst und ein wenig Nektar vom Nachtviolen-Beet, sind sie bald wieder voll.',
      thanks: 'Honig und Nektar, das riecht nach Sommer! Die Bienen nehmen es gleich an, siehst du? Ich schenke dir ein paar Nachtviolen-Samen dafür.',
      after: 'Ich sitze abends vor dem Stock und höre zu. Es ist das schönste Geräusch, das ich kenne.',
      restored: 'Die Mosthütte duftet nach Honigmost! So viele Gäste hatten wir seit meiner Kindheit nicht mehr.',
    },
  },
  {
    id: 'konrad',
    partId: 'orchard',
    name: 'Konrad',
    description: 'Der Mostmeister vom Obsthof, breit wie ein Fass. Er klopft jede Kiste ab, bevor er sie hinstellt.',
    look: { skin: 0xdea983, hair: 0x6a4a35, top: 0x7a5a45, bottom: 0x3a3f5a, apron: 0x8a8f95, hat: 'cap', hatColor: 0x7a5a45, beard: true },
    at: { x: 41.8, y: 22.8 },
    request: [
      { itemId: 'produce-honeyberry', count: 3 },
      { itemId: 'craft-flour', count: 1 },
    ],
    gift: [
      { itemId: 'mat-stone', count: 2 },
      { itemId: 'mat-wood', count: 2 },
    ],
    lines: {
      ask: 'Die Presse läuft noch, die alten Eichenfässer sind dicht. Es fehlt bloß, was hineinkommt.',
      need: 'Für meinen ersten Beerenmost brauche ich Honigbeeren, ein paar Hände voll. Und etwas Mehl für den Teig zum Abdichten der Fässer.',
      thanks: 'Das sind die schönsten Honigbeeren, die ich seit Jahren gesehen habe! Das Mehl dichtet das Fass wie neu. Nimm dir Holz und Steine von meinem Stapel, ich brauche sie nicht.',
      after: 'Der Most muss ein paar Tage ruhen. Aber ich rieche schon, dass er gut wird.',
      restored: 'Alle Fässer sind voll, und ich habe wieder Kunden. Das heißt, ich verschenke ihn nur. Verkaufen? Ach was, trink einfach mit.',
    },
  },
];

const stack = (list: { itemId: string; count: number }[]): string =>
  list.map((c) => `${c.count} × ${ITEMS.find((i) => i.id === c.itemId)?.name ?? c.itemId}`).join(', ');

export const villagerRequestText = stack;

export function getVillagers(partId: string): VillagerDef[] {
  return VILLAGERS.filter((v) => v.partId === partId);
}

export const villageQuestId = (partId: string): string => `q-village-${partId}`;
export const villageOpenFlag = (partId: string): string => `village-open:${partId}`;
export const villageRestoredFlag = (partId: string): string => `village-restored:${partId}`;
export const villagerHelpedFlag = (villagerId: string): string => `village-helped:${villagerId}`;

/** One NPC per villager. Rules run top to bottom: restored, helped, hand-over, ask. */
export function villagerNpcs(): NpcDef[] {
  return VILLAGERS.map((v) => ({
    id: v.id,
    name: v.name,
    description: v.description,
    interactLabel: 'Sprechen',
    color: v.look.top,
    dialogues: [
      { dialogueId: `village-${v.id}-restored`, requires: [villagerHelpedFlag(v.id), villageRestoredFlag(v.partId)] },
      { dialogueId: `village-${v.id}-after`, requires: [villagerHelpedFlag(v.id)] },
      {
        dialogueId: `village-${v.id}-thanks`,
        forbids: [villagerHelpedFlag(v.id)],
        requiresItems: v.request,
        takeItems: v.request,
        giveItems: v.gift,
        setFlags: [villagerHelpedFlag(v.id)],
      },
    ],
    dialogueId: `village-${v.id}-ask`,
  }));
}

export function villageDialogues(): DialogueDef[] {
  const out: DialogueDef[] = [
    {
      id: 'village-plaza-bakery',
      lines: [{ text: 'Durch die Tür der Bäckerei weht der Duft von frischem Brot. Auf dem Fensterbrett liegt ein Zettel: "Heute für alle."' }],
    },
    {
      id: 'village-plaza-stall',
      lines: [{ text: 'Auf dem Marktstand liegen drei Brote. Ein Schild daneben: "Nimm, was du brauchst. Bring, was du hast." Hier wird nichts verkauft.' }],
    },
    {
      id: 'village-farms-shop',
      lines: [{ text: 'Im Hofladen stehen Körbe mit Rüben und Beeren. An der Tür hängt eine Kreidetafel: "Immer offen. Nichts kostet etwas."' }],
    },
    {
      id: 'village-orchard-press',
      lines: [{ text: 'Aus der Mosthütte duftet es nach Äpfeln und Honig. Auf einem Fass steht ein Zinnbecher, halb voll und noch warm.' }],
    },
    {
      id: 'm-village-hint-garden',
      lines: [
        { speaker: 'm', text: 'Dein Satz über den Garten hat sich herumgesprochen. Am alten Dorfplatz, bei der Bushaltestelle, hat jemand einen Ofen angeheizt.' },
        { speaker: 'm', text: 'Hanne und Piet sind zurück. Sie warten auf Mehl, Eier, Honig und ein paar Leuchtkappen. Danach folgen die Höfe und der Obsthof.' },
      ],
    },
    {
      id: 'm-village-hint-valley',
      lines: [
        { speaker: 'm', text: 'Du hast alle vergessenen Orte beim Namen genannt, und sie haben es gehört. Auf den drei Höfen am Fluss steigt Rauch auf.' },
        { speaker: 'm', text: 'Wilma und Bruno sind zurück und brauchen etwas Warmes zu essen. Danach folgen der Obsthof und der Dorfplatz.' },
      ],
    },
    {
      id: 'm-village-hint-future',
      lines: [
        { speaker: 'm', text: 'Du hast gesagt, dass alle Türen offen stehen, und tatsächlich: Im Obsthof geht jemand aus und ein.' },
        { speaker: 'm', text: 'Ottilie und Konrad sind zurück und brauchen Honig, Beeren und etwas Mehl. Danach folgen der Dorfplatz und die Höfe.' },
      ],
    },
    {
      id: 'm-village-finale',
      lines: [
        { speaker: 'm', text: 'Hanne backt, Piet zündet die Laternen an, Wilma kocht, Bruno pflanzt, Ottilie summt und Konrad rührt in seinem Most.' },
        { speaker: 'm', text: 'Erlenbrück ist wieder ein Dorf. Und es hat angefangen mit einer Handvoll Erde in einem verwilderten Garten.' },
        { speaker: 'crow', text: 'Krah! Ich habe von Anfang an gesagt, dass du die Richtige bist. Ich habe es nur nicht laut gesagt.' },
      ],
    },
    {
      id: 'm-village-after',
      lines: [{ speaker: 'm', text: 'Hörst du das? Aus drei Richtungen kommt Lärm. So klingt ein Dorf, das nicht mehr leise sein muss.' }],
    },
  ];
  for (const v of VILLAGERS) {
    out.push(
      {
        id: `village-${v.id}-ask`,
        lines: [
          { speaker: v.id, text: v.lines.ask },
          { speaker: v.id, text: v.lines.need },
          { speaker: v.id, text: `Ich brauche: ${stack(v.request)}.` },
        ],
      },
      { id: `village-${v.id}-thanks`, lines: [{ speaker: v.id, text: v.lines.thanks }] },
      { id: `village-${v.id}-after`, lines: [{ speaker: v.id, text: v.lines.after }] },
      { id: `village-${v.id}-restored`, lines: [{ speaker: v.id, text: v.lines.restored }] },
    );
  }
  return out;
}

/** One quest per quarter: help everyone who moved back. Completing it restores the quarter (systems/village.ts). */
export function villageQuests(): QuestDef[] {
  return VILLAGE_PARTS.map((part) => ({
    id: villageQuestId(part.id),
    title: `Erlenbrück erwacht: ${part.name}`,
    summary: part.description,
    startsWhen: part.openedBy,
    objectives: getVillagers(part.id).map((v) => ({
      type: 'flag' as const,
      flag: villagerHelpedFlag(v.id),
      description: `Hilf ${v.name} (${part.name}): ${stack(v.request)}.`,
      markers: [`npc:${v.id}`],
    })),
    rewardItems: part.rewardItems,
  }));
}
