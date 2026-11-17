/**
 * Almanach (in-game wiki), logic only; the panel is ui/WikiPanel.ts.
 *
 * Entries are generated from the content registries, so new plants, items, recipes, build
 * pieces and any new registry added to `content` show up without a hand-written page.
 * Registries without a dedicated writer below (animals, machines, ...) get a generic entry
 * from `name` + `description` and are always listed; gate them with `registerWikiSource`.
 *
 * Discovery is sticky: once an entry has been known it stays known, even after the item is
 * used up. Only `ext.wiki.seen` is saved, so old saves need no migration (the first scan
 * after loading picks up everything they already own or unlocked).
 */
import { content } from '../content';
import { VILLAGERS } from '../content/village';
import { MAPS } from '../world';
import type { BuildableDef, ItemDef, PlantDef, RecipeDef } from '../content/types';
import { WIKI_SECTION_ORDER, WIKI_SECTION_TITLES, WIKI_TOPICS } from '../content/wiki';
import { isBuildUnlocked } from './building';
import { isRecipeUnlocked } from './crafting';
import { bus } from './events';
import { gameState } from './state';

export interface WikiEntry {
  /** Unique across the wiki, e.g. `plants:lavender`. */
  key: string;
  /** Section id; see WIKI_SECTION_TITLES. */
  section: string;
  title: string;
  /** Clue shown when this entry is still unknown ("???"). */
  hint?: string;
  /** One paragraph per line; may be derived from other content. */
  lines: string[];
  /** Whether the player may read it now. Only evaluated until the first time it is true. */
  known: () => boolean;
}

export interface WikiSection {
  id: string;
  title: string;
  entries: { entry: WikiEntry; known: boolean }[];
}

/** Content registries handled above or meant to stay out of the generic path (tools are items too). */
const SKIPPED_REGISTRIES = new Set(['quests', 'dialogues', 'npcs', 'tools', 'villageParts']);
const OBSTACLE_NAMES: Record<string, string> = {
  bramble: 'Brombeergestrüpp',
  fallenTree: 'umgestürzte Bäume',
  tallGrass: 'hohes Gras',
  denseFog: 'dichten Nebel',
};

const MEAL_TEXT: Record<string, string> = {
  swift: '25 % schneller laufen',
  blightproof: 'die Welke bremst dich nicht',
};

const MAP_HINTS: Record<string, string> = {
  garden: 'Dein Startort — der Botanische Garten von Erlenbrück.',
  workshop: 'Die hölzerne Gartenhütte westlich des Hauptgartens.',
  'greenhouse-vestibule': 'Das gläserne Gewächshaus im Norden des Gartens (öffnet mit dem Schlüssel der Krähe am Ende von Episode 1).',
  'greenhouse-heart': 'Der innere Raum hinter dem Vorraum des Gewächshauses (öffnet mit Quellwasser vom Wasserturm in Episode 2).',
  tramline: 'Östlich der alten Bushaltestelle am Südrand des Gartens (ab Episode 2 zugänglich).',
  'water-tower': 'Am östlichen Ende der alten Trasse (Linie 3), hinter dem Dornengestrüpp (Episode 2).',
  'hill-path': 'Nördlich des Wasserturms geht ein Pfad den nebligen Hügel hinauf (ab Episode 3).',
  orchard: 'Jenseits des Nebelkamms am nördlichen Ende des Hügelpfads (Episode 3).',
  'orchard-cottage': 'Das kleine Gartenhaus auf der Nordwestseite der alten Obstwiesen (Episode 3).',
  'old-mill': 'Östlich der Obstwiesen entlang des alten Talwegs (ab Episode 4 zugänglich).',
  'mill-interior': 'Die Mahlstube im Inneren der Alten Mühle am Fluss (Episode 4).',
  'river-farms': 'Folge dem südlichen Flussweg (oder nimm den Kahn am Steg) von der Alten Mühle flussabwärts (Episode 4).',
};

