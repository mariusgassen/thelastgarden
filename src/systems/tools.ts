/**
 * Tools and gadgets: a sickle, a shovel, a seed satchel and a lantern on a pole. No Phaser
 * dependency — rendering and the carried light live in systems/toolLayer.ts.
 *
 * Tools are ordinary `category: 'tool'` items (content/items.ts) made at a workbench, plus a
 * `ToolDef` (content/tools.ts). They are never used up and nothing can be sold.
 *
 * State: `ext.tools = { equipped?, seed?, carried? }` — which tool is in hand, which seed the
 * satchel sows, and the plant the shovel is carrying (it keeps its growth). Tool mode
 * (the tool bar is open, E / a tap uses the tool) is runtime only.
 *
 *   getOwnedTools() / getEquippedTool() / equipTool(id)
 *   getToolMode() / setToolMode(open) / isToolActing()   emits `tool-changed`
 *   useTool(mapId, at)         work the beds around a point; returns what to tell the player
 *   getCarriedLight()          the equipped lantern's light, or null
 *   getSowSeed() / cycleSeed() / getCarriedPlant() / describeTool(id)
 */
import { content } from '../content';
import type { ToolDef, ToolKind } from '../content/types';
import { allPlantingBeds } from '../world';
import { TILE_SIZE } from '../world/tiles';
import { collectProduce, getHomes, readyProduce, type Home } from './animals';
import { getBuildMode, setBuildMode } from './building';
import { bus } from './events';
import {
  bedAccepts,
  harvestBed,
  isBedPlanted,
  isProduceReady,
  plantSeed,
  transplantInto,
  uprootBed,
  type UprootedPlant,
} from './plants';
import { collectNode, getResourceNodes, isNodeAvailable, isNodeBlighted, type ResourceNodeWithMap } from './resources';
import { gameState } from './state';

interface ToolsExt {
  equipped?: string;
  /** Plant id of the seed the satchel sows. */
  seed?: string;
  carried?: UprootedPlant;
}

export interface ToolResult {
  ok: boolean;
  text: string;
  /** Which tool did the work (for the effects); matters when the all-round hand picked one. */
  used?: ToolKind;
  /** Where something happened, in px (the plant's base), for the scene's puffs. */
  spots: { x: number; y: number }[];
}

function readState(): ToolsExt {
  return gameState.getExt<ToolsExt>('tools', {});
}

function writeState(state: ToolsExt): void {
  gameState.setExt('tools', state);
}

const itemName = (itemId: string): string => content.items.get(itemId).name;

/** Tools the player carries, in the order of content/tools.ts. */
export function getOwnedTools(): ToolDef[] {
  return content.tools.all().filter((t) => gameState.getItemCount(t.id) > 0);
}

/** Pseudo tool id of the all-round hand: it picks sickle, satchel or spade by what the spot needs. */
export const AUTO_TOOL = 'auto';
/** Pseudo tool id of the deselect slot in the tool picker. */
export const DESELECT_TOOL = 'none';

/** Tools that work on beds (everything but the lantern). */
function getWorkTools(): ToolDef[] {
  return getOwnedTools().filter((t) => t.kind !== 'light');
}

/** True while the all-round hand is the pick (and there is a tool for it to use). */
export function isAutoTool(): boolean {
  return readState().equipped === AUTO_TOOL && getWorkTools().length > 0;
}

/** Whether the all-round hand can be offered: it needs at least one tool that works on beds. */
export function canUseAutoTool(): boolean {
  return getWorkTools().length > 0;
}

export function getEquippedTool(): ToolDef | undefined {
  const id = readState().equipped;
  return id && gameState.getItemCount(id) > 0 ? content.tools.find(id) : undefined;
}

// ── Tool mode (runtime only) ─────────────────────────────────

const mode = { open: false };

export function getToolMode(): Readonly<typeof mode> {
  return mode;
}

