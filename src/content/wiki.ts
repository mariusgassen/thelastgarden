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
  /** Alternative to `requiresFlag`: listed once ANY of these is set. */
  requiresAnyFlag?: string[];
}

/** Section titles by id. Registries nobody listed here show up under their capitalised key. */
export const WIKI_SECTION_TITLES: Record<string, string> = {
  topics: 'So funktioniert’s',
  persons: 'Personen',
  places: 'Orte',
  story: 'Geschichte',
  village: 'Erlenbrück',
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
  'items:meal': 'Mahlzeiten',
};

/** Display order of the sections; anything not listed follows in the order it appears. */
export const WIKI_SECTION_ORDER = [
  'topics',
  'persons',
  'places',
  'story',
  'village',
  'plants',
  'items:seed',
  'items:produce',
  'items:resource',
  'items:meal',
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
  {
    id: 'tools',
    title: 'Werkzeuge',
    requiresFlag: 'harvested-once',
    lines: [
      'Werkzeuge baust du an der Werkbank. Sie werden nie verbraucht, und jedes gibt es nur einmal. Mit T öffnest du die Werkzeugleiste (oder tippst auf den Knopf); Taste 1–4 wählt eines.',
      'Sichel, Spaten und Saatbeutel wirken beim Tippen oder mit E rund um dich. Die Stablaterne leuchtet einfach mit, wohin du gehst, und trocknet Welke in ihrer Nähe aus.',
    ],
  },
  {
    id: 'animals',
    title: 'Helfende Tiere',
    requiresAnyFlag: ['built:beehive', 'built:henhouse', 'built:goatpen', 'built:stable'],
    lines: [
      'Tiere ziehen von selbst in ein Zuhause, das du baust. Du musst sie nicht füttern, und nichts geht verloren, wenn du sie alleinlässt.',
      'Bienen beschleunigen Beete in der Nähe und füllen den Stock mit Honig. Hühner halten Schnecken von Beeten fern und legen Eier. Die Ziege frisst jede Nacht Welke weg und öffnet Dornengestrüpp. Ein Stall hält Mohn ausgeruht und schneller.',
    ],
  },
  {
    id: 'machines',
    title: 'Arbeitende Bauten',
    requiresAnyFlag: ['built:rain-barrel', 'built:compost', 'built:drying-rack', 'built:windmill'],
    lines: [
      'Regentonne und Komposthaufen lassen Beete in der Nähe schneller wachsen. Das Trockengestell macht aus einer Ernte Samen, die Windmühle aus Ernte Blütenmehl.',
      'Tippe auf die Anlage, um sie zu füllen oder etwas abzuholen. Sie arbeiten auch weiter, während du woanders bist.',
    ],
  },
  {
    id: 'meals',
    title: 'Essen',
    requiresAnyFlag: ['harvested:produce-honeyberry', 'harvested:produce-gold-turnip'],
    lines: [
      'Nahrhafte Ernte wird an der Werkbank zu Mahlzeiten. Du isst sie im Beutel mit dem Essen-Knopf; ihre Wirkung hält ein paar Minuten.',
      'Hunger gibt es nicht. Essen ist eine kleine Hilfe, keine Pflicht.',
    ],
  },
];