const MAP_LOCATIONS: Record<string, string> = {
  garden: 'im Botanischen Garten',
  workshop: 'in der Gartenhütte',
  'greenhouse-vestibule': 'im Vorraum des Gewächshauses',
  'greenhouse-heart': 'im Herzraum des Gewächshauses',
  tramline: 'auf der alten Trasse (Linie 3)',
  'water-tower': 'am Wasserturm',
  'hill-path': 'am Hügelpfad',
  orchard: 'auf den alten Obstwiesen',
  'orchard-cottage': 'im Gartenhaus der Obstwiesen',
  'old-mill': 'bei der Alten Mühle am Fluss',
  'mill-interior': 'in der Mahlstube der Alten Mühle',
  'river-farms': 'bei den drei Höfen am Fluss',
};

const SEED_HINTS: Record<string, string> = {
  'seed-bramble-vine': 'Liegt beim runden Gartenplatz nahe der alten Mauer und im Norden des Botanischen Gartens.',
  'seed-glow-lily': 'Liegt am Teich im Botanischen Garten (Aufgabe „Drei verwilderte Beete“).',
  'seed-lavender': 'Liegt am westlichen Zaun des Botanischen Gartens (Aufgabe „Drei verwilderte Beete“).',
  'seed-moon-fern': 'Liegt im inneren Herzraum des Gewächshauses (Episode 2).',
  'seed-night-violet': 'M. schenkt sie dir auf der oberen Terrasse der Obstwiesen; weitere liegen beim Bienenstand (Episode 3).',
  'seed-hollyhock': 'Schenkt dir der Müller Jakob an der Alten Mühle; weitere liegen in der Mahlstube und auf den drei Höfen (Episode 4).',
  'seed-glowcap': 'Schimmert auf der alten Trasse (Linie 3) östlich der Weiche (Aufgabe „Leuchtkappen auf den Gleisen“).',
  'seed-thornroot': 'Liegt am Südhang des Hügelpfads, noch vor dem Nebel (Aufgabe „Lebende Dornenhecke“).',
  'seed-reed': 'Liegt an der Steinbrücke bei der Alten Mühle am Fluss (Aufgabe „Schilf für Steg und Floß“).',
  'seed-willow': 'Liegt am östlichen Hofzaun bei den drei Höfen am Fluss (Aufgabe „Geflochtener Schutz“).',
  'seed-honeyberry': 'Liegt am Ufer des Teichs östlich der Hauptbeete im Botanischen Garten (Aufgabe „Süße Beeren vom Teich“).',
  'seed-gold-turnip': 'Liegt im Südwesten der Hauptbeete im Botanischen Garten (Aufgabe „Goldrüben & Rübeneintopf“).',
};

const ITEM_HINTS: Record<string, string> = {
  trowel: 'Liegt noch im Werkzeugregal in der Gartenhütte, sobald du die drei alten Beete wiederhergestellt hast (Aufgabe „Das erste Werkzeug“).',
  'greenhouse-key': 'Die Krähe bewahrt ihn auf, bis die drei alten Beete blühen und die drei Tagebuchseiten gelesen sind.',
  'garden-saw': 'Liegt auf der Werkbank in der Gartenhütte, sobald Episode 1 abgeschlossen ist (Aufgabe „Der versperrte Uferweg“).',
  'tower-water-vial': 'Schenkt dir die Turmeule am Wasserturm, sobald Zisterne und Lichtbeet wieder laufen (Episode 2).',
  'orchard-apple-graft': 'Schenkt dir M. am Mutterbaum, wenn die Obstwiesen wieder erwachen (Ende Episode 3).',
  'pocket-workbench': 'Belohnung von M. für deinen ersten hergestellten Brombeer-Steckling (Aufgabe „Ein Steckling für die Dornen“).',
  'produce-egg': 'Legen Hühner in einem selbst gebauten Hühnerstall (Aufgabe „Bienen und Hühner im Garten“).',
  'produce-honey': 'Sammeln Bienen in einem selbst gebauten Bienenstock neben blühenden Beeten (Aufgabe „Bienen und Hühner im Garten“).',
  'craft-flour': 'Wird in einer selbst gebauten Windmühle aus 2 Ernten gemahlen (Aufgabe „Blütenmehl aus eigener Mühle“).',
  'resource-sunlight': 'Schimmert an offenen, sonnigen Stellen im Botanischen Garten und entlang der Wege.',
  'resource-dew': 'Sammelt sich in der Nähe von Wasser, Teichen und Flüssen (oder durch ein Entenhaus).',
  'resource-curio': 'Versteckt an abgelegenen Ecken, hinter Hindernissen oder am Flussufer (auch nachts als Geschenk oder im Treibgut-Netz).',
  'mat-wood': 'Wird ab Episode 2 an Holzstapeln am Gartenrand gehackt und schaltet den Baumodus frei.',
  'mat-stone': 'Wird ab Episode 2 an Steinhaufen am Gartenrand und entlang der Pfade gegraben.',
  'mat-scrap': 'Wird ab Episode 2 an Schrotthaufen an alten Zäunen und Gebäuden geborgen.',
};