function announce(): void {
  bus.emit('tool-changed', { toolId: getEquippedTool()?.id ?? null, active: mode.open });
}

export function setToolMode(open: boolean): void {
  if (open && getOwnedTools().length === 0) return;
  if (mode.open === open) return;
  mode.open = open;
  if (open) setBuildMode(false);
  announce();
}

/** While a tool that works on the world is in hand (and build mode is off), E, taps and the action button use it instead of interacting. */
export function isToolActing(): boolean {
  if (getBuildMode().active) return false;
  const tool = getEquippedTool();
  return isAutoTool() || (tool !== undefined && tool.kind !== 'light');
}

/** Puts a tool in hand (`null` = hands free). The lantern needs no tool mode: it just shines. */
export function equipTool(toolId: string | null): boolean {
  if (toolId === AUTO_TOOL ? !canUseAutoTool() : toolId !== null && !getOwnedTools().some((t) => t.id === toolId)) return false;
  const state = readState();
  if (toolId === null) delete state.equipped;
  else state.equipped = toolId;
  writeState(state);
  if (toolId !== null && toolId !== AUTO_TOOL && content.tools.get(toolId).kind === 'light') mode.open = false;
  gameState.save();
  announce();
  return true;
}

bus.on('build-mode-changed', ({ active }) => {
  if (active && mode.open) {
    mode.open = false;
    announce();
  }
});
bus.on('save-loaded', () => {
  mode.open = false;
});
bus.on('inventory-changed', () => {
  const state = readState();
  const gone = state.equipped === AUTO_TOOL ? !canUseAutoTool() : state.equipped && gameState.getItemCount(state.equipped) === 0;
  if (state.equipped && gone) {
    delete state.equipped;
    writeState(state);
  }
  if (mode.open && getOwnedTools().length === 0) mode.open = false;
});
// The first tool made goes straight into the hand.
bus.on('item-crafted', ({ recipeId }) => {
  const recipe = content.recipes.find(recipeId);
  const made = recipe?.result.find((r) => content.tools.has(r.itemId));
  if (made && !getEquippedTool()) equipTool(made.itemId);
});

// ── Seeds and the carried plant ──────────────────────────────

/** Species the satchel could sow right now: every kind of seed in the pocket. */
export function getSowableSpecies(): string[] {
  return content.plants
    .all()
    .filter((p) => p.seedItemId !== undefined && gameState.getItemCount(p.seedItemId) > 0)
    .map((p) => p.id);
}

/** The species the satchel sows: the picked one while its seeds last, else the first kind in the pocket. */
export function getSowSeed(): string | undefined {
  const species = getSowableSpecies();
  const picked = readState().seed;
  return picked && species.includes(picked) ? picked : species[0];
}

/** Picks the next kind of seed for the satchel. Returns the new choice. */
export function cycleSeed(): string | undefined {
  const species = getSowableSpecies();
  if (species.length === 0) return undefined;
  const next = species[(species.indexOf(getSowSeed() as string) + 1) % species.length];
  const state = readState();
  state.seed = next;
  writeState(state);
  announce();
  return next;
}

export function getCarriedPlant(): UprootedPlant | undefined {
  return readState().carried;
}

export function describeTool(toolId: string): { title: string; hint: string } {
  if (toolId === DESELECT_TOOL) {
    return { title: 'Ablegen', hint: 'Legt das Werkzeug weg, damit E und der Knopf wieder normal wirken.' };
  }
  if (toolId === AUTO_TOOL) {
    return { title: 'Gärtnerhand', hint: 'Wählt selbst: Reifes und Funde einsammeln, freie Beete säen, eine getragene Pflanze einsetzen. Ausgraben geht nur mit dem Spaten.' };
  }
  const tool = content.tools.get(toolId);
  const name = itemName(tool.id);
  if (tool.kind === 'satchel') {
    const seed = getSowSeed();
    if (!seed) return { title: `${name} · leer`, hint: 'Ohne Samen im Beutel gibt es nichts zu säen.' };
    const def = content.plants.get(seed);
    const more = getSowableSpecies().length > 1 ? ' Nochmal antippen: andere Sorte.' : '';
    return {
      title: `${name} · ${def.name} (${gameState.getItemCount(def.seedItemId as string)})`,
      hint: tool.hint + more,
    };
  }
  if (tool.kind === 'shovel') {
    const carried = getCarriedPlant();
    return {
      title: carried ? `${name} · trägt ${content.plants.get(carried.plantId).name}` : name,
      hint: carried ? 'Du trägst eine Pflanze. Geh zu einem freien Beet und benutze den Spaten, um sie einzusetzen.' : tool.hint,
    };
  }
  return { title: name, hint: tool.hint };
}

