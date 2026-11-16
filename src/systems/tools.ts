/**
 * Tools and gadgets: a sickle, a shovel, a seed satchel and a lantern on a pole. No Phaser
 * dependency — rendering and the carried light live in systems/toolLayer.ts.
 *
 * Tools are ordinary `category: 'tool'` items (content/items.ts) made at a workbench, plus a
 * `ToolDef` (content/tools.ts). They are never used up and nothing can be sold.
 *
 * State: `ext.tools = { equipped?, seed? }` — which tool is in hand and which seed the
 * satchel sows. Tool mode (the tool bar is open, E / a tap uses the tool) is runtime only.
 *
 *   getOwnedTools() / getEquippedTool() / equipTool(id)
 *   getToolMode() / setToolMode(open) / isToolActing()   emits `tool-changed`
 *   useTool(mapId, at, from?)  work the beds near `from`, closest to `at` first
 *   getCarriedLight()          the equipped lantern's light, or null
 *   getSowSeed() / cycleSeed() / describeTool(id)
 */
import { content } from '../content';
import type { ToolDef, ToolKind } from '../content/types';
import { allPlantingBeds } from '../world';
import { TILE_SIZE } from '../world/tiles';
import { setBuildMode } from './building';
import { bus } from './events';
import {
  bedAccepts,
  harvestBed,
  isBedPlanted,
  isProduceReady,
  plantSeed,
  uprootBed,
  type UprootedPlant,
} from './plants';
import { gameState } from './state';

interface ToolsExt {
  equipped?: string;
  /** Plant id of the seed the satchel sows. */
  seed?: string;
  /** Legacy field from older saves where shovel held a plant instead of returning its seed. */
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

/** Migrates any leftover carried plant from older saves straight into the player's bag as a seed. */
function refundLegacyCarried(): void {
  const state = readState();
  if (!state.carried) return;
  const seedItemId = content.plants.find(state.carried.plantId)?.seedItemId;
  if (seedItemId) gameState.addItem(seedItemId, 1);
  delete state.carried;
  writeState(state);
  gameState.save();
}

const itemName = (itemId: string): string => content.items.get(itemId).name;

/** Tools the player carries, in the order of content/tools.ts. */
export function getOwnedTools(): ToolDef[] {
  return content.tools.all().filter((t) => gameState.getItemCount(t.id) > 0);
}

/** Pseudo tool id of the all-round hand: it picks sickle, satchel or spade by what the spot needs. */
export const AUTO_TOOL = 'auto';

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
  if (open) {
    setBuildMode(false);
    // Nothing in hand yet: start with the hand that picks the right tool by itself.
    if (!readState().equipped && canUseAutoTool()) equipTool(AUTO_TOOL);
  }
  announce();
}