const PAGE_HINTS: Record<string, string> = {
  'page-bramble': 'Schaltet sich frei durch die Tagebuchseite am Brombeerbeet im Botanischen Garten.',
  'page-lily': 'Schaltet sich frei durch die Tagebuchseite am Leuchtlilien-Beet im Botanischen Garten.',
  'page-lavender': 'Schaltet sich frei durch die Tagebuchseite am Lavendel-Beet im Botanischen Garten.',
  'page-mohn': 'Schaltet sich frei durch den wetterfesten Zettel am Zaunpfahl auf der Lichtung der alten Trasse (Linie 3).',
  'page-tower': 'Schaltet sich frei durch M.s Notiz am Geländer des Wasserturm-Platzes.',
  'page-heart': 'Schaltet sich frei durch M.s Brief im inneren Herzraum des Gewächshauses.',
  'page-orchard': 'Schaltet sich frei durch M.s Notizbuch in ihrem Gartenhaus auf den alten Obstwiesen.',
  'page-mill': 'Schaltet sich frei durch die Chronik in der Mahlstube der Alten Mühle am Fluss.',
};

const NPC_HINTS: Record<string, string> = {
  crow: 'Sitzt gleich zu Beginn beim Baumstumpf vor der Gartenhütte im Botanischen Garten.',
  mohn: 'Grast auf der südlichen Lichtung der alten Trasse (Linie 3), erreichbar nach Episode 1.',
  owl: 'Sitzt auf der Mauer am Wasserturm am östlichen Ende von Linie 3 (Episode 2).',
  m: 'Wartet auf der oberen Terrasse beim alten Mutterbaum auf den Obstwiesen (Episode 3).',
  jakob: 'Steht vor dem Mühlhaus der Alten Mühle am Fluss östlich der Obstwiesen (Episode 4).',
};

const VILLAGE_PART_NPC_HINTS: Record<string, string> = {
  plaza: 'Kehrt am alten Dorfplatz bei der Bushaltestelle ein, sobald der Platz nach der Chronik von Erlenbrück erwacht.',
  farms: 'Kehrt auf den drei Höfen am Fluss ein, sobald dieser Ortsteil nach der Chronik von Erlenbrück erwacht.',
  orchard: 'Kehrt auf dem Obsthof im Osten der alten Obstwiesen ein, sobald dieser Ortsteil nach der Chronik von Erlenbrück erwacht.',
};

const extraSources: (() => WikiEntry[])[] = [];

/** Add entries a registry cannot express (or gate generic ones). Call at module load. */
export function registerWikiSource(source: () => WikiEntry[]): void {
  extraSources.push(source);
}

function itemName(itemId: string): string {
  return content.items.find(itemId)?.name ?? itemId;
}

function stack(list: { itemId: string; count: number }[]): string {
  return list.map((c) => `${c.count} × ${itemName(c.itemId)}`).join(', ');
}

function owned(itemId: string): boolean {
  return gameState.getItemCount(itemId) > 0 || readExt().seen.includes(`items:${itemId}`);
}

function seedHint(seedItemId?: string): string {
  if (!seedItemId) return 'Finde die zugehörigen Samen beim Erkunden von Erlenbrück.';
  if (SEED_HINTS[seedItemId]) return SEED_HINTS[seedItemId];
  const places = Object.values(MAPS)
    .filter((m) => m.resourceNodes?.some((n) => n.itemId === seedItemId))
    .map((m) => MAP_LOCATIONS[m.id] ?? m.name);
  if (places.length) return `Samen liegen ${[...new Set(places)].join(' oder ')}.`;
  return 'Finde die zugehörigen Samen beim Erkunden von Erlenbrück.';
}

