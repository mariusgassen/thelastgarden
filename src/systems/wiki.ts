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
  return { key: `items:${item.id}`, section: `items:${item.category}`, title: item.name, lines, known: () => owned(item.id) };
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
    lines,
    known: () => seeds.length === 0 || seeds.some(owned),
  };
}

function recipeEntry(recipe: RecipeDef): WikiEntry {
  return {
    key: `recipes:${recipe.id}`,
    section: 'recipes',
    title: recipe.name,
    lines: [`Ergibt: ${stack(recipe.result)}.`, `Zutaten: ${stack(recipe.cost)}.`, 'Wird an einer Werkbank hergestellt.'],
    known: () => isRecipeUnlocked(recipe),
  };
}

function buildableEntry(piece: BuildableDef): WikiEntry {
  const lines = [piece.description, `Kosten: ${stack(piece.cost)}. Beim Abbauen bekommst du alles zurück.`];
  lines.push(piece.on === 'water' ? 'Wird auf Wasser neben dem Ufer gebaut.' : 'Wird auf freiem Boden gebaut.');
  if (piece.wardRadius) lines.push(`Hält die Welke im Umkreis von ${piece.wardRadius} Feldern fern.`);
  if (piece.lightRadius) lines.push('Leuchtet nachts.');
  if (piece.planter) lines.push('Hier kannst du eine Pflanze einsetzen.');
  if (piece.rest) lines.push('Hier kannst du rasten: Die Nacht vergeht bis 7 Uhr.');
  return { key: `buildables:${piece.id}`, section: 'buildables', title: piece.name, lines, known: isBuildUnlocked };
}

function npcEntries(): WikiEntry[] {
  return content.npcs.all().map((npc) => {
    const maps = Object.values(MAPS)
      .filter((m) => m.npcs?.some((p) => p.npcId === npc.id))
      .map((m) => m.name);
    const lines = [npc.description];
    if (maps.length) lines.push(`Zu finden: ${maps.join(', ')}.`);
    return { key: `persons:${npc.id}`, section: 'persons', title: npc.name, lines, known: () => false };
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
    return {
      key: `story:${quest.id}`,
      section: 'story',
      title: quest.title,
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