// ── Using a tool ─────────────────────────────────────────────

interface BedSpot {
  bedId: string;
  x: number;
  y: number;
  dist: number;
}

/** Beds of a map within `reachTiles` of a point (px), nearest first. A bed's spot is where its plant stands. */
function bedsNear(mapId: string, at: { x: number; y: number }, reachTiles: number): BedSpot[] {
  return allPlantingBeds()
    .filter((b) => b.mapId === mapId)
    .map((b) => {
      const x = (b.rect.x + b.rect.w / 2) * TILE_SIZE;
      const y = (b.rect.y + b.rect.h) * TILE_SIZE;
      return { bedId: b.id, x, y, dist: Math.hypot(x - at.x, y - 16 - at.y) / TILE_SIZE };
    })
    .filter((b) => b.dist <= reachTiles)
    .sort((a, b) => a.dist - b.dist);
}

interface NodeSpot {
  node: ResourceNodeWithMap;
  x: number;
  y: number;
  dist: number;
}

/** Available, unblighted pickups of a map within `reachTiles` of a point (px), nearest first. */
function nodesNear(mapId: string, at: { x: number; y: number }, reachTiles: number): NodeSpot[] {
  return getResourceNodes(mapId)
    .filter((n) => isNodeAvailable(n) && !isNodeBlighted(n))
    .map((node) => {
      const x = node.at.x * TILE_SIZE;
      const y = node.at.y * TILE_SIZE;
      return { node, x, y, dist: Math.hypot(x - at.x, y - at.y) / TILE_SIZE };
    })
    .filter((n) => n.dist <= reachTiles)
    .sort((a, b) => a.dist - b.dist);
}

interface HomeSpot {
  home: Home;
  x: number;
  y: number;
  dist: number;
}

/** Animal homes with produce (hens, bees) within `reachTiles` of a point (px), nearest first. */
function homesNear(mapId: string, at: { x: number; y: number }, reachTiles: number): HomeSpot[] {
  return getHomes()
    .filter((h) => h.mapId === mapId && (h.animal === 'hens' || h.animal === 'bees'))
    .map((home) => {
      const x = (home.x + 0.5) * TILE_SIZE;
      const y = (home.y + 1) * TILE_SIZE - 14;
      return { home, x, y, dist: Math.hypot(x - at.x, y - at.y) / TILE_SIZE };
    })
    .filter((h) => h.dist <= reachTiles)
    .sort((a, b) => a.dist - b.dist);
}

const fail = (text: string): ToolResult => ({ ok: false, text, spots: [] });