function recipeHint(recipe: RecipeDef): string {
  const flag = recipe.requiresFlag;
  if (!flag) return 'Wird an einer Werkbank aus Ernte und Rohstoffen hergestellt.';
  if (flag.startsWith('journal-read:')) {
    const pageId = flag.slice('journal-read:'.length);
    return PAGE_HINTS[pageId] ?? 'Wird freigeschaltet, sobald die zugehörige Tagebuchseite gelesen wurde.';
  }
  if (flag.startsWith('harvested:')) {
    const produceId = flag.slice('harvested:'.length);
    const plant = content.plants.all().find((p) => p.produceItemId === produceId);
    return `Schaltet sich von selbst frei, sobald du die passende Frucht das erste Mal im Beet erntest. ${seedHint(plant?.seedItemId)}`;
  }
  if (flag === 'collected-flour') {
    return 'Schaltet sich frei, sobald du zum ersten Mal Blütenmehl in einer Windmühle oder am Mahlstein der Alten Mühle mahlst.';
  }
  if (flag === 'harvested-once' || flag === 'gathered-material') {
    return 'Schaltet sich in Episode 2 frei, sobald du ein reifes Beet geerntet und Baumaterial gesammelt hast (Aufgabe „Werkzeuge für das Tagwerk“).';
  }
  if (flag.startsWith('built:')) {
    return 'Schaltet sich frei, sobald du im Baumodus einmal ein Licht-Bauwerk (Laterne) aufgestellt hast (Aufgabe „Licht an langer Stange“).';
  }
  return 'Wird beim Spielen von Erlenbrück freigeschaltet und an einer Werkbank hergestellt.';
}

function itemHint(item: ItemDef): string {
  if (ITEM_HINTS[item.id]) return ITEM_HINTS[item.id];
  if (item.category === 'seed') return seedHint(item.id);
  if (item.category === 'produce') {
    const plant = content.plants.all().find((p) => p.produceItemId === item.id);
    return `Wächst als Ernte auf einem gepflegten Beet. ${seedHint(plant?.seedItemId)}`;
  }
  const madeBy = content.recipes.all().filter((r) => r.result.some((x) => x.itemId === item.id));
  if (madeBy.length) return `Wird an einer Werkbank gefertigt. ${recipeHint(madeBy[0])}`;
  return 'Wird durch Aufgaben, Erkundung oder an der Werkbank in Erlenbrück gefunden.';
}

function triggerHint(flag: string): string {
  if (flag === 'episode-1-complete') return 'Abschluss von Episode 1 („Was hinter dem Glas wartet“)';
  if (flag === 'episode-2-complete') return 'Abschluss von Episode 2 („Das Herz des Gewächshauses“)';
  if (flag === 'episode-3-complete') return 'Abschluss von Episode 3 („Wenn die Obstwiesen erwachen“)';
  if (flag === 'episode-4-complete') return 'Abschluss von Episode 4 („Rückkehr nach Erlenbrück“)';
  if (flag === 'chronicle-ending-garden') return 'deine Entscheidung in der Chronik von Erlenbrück (Garten-Ende)';
  if (flag === 'chronicle-ending-valley') return 'deine Entscheidung in der Chronik von Erlenbrück (Tal-Ende)';
  if (flag === 'chronicle-ending-future') return 'deine Entscheidung in der Chronik von Erlenbrück (Zukunfts-Ende)';
  if (flag.startsWith('quest-completed:')) {
    const id = flag.slice('quest-completed:'.length);
    const title = content.quests.find(id)?.title ?? id;
    return `Abschluss der Aufgabe „${title}“`;
  }
  if (flag.startsWith('journal-read:')) {
    const pageId = flag.slice('journal-read:'.length);
    return PAGE_HINTS[pageId]?.replace(/^Schaltet sich frei durch /, 'Lesen von ') ?? 'Lesen einer zugehörigen Notizseite';
  }
  if (flag.startsWith('bed-restored:')) return 'Wiederherstellung eines der drei alten Gartenbeete';
  return 'weiteres Voranschreiten in der Geschichte';
}

