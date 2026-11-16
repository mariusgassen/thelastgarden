/**
 * Almanach (in-game wiki). Plants, items, recipes and build pieces get their entries
 * generated from their own definitions (systems/wiki.ts); only the how-it-works topics and
 * the German section names live here.
 */

export interface WikiTopicDef {
  id: string;
  title: string;
  /** One paragraph per line. */
  lines: string[];
  /** The topic is listed once this flag is set; omit for always known. */
  requiresFlag?: string;
}

/** Section titles by id. Registries nobody listed here show up under their capitalised key. */
export const WIKI_SECTION_TITLES: Record<string, string> = {
  topics: 'So funktioniert’s',
  plants: 'Pflanzen',
  animals: 'Tiere',
  machines: 'Maschinen',
  tools: 'Werkzeuge',
  recipes: 'Rezepte',
  buildables: 'Bauteile',
  'items:seed': 'Samen',
  'items:produce': 'Ernte',
  'items:resource': 'Rohstoffe',
  'items:material': 'Baumaterial',
  'items:tool': 'Werkzeug & Zubehör',
  'items:key': 'Schlüssel & Andenken',
};

/** Display order of the sections; anything not listed follows in the order it appears. */
export const WIKI_SECTION_ORDER = [
  'topics',
  'plants',
  'items:seed',
  'items:produce',
  'items:resource',
  'items:material',
  'recipes',
  'buildables',
  'items:tool',
  'tools',
  'machines',
  'animals',
  'items:key',
];

export const WIKI_TOPICS: WikiTopicDef[] = [
  {
    id: 'controls',
    title: 'Steuerung',
    lines: [
      'Laufen: Pfeiltasten oder WASD, am Handy der Joystick links unten. Mit E, Leertaste oder dem runden Knopf sprichst du, pflückst und benutzt du, was vor dir steht.',
      'Aufgaben: Q oder Tab. Beutel: I. Almanach: H. Mit Esc schließt du jedes Fenster.',
    ],
  },
  {
    id: 'day-night',
    title: 'Tag und Nacht',
    lines: [
      'Ein Tag im Garten dauert vier Minuten. Nachts wird es dunkel; nur Laternen und leuchtende Pflanzen halten einen Kreis hell.',
      'In manchen Nächten kommt etwas vorbei: Schnecken, Wühlmäuse, Krähen oder Regen. Wie gut dein Garten gewappnet ist, entscheidet, ob am Morgen etwas gelitten hat.',
    ],
  },
  {
    id: 'growing',
    title: 'Pflanzen und Ernten',
    lines: [
      'Samen kommen in ein Beet. Die Pflanze wächst Stufe um Stufe von selbst, auch während du woanders bist.',
      'Reife Pflanzen tragen Ernte, die alle 60 Sekunden nachwächst. Jede dritte Ernte lässt einen neuen Samen fallen. Tau lässt eine Pflanze einmal pro Stufe eine Stufe überspringen.',
    ],
  },
  {
    id: 'crafting',
    title: 'Werkbank und Rezepte',
    lines: [
      'An einer Werkbank (Werkstatt, Kräuterregal, Mühle) baust du aus Ernte und Rohstoffen neue Dinge. Rezepte lernst du, indem du Seiten aus M.s Tagebuch liest.',
      'Wer die Werkzeugrolle trägt, kann die Werkbank auch unterwegs öffnen (Taste C oder im Beutel).',
    ],
  },
  {
    id: 'building',
    title: 'Bauen',
    requiresFlag: 'gathered-material',
    lines: [
      'Sammle Holz, Feldstein und Schrott von den Haufen draußen. Danach schaltest du den Baumodus mit B oder dem Hammerknopf ein.',
      'Wähle unten ein Bauteil (Taste 1–6) und tippe auf ein freies Feld in Reichweite. Auf ein gebautes Teil tippen nimmt es zurück, und du bekommst alles zurück. Drinnen und auf der Welke kannst du nicht bauen.',
    ],
  },
  {
    id: 'blight',
    title: 'Die Welke',
    requiresFlag: 'episode-1-complete',
    lines: [
      'Seit der Gewächshaus-Geschichte kriecht jede Nacht grauer Welkenbelag von seinen Herzen aus über das Land. Sechs Felder pro Herz und Nacht, nie weiter als bis zur Reichweite des Herzens.',
      'Auf der Welke gehst du langsamer, kannst nichts bauen, und nachwachsende Fundstücke bleiben aus. Verlieren kannst du nichts.',
      'Zäune, Hecken und Bauteile stoppen sie. Laternen, Hecken, Unterstände und reife Pflanzen halten Felder um sich herum frei. Schützt du ein Herz selbst, trocknet alles ab, was von ihm kommt.',
    ],
  },
  {
    id: 'horse',
    title: 'Mohn, das Pferd',
    requiresFlag: 'horse-tamed',
    lines: [
      'Draußen reitest du mit R oder dem Hufeisenknopf, fast doppelt so schnell wie zu Fuß. Drinnen steigst du automatisch ab.',
    ],
  },
  {
    id: 'town-map',
    title: 'Stadtkarte',
    requiresFlag: 'greenhouse-hint-read',
    lines: [
      'Die Karte öffnest du mit M oder dem Kartenknopf. Sie zeigt jede Gegend, die du schon besucht hast; ein Tipp darauf bringt dich sofort dorthin. Das ist kostenlos und geht auch ohne Pferd.',
    ],
  },
];