function useSickle(tool: ToolDef, mapId: string, at: { x: number; y: number }): ToolResult {
  const reach = tool.reachTiles as number;
  const beds = bedsNear(mapId, at, reach);
  const gained = new Map<string, number>();
  const spots: ToolResult['spots'] = [];
  for (const bed of beds) {
    const got = harvestBed(bed.bedId);
    if (!got) continue;
    spots.push({ x: bed.x, y: bed.y });
    for (const id of [got.itemId, got.seedItemId]) if (id) gained.set(id, (gained.get(id) ?? 0) + 1);
  }
  for (const entry of nodesNear(mapId, at, reach)) {
    if (!collectNode(entry.node.id)) continue;
    spots.push({ x: entry.x, y: entry.y });
    gained.set(entry.node.itemId, (gained.get(entry.node.itemId) ?? 0) + (entry.node.count ?? 1));
  }
  for (const entry of homesNear(mapId, at, reach)) {
    const got = collectProduce(entry.home);
    if (!got) continue;
    spots.push({ x: entry.x, y: entry.y });
    gained.set(got.itemId, (gained.get(got.itemId) ?? 0) + got.count);
  }
  if (spots.length === 0) {
    return fail(beds.some((b) => isBedPlanted(b.bedId)) ? 'Hier ist noch nichts reif.' : 'Hier gibt es nichts zu ernten.');
  }
  gameState.setFlag('used-tool:sickle');
  return { ok: true, used: 'sickle', text: `+${[...gained].map(([id, n]) => `${n} ${itemName(id)}`).join(', ')}`, spots };
}

function useShovel(tool: ToolDef, mapId: string, at: { x: number; y: number }): ToolResult {
  const beds = bedsNear(mapId, at, tool.reachTiles as number);
  const carried = getCarriedPlant();
  if (!carried) {
    const bed = beds.find((b) => isBedPlanted(b.bedId));
    if (!bed) return fail('Hier gibt es nichts zum Umsetzen.');
    const plant = uprootBed(bed.bedId) as UprootedPlant;
    const state = readState();
    state.carried = plant;
    writeState(state);
    gameState.setFlag('used-tool:shovel');
    announce();
    return { ok: true, used: 'shovel', text: `${content.plants.get(plant.plantId).name} ausgegraben. Setze sie in ein freies Beet.`, spots: [bed] };
  }
  const name = content.plants.get(carried.plantId).name;
  const open = beds.filter((b) => !isBedPlanted(b.bedId));
  if (open.length === 0) return fail(`Hier ist kein freies Beet für ${name}.`);
  const bed = open.find((b) => bedAccepts(b.bedId, carried.plantId));
  if (!bed) return fail(`${name} wächst in diesem Beet nicht. Es nimmt nur eine andere Sorte.`);
  transplantInto(bed.bedId, carried);
  const state = readState();
  delete state.carried;
  writeState(state);
  gameState.setFlag('used-tool:shovel');
  gameState.save();
  announce();
  return { ok: true, used: 'shovel', text: `${name} eingesetzt. Sie wächst dort weiter.`, spots: [bed] };
}

function useSatchel(tool: ToolDef, mapId: string, at: { x: number; y: number }): ToolResult {
  const seed = getSowSeed();
  if (!seed) return fail('Der Saatbeutel ist leer. Du brauchst Samen.');
  const name = content.plants.get(seed).name;
  const open = bedsNear(mapId, at, tool.reachTiles as number).filter((b) => !isBedPlanted(b.bedId));
  if (open.length === 0) return fail('Hier ist kein freies Beet.');
  const fitting = open.filter((b) => bedAccepts(b.bedId, seed));
  if (fitting.length === 0) return fail(`${name} passt in diese Beete nicht.`);
  const spots: ToolResult['spots'] = [];
  for (const bed of fitting) {
    if (!plantSeed(bed.bedId, seed)) break; // out of seeds
    spots.push(bed);
  }
  if (spots.length === 0) return fail('Der Saatbeutel ist leer. Du brauchst Samen.');
  gameState.setFlag('used-tool:satchel');
  announce();
  return { ok: true, used: 'satchel', text: `${name} gesät: ${spots.length} ${spots.length === 1 ? 'Beet' : 'Beete'}.`, spots };
}