function itemEntry(item: ItemDef): WikiEntry {
  const lines = [item.description];
  const tool = content.tools.find(item.id);
  if (tool) lines.push(tool.hint);
  if (item.meal) lines.push(`Essen im Beutel: ${MEAL_TEXT[item.meal.effect] ?? item.meal.effect}, ${item.meal.minutes} Minuten.`);
  const seedOf = content.plants.all().filter((p) => p.seedItemId === item.id);
  const yieldOf = content.plants.all().filter((p) => p.produceItemId === item.id);
  if (seedOf.length) lines.push(`Daraus wächst: ${seedOf.map((p) => p.name).join(', ')}.`);
  if (yieldOf.length) lines.push(`Wird geerntet von: ${yieldOf.map((p) => p.name).join(', ')}.`);
  const madeBy = content.recipes.all().filter((r) => r.result.some((x) => x.itemId === item.id));
  if (madeBy.length) lines.push(`Wird an der Werkbank hergestellt: ${madeBy.map((r) => r.name).join(', ')}.`);
  const usedIn = content.recipes.all().filter((r) => r.cost.some((x) => x.itemId === item.id));
  if (usedIn.length) lines.push(`Gebraucht für: ${usedIn.map((r) => r.name).join(', ')}.`);
  const builds = content.buildables.all().filter((b) => b.cost.some((x) => x.itemId === item.id));
  if (builds.length) lines.push(`Gebraucht zum Bauen: ${builds.map((b) => b.name).join(', ')}.`);
  return {
    key: `items:${item.id}`,
    section: `items:${item.category}`,
    title: item.name,
    hint: itemHint(item),
    lines,
    known: () => owned(item.id),
  };
}

function plantEntry(plant: PlantDef): WikiEntry {
  const lines = [plant.description];
  if (plant.seedItemId) lines.push(`Samen: ${itemName(plant.seedItemId)}.`);
  if (plant.produceItemId) lines.push(`Ernte: ${itemName(plant.produceItemId)}.`);
  lines.push(`Wächst in ${plant.growthStages} Stufen.`);
  if (plant.clears?.length) lines.push(`Räumt, wenn ausgewachsen: ${plant.clears.map((k) => OBSTACLE_NAMES[k] ?? k).join(', ')}.`);
  if (plant.lightRadius) lines.push('Leuchtet nachts und hält die Dunkelheit zurück.');
  lines.push(`Hält als reife Pflanze die Welke im Umkreis von ${plant.wardRadius ?? 3} Feldern fern.`);
  const seeds = [plant.seedItemId, plant.produceItemId].filter((id): id is string => Boolean(id));
  return {
    key: `plants:${plant.id}`,
    section: 'plants',
    title: plant.name,
    hint: `Wird bekannt, sobald du ihre Samen oder Ernte findest. ${seedHint(plant.seedItemId)}`,
    lines,
    known: () => seeds.length === 0 || seeds.some(owned),
  };
}

function recipeEntry(recipe: RecipeDef): WikiEntry {
  return {
    key: `recipes:${recipe.id}`,
    section: 'recipes',
    title: recipe.name,
    hint: recipeHint(recipe),
    lines: [`Ergibt: ${stack(recipe.result)}.`, `Zutaten: ${stack(recipe.cost)}.`, 'Wird an einer Werkbank hergestellt.'],
    known: () => isRecipeUnlocked(recipe),
  };
}

function buildableEntry(piece: BuildableDef): WikiEntry {
  const lines = [piece.description];
  if (piece.on === 'forest') lines.push(`Kosten: ${stack(piece.cost)}. Der Wald wächst nicht zurück.`, 'Geht nur an Waldstücken, die an freien Boden grenzen.');
  else {
    lines.push(
      piece.cost.length === 0
        ? 'Kostenlos. Du kannst es jederzeit wieder entfernen.'
        : `Kosten: ${stack(piece.cost)}. Beim Abbauen bekommst du alles zurück.`,
    );
    lines.push(piece.on === 'water' ? 'Wird auf Wasser mit Anschluss ans Ufer oder einen Steg gebaut.' : 'Wird auf freiem Boden gebaut.');
  }
  if (piece.wardRadius) lines.push(`Hält die Welke im Umkreis von ${piece.wardRadius} Feldern fern.`);
  if (piece.lightRadius) lines.push('Leuchtet nachts.');
  if (piece.planter) {
    const slots = piece.planter.cols * piece.planter.rows;
    lines.push(slots === 1 ? 'Hier wächst eine Pflanze nach Wahl.' : `Hier wachsen bis zu ${slots} Pflanzen nebeneinander.`);
  }
  if (piece.boat) lines.push('Hier kannst du ins Ruderboot steigen und frei übers Wasser fahren.');
  if (piece.rest) lines.push('Hier kannst du rasten: Die Nacht vergeht bis 7 Uhr.');
  return {
    key: `buildables:${piece.id}`,
    section: 'buildables',
    title: piece.name,
    hint: 'Schaltet sich im Baumodus frei, sobald du ab Episode 2 zum ersten Mal Holz, Feldstein oder Schrott am Gartenrand sammelst.',
    lines,
    known: isBuildUnlocked,
  };
}