/** While the tool bar is open and a tool that works on the world is in hand, E and taps use it instead of interacting. */
export function isToolActing(): boolean {
  const tool = getEquippedTool();
  return mode.open && (isAutoTool() || (tool !== undefined && tool.kind !== 'light'));
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
  refundLegacyCarried();
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

// ── Seeds ────────────────────────────────────────────────────

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

export function describeTool(toolId: string): { title: string; hint: string } {
  if (toolId === AUTO_TOOL) {
    return { title: 'Gärtnerhand', hint: 'Erntet oder sät: je nachdem, was hier gerade passt.' };
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
  return { title: name, hint: tool.hint };
}

// ── Using a tool ─────────────────────────────────────────────

interface BedSpot {
  bedId: string;
  x: number;
  y: number;
  dist: number;
}

/**
 * Beds of a map within `reachTiles` of the player (`from`, in px), ordered closest to `at` (tapped/targeted px) first.
 * A bed's spot is where its plant stands.
 */
function bedsNear(
  mapId: string,
  at: { x: number; y: number },
  reachTiles: number,
  from: { x: number; y: number } = at,
): BedSpot[] {
  return allPlantingBeds()
    .filter((b) => b.mapId === mapId)
    .map((b) => {
      const x = (b.rect.x + b.rect.w / 2) * TILE_SIZE;
      const y = (b.rect.y + b.rect.h) * TILE_SIZE;
      const reachDist = Math.hypot(x - from.x, y - 16 - from.y) / TILE_SIZE;
      const targetDist = Math.hypot(x - at.x, y - 16 - at.y) / TILE_SIZE;
      return { bedId: b.id, x, y, reachDist, dist: targetDist };
    })
    .filter((b) => b.reachDist <= reachTiles)
    .sort((a, b) => a.dist - b.dist)
    .map(({ bedId, x, y, dist }) => ({ bedId, x, y, dist }));
}

const fail = (text: string): ToolResult => ({ ok: false, text, spots: [] });

function useSickle(tool: ToolDef, mapId: string, at: { x: number; y: number }, from: { x: number; y: number }): ToolResult {
  const beds = bedsNear(mapId, at, tool.reachTiles as number, from);
  const gained = new Map<string, number>();
  const spots: ToolResult['spots'] = [];
  for (const bed of beds) {
    const got = harvestBed(bed.bedId);
    if (!got) continue;
    spots.push({ x: bed.x, y: bed.y });
    for (const id of [got.itemId, got.seedItemId]) if (id) gained.set(id, (gained.get(id) ?? 0) + 1);
  }
  if (spots.length === 0) {
    return fail(beds.some((b) => isBedPlanted(b.bedId)) ? 'Hier ist noch nichts reif.' : 'Hier gibt es nichts zu ernten.');
  }
  gameState.setFlag('used-tool:sickle');
  return { ok: true, used: 'sickle', text: `+${[...gained].map(([id, n]) => `${n} ${itemName(id)}`).join(', ')}`, spots };
}

function useShovel(tool: ToolDef, mapId: string, at: { x: number; y: number }, from: { x: number; y: number }): ToolResult {
  refundLegacyCarried();
  const beds = bedsNear(mapId, at, tool.reachTiles as number, from);
  const bed = beds.find((b) => isBedPlanted(b.bedId));
  if (!bed) return fail('Hier gibt es nichts auszugraben.');
  const produceReady = isProduceReady(bed.bedId);
  const plant = uprootBed(bed.bedId);
  if (!plant) return fail('Hier gibt es nichts auszugraben.');
  const def = content.plants.get(plant.plantId);
  const gained: string[] = [];
  if (produceReady && def.produceItemId) {
    gameState.addItem(def.produceItemId, 1);
    gained.push(`1 ${itemName(def.produceItemId)}`);
  }
  if (def.seedItemId) {
    gameState.addItem(def.seedItemId, 1);
    gained.push(`1 ${itemName(def.seedItemId)}`);
  }
  gameState.setFlag('used-tool:shovel');
  gameState.save();
  announce();
  const text = gained.length > 0 ? `${def.name} ausgegraben: +${gained.join(', ')}` : `${def.name} ausgegraben.`;
  return { ok: true, used: 'shovel', text, spots: [bed] };
}

function useSatchel(tool: ToolDef, mapId: string, at: { x: number; y: number }, from: { x: number; y: number }): ToolResult {
  const seed = getSowSeed();
  if (!seed) return fail('Der Saatbeutel ist leer. Du brauchst Samen.');
  const name = content.plants.get(seed).name;
  const open = bedsNear(mapId, at, tool.reachTiles as number, from).filter((b) => !isBedPlanted(b.bedId));
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

/** The all-round hand: harvests what is ripe, else sows. */
function useAuto(mapId: string, at: { x: number; y: number }, from: { x: number; y: number }): ToolResult {
  const owned = getOwnedTools();
  const find = (kind: ToolKind) => owned.find((t) => t.kind === kind);
  const sickle = find('sickle');
  if (sickle) {
    const done = useSickle(sickle, mapId, at, from);
    if (done.ok) return done;
  }
  const satchel = find('satchel');
  if (satchel && getSowSeed()) {
    const done = useSatchel(satchel, mapId, at, from);
    if (done.ok) return done;
  }
  return fail('Hier gibt es gerade nichts zu tun.');
}

/** Works the beds around `from` (px), prioritizing `at` (tapped px), with the tool in hand. */
export function useTool(mapId: string, at: { x: number; y: number }, from: { x: number; y: number } = at): ToolResult {
  if (isAutoTool()) return useAuto(mapId, at, from);
  const tool = getEquippedTool();
  if (!tool) return fail('Du hast kein Werkzeug in der Hand.');
  switch (tool.kind) {
    case 'sickle':
      return useSickle(tool, mapId, at, from);
    case 'shovel':
      return useShovel(tool, mapId, at, from);
    case 'satchel':
      return useSatchel(tool, mapId, at, from);
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