/** The all-round hand: sets down a carried plant if a bed in reach takes it, else harvests what is ripe, else sows. */
function useAuto(mapId: string, at: { x: number; y: number }): ToolResult {
  const owned = getOwnedTools();
  const find = (kind: ToolKind) => owned.find((t) => t.kind === kind);
  const shovel = find('shovel');
  const carried = getCarriedPlant();
  if (shovel && carried && canPlace(shovel, mapId, at)) return useShovel(shovel, mapId, at);
  const sickle = find('sickle');
  if (sickle) {
    const done = useSickle(sickle, mapId, at);
    if (done.ok) return done;
  }
  const satchel = find('satchel');
  if (satchel && getSowSeed()) {
    const done = useSatchel(satchel, mapId, at);
    if (done.ok) return done;
  }
  if (carried) return fail(`Du trägst ${content.plants.get(carried.plantId).name}. Gehe zu einem freien Beet und setze sie dort ein.`);
  return fail('Hier gibt es gerade nichts zu tun.');
}

const reachOf = (tool: ToolDef): number => tool.reachTiles as number;

/** Whether the carried plant has a free bed in reach that takes it. */
function canPlace(shovel: ToolDef, mapId: string, at: { x: number; y: number }): boolean {
  const carried = getCarriedPlant();
  return (
    carried !== undefined &&
    bedsNear(mapId, at, reachOf(shovel)).some((b) => !isBedPlanted(b.bedId) && bedAccepts(b.bedId, carried.plantId))
  );
}

/**
 * What a press would do right now, without doing it: the tool that would work (the one in hand,
 * or for the all-round hand the one it would pick), or null when nothing would happen.
 */
export function peekTool(mapId: string, at: { x: number; y: number }): ToolKind | null {
  const owned = getOwnedTools();
  const find = (kind: ToolKind) => owned.find((t) => t.kind === kind);
  const auto = isAutoTool();
  const hand = getEquippedTool();
  const may = (kind: ToolKind): boolean => auto || hand?.kind === kind;
  const shovel = find('shovel');
  const sickle = find('sickle');
  const satchel = find('satchel');
  const carried = getCarriedPlant();
  if (shovel && may('shovel')) {
    if (carried ? canPlace(shovel, mapId, at) : !auto && bedsNear(mapId, at, reachOf(shovel)).some((b) => isBedPlanted(b.bedId))) return 'shovel';
  }
  if (
    sickle &&
    may('sickle') &&
    (bedsNear(mapId, at, reachOf(sickle)).some((b) => isProduceReady(b.bedId)) ||
      nodesNear(mapId, at, reachOf(sickle)).length > 0 ||
      homesNear(mapId, at, reachOf(sickle)).some((h) => (readyProduce(h.home)?.count ?? 0) > 0))
  ) {
    return 'sickle';
  }
  const seed = getSowSeed();
  if (
    satchel &&
    seed &&
    may('satchel') &&
    bedsNear(mapId, at, reachOf(satchel)).some((b) => !isBedPlanted(b.bedId) && bedAccepts(b.bedId, seed))
  ) {
    return 'satchel';
  }
  return null;
}

/** Works the beds around `at` (px) with the tool in hand. Never costs the tool anything. */
export function useTool(mapId: string, at: { x: number; y: number }): ToolResult {
  if (isAutoTool()) return useAuto(mapId, at);
  const tool = getEquippedTool();
  if (!tool) return fail('Du hast kein Werkzeug in der Hand.');
  switch (tool.kind) {
    case 'sickle':
      return useSickle(tool, mapId, at);
    case 'shovel':
      return useShovel(tool, mapId, at);
    case 'satchel':
      return useSatchel(tool, mapId, at);
    default:
      return fail(`${itemName(tool.id)} leuchtet von allein. Du musst sie nur tragen.`);
  }
}

/** The lantern on a pole, if it is the tool in hand: radii in px (light) and tiles (push-back). */
export function getCarriedLight(): { lightRadius: number; pushBackTiles: number } | null {
  const tool = getEquippedTool();
  if (!tool || tool.kind !== 'light') return null;
  return { lightRadius: tool.lightRadius as number, pushBackTiles: tool.pushBackTiles as number };
}