function npcEntries(): WikiEntry[] {
  const villagerPartById = new Map(VILLAGERS.map((v) => [v.id, v.partId]));
  return content.npcs.all().map((npc) => {
    const maps = Object.values(MAPS)
      .filter((m) => m.npcs?.some((p) => p.npcId === npc.id))
      .map((m) => m.name);
    const lines = [npc.description];
    if (maps.length) lines.push(`Zu finden: ${maps.join(', ')}.`);
    const partId = villagerPartById.get(npc.id);
    const hint = NPC_HINTS[npc.id] ?? (partId ? VILLAGE_PART_NPC_HINTS[partId] : undefined) ?? 'Begegne dieser Person beim Erkunden von Erlenbrück.';
    return { key: `persons:${npc.id}`, section: 'persons', title: npc.name, hint, lines, known: () => false };
  });
}

function placeEntries(): WikiEntry[] {
  return Object.values(MAPS).map((map) => {
    const visited = map.zones.filter((z) => gameState.hasVisitedZone(z.id)).map((z) => z.name);
    const lines = [
      map.indoor ? 'Ein Raum drinnen: Mohn wartet draußen, und gebaut wird hier nicht.' : 'Draußen: hier kannst du reiten und bauen.',
    ];
    if (visited.length) lines.push(`Schon besucht: ${visited.join(', ')}.`);
    if (map.blightHearts?.length) lines.push(`Die Welke hat hier ${map.blightHearts.length === 1 ? 'ein Herz' : `${map.blightHearts.length} Herzen`}.`);
    const people = (map.npcs ?? []).map((p) => content.npcs.find(p.npcId)?.name).filter((n): n is string => Boolean(n));
    if (people.length) lines.push(`Hier triffst du: ${[...new Set(people)].join(', ')}.`);
    return {
      key: `places:${map.id}`,
      section: 'places',
      title: map.name,
      hint: MAP_HINTS[map.id] ?? 'Wird bekannt, sobald du diese Gegend zum ersten Mal betrittst.',
      lines,
      known: () => map.zones.some((z) => gameState.hasVisitedZone(z.id)),
    };
  });
}

function storyEntries(): WikiEntry[] {
  return content.quests.all().map((quest) => {
    const done = gameState.isQuestCompleted(quest.id);
    const lines = [quest.summary, ...quest.objectives.map((o) => `• ${o.description}`)];
    const reward = quest.rewardItems?.length ? `Belohnung: ${stack(quest.rewardItems)}.` : '';
    if (reward) lines.push(reward);
    lines.push(done ? 'Erledigt.' : 'Noch offen.');
    const reasons = [...new Set((quest.startsWhen ?? []).map(triggerHint))];
    const hint = quest.autoStart
      ? 'Startet automatisch zu Beginn des Spiels.'
      : reasons.length
        ? `Beginnt nach: ${reasons.join(' oder ')}.`
        : 'Beginnt im weiteren Verlauf deiner Reise durch Erlenbrück.';
    return {
      key: `story:${quest.id}`,
      section: 'story',
      title: quest.title,
      hint,
      lines,
      known: () => done || gameState.isQuestActive(quest.id),
    };
  });
}

function genericEntries(registry: string, defs: Record<string, unknown>[]): WikiEntry[] {
  return defs.map((def) => {
    const lines = [String(def.description ?? '')].filter(Boolean);
    const cost = def.cost;
    if (Array.isArray(cost) && cost.length > 0) lines.push(`Kosten: ${stack(cost as { itemId: string; count: number }[])}.`);
    return {
      key: `${registry}:${def.id}`,
      section: registry,
      title: String(def.name ?? def.id),
      hint: 'Wird beim Spielen in Erlenbrück entdeckt.',
      lines,
      known: () => true,
    };
  });
}

/** All entries, rebuilt from the registries each call (cheap: a few dozen definitions). */
export function getWikiEntries(): WikiEntry[] {
  const out: WikiEntry[] = WIKI_TOPICS.map((t) => ({
    key: `topics:${t.id}`,
    section: 'topics',
    title: t.title,
    hint: t.hint ?? 'Wird im Verlauf deiner Reise durch Erlenbrück bekannt.',
    lines: t.lines,
    known: () =>
      t.requiresAnyFlag
        ? t.requiresAnyFlag.some((f) => gameState.hasFlag(f))
        : !t.requiresFlag || gameState.hasFlag(t.requiresFlag),
  }));
  out.push(...content.plants.all().map(plantEntry));
  out.push(...content.items.all().filter((i) => i.category !== 'note').map(itemEntry));
  out.push(...content.recipes.all().map(recipeEntry));
  out.push(...content.buildables.all().map(buildableEntry));
  out.push(...npcEntries(), ...placeEntries(), ...storyEntries());
  for (const [registry, reg] of Object.entries(content)) {
    if (['plants', 'items', 'recipes', 'buildables'].includes(registry) || SKIPPED_REGISTRIES.has(registry)) continue;
    out.push(...genericEntries(registry, (reg as unknown as { all(): Record<string, unknown>[] }).all()));
  }
  for (const source of extraSources) out.push(...source());
  return out;
}

function sectionTitle(id: string): string {
  return WIKI_SECTION_TITLES[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

interface WikiExt {
  seen: string[];
}

function readExt(): WikiExt {
  return gameState.getExt<WikiExt>('wiki', { seen: [] });
}

function seen(): Set<string> {
  return new Set(readExt().seen);
}

export function isWikiEntryKnown(entry: WikiEntry): boolean {
  return seen().has(entry.key) || entry.known();
}

/** Entries grouped and ordered for display. Unknown entries are listed so the player sees what is left. */
export function getWikiSections(): WikiSection[] {
  const known = seen();
  const byId = new Map<string, WikiSection>();
  for (const entry of getWikiEntries()) {
    let section = byId.get(entry.section);
    if (!section) {
      section = { id: entry.section, title: sectionTitle(entry.section), entries: [] };
      byId.set(entry.section, section);
    }
    section.entries.push({ entry, known: known.has(entry.key) || entry.known() });
  }
  const rank = (id: string) => {
    const i = WIKI_SECTION_ORDER.indexOf(id);
    return i < 0 ? WIKI_SECTION_ORDER.length : i;
  };
  return [...byId.values()].sort((a, b) => rank(a.id) - rank(b.id));
}

let scanned = false;

/** Record everything that is known now. Toasts for new entries once the first scan is done. */
export function refreshWiki(): void {
  const have = seen();
  const fresh = getWikiEntries().filter((e) => !have.has(e.key) && e.known());
  if (fresh.length === 0) {
    scanned = true;
    return;
  }
  gameState.setExt<WikiExt>('wiki', { seen: [...have, ...fresh.map((e) => e.key)] });
  if (scanned) {
    const notable = fresh.filter((e) => !e.key.startsWith('items:'));
    if (notable.length > 0) bus.emit('toast', { text: `Neu im Almanach: ${notable[0].title}` });
  }
  scanned = true;
}

/** Persons are met by talking to them, which no game state records, so remember it here. */
function markKnown(key: string): void {
  const have = seen();
  if (have.has(key)) return;
  gameState.setExt<WikiExt>('wiki', { seen: [...have, key] });
  const entry = getWikiEntries().find((e) => e.key === key);
  if (entry) bus.emit('toast', { text: `Neu im Almanach: ${entry.title}` });
}

/** Wire up discovery. Call once at boot, after the bus and game state exist. */
export function startWiki(): void {
  for (const event of ['inventory-changed', 'flag-changed', 'build-changed', 'plant-planted', 'item-crafted', 'quest-updated', 'area-changed'] as const) {
    bus.on(event, refreshWiki);
  }
  bus.on('interacted', ({ id }) => {
    if (id.startsWith('npc:')) markKnown(`persons:${id.slice(4)}`);
  });
  bus.on('save-loaded', () => {
    scanned = false;
    refreshWiki();
  });
  refreshWiki();
}
