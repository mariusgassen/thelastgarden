/**
 * Working buildings: rain barrel, compost heap, drying rack and windmill. No Phaser dependency;
 * the interactable and the windmill sails live in systems/buildLayer.ts.
 *
 * The pieces are content (content/buildables.ts, `machine`). Only the drying rack, the windmill
 * and the compost heap carry state, kept in `ext.machines`:
 *   { stations: { "<mapId>:<x>:<y>": { plantId?, readyAt?, activeUntil? } } }
 *
 *   machineAction(mapId, x, y)   what the piece offers right now ({ label, act() }), or null
 *   tickMachines(from, to)       barrel and compost speed up the beds around them
 *   startMachineTicker()         calls tickMachines every few seconds; once at boot
 *
 * Barrel and compost never replace anything: a bed grows without them, only faster. Nothing is
 * sold and nothing spoils. A piece taken down hands back what was inside it.
 */
import { content } from '../content';
import type { BuildableDef } from '../content/types';
import { allPlantingBeds } from '../world';
import { bus } from './events';
import { getPieces } from './building';
import { shiftGrowth } from './plants';
import { gameState } from './state';

type MachineKind = NonNullable<BuildableDef['machine']>;

/** Tiles from a piece's centre to a bed's centre within which it helps. */
export const BARREL_RADIUS_TILES = 2.5;
export const COMPOST_RADIUS_TILES = 3;
/** Extra growth per ms of play: 0.5 = a third faster, 1 = twice as fast. */
export const BARREL_SPEEDUP = 0.5;
export const COMPOST_SPEEDUP = 1;
/** One piece of harvest keeps the heap working this long; it holds at most COMPOST_MAX_LOADS. */
export const COMPOST_MS = 120_000;
export const COMPOST_MAX_LOADS = 3;
export const RACK_DRY_MS = 90_000;
export const RACK_SEEDS = 2;
export const MILL_GRIND_MS = 60_000;
export const MILL_HARVEST_PER_FLOUR = 2;
export const FLOUR_ITEM_ID = 'craft-flour';
export const DRIFT_INTERVAL_MS = 90_000;
export const DRIFT_MAX = 3;

const DRIFT_LOOT = ['mat-wood', 'mat-scrap', 'resource-dew', 'resource-curio'] as const;

const TICK_MS = 5000;
/** A tab that slept for minutes must not hand out a windfall. */
const MAX_TICK_SPAN_MS = 10_000;

interface Station {
  /** Rack: the species being dried. */
  plantId?: string;
  /** Windmill: the harvest that went in, handed back if the mill is taken down mid-grind. */
  inputs?: { itemId: string; count: number }[];
  /** Rack and windmill: epoch ms when the work is done. */
  readyAt?: number;
  /** Compost heap: epoch ms until which it works. */
  activeUntil?: number;
  /** Drift net: epoch ms since the last collection (or when the net was placed). */
  startedAt?: number;
  /** Drift net: cumulative catches so every 4th item is a curio. */
  catchCount?: number;
}

interface MachinesExt {
  stations: Record<string, Station>;
}

export interface MachineAction {
  label: string;
  /** Does the step and returns the German toast to show. */
  act(): string;
}

const stationKey = (mapId: string, x: number, y: number): string => `${mapId}:${x}:${y}`;

function readState(): MachinesExt {
  return gameState.getExt<MachinesExt>('machines', { stations: {} });
}

function writeStation(key: string, station: Station | undefined): void {
  const state = readState();
  if (station) state.stations[key] = station;
  else delete state.stations[key];
  gameState.setExt('machines', state);
  gameState.save();
}

function kindAt(mapId: string, x: number, y: number): MachineKind | undefined {
  const piece = getPieces(mapId).find((p) => p.x === x && p.y === y);
  return piece && content.buildables.find(piece.id)?.machine;
}

const seconds = (ms: number): string => `${Math.max(1, Math.ceil(ms / 1000))} s`;

/** Produce items the player carries, most plentiful first. */
function carriedProduce(): { itemId: string; count: number }[] {
  return content.items
    .all()
    .filter((i) => i.category === 'produce')
    .map((i) => ({ itemId: i.id, count: gameState.getItemCount(i.id) }))
    .filter((i) => i.count > 0)
    .sort((a, b) => b.count - a.count);
}

/** Species whose harvest the player carries and that can be dried to a seed. */
function dryablePlant(): { plantId: string; produceItemId: string; seedItemId: string } | undefined {
  for (const plant of content.plants.all()) {
    if (plant.produceItemId && plant.seedItemId && gameState.getItemCount(plant.produceItemId) > 0) {
      return { plantId: plant.id, produceItemId: plant.produceItemId, seedItemId: plant.seedItemId };
    }
  }
  return undefined;
}

function rackAction(key: string, station: Station | undefined, now: number): MachineAction {
  if (station?.plantId && station.readyAt !== undefined) {
    const { plantId, readyAt } = station;
    if (now < readyAt) {
      return { label: 'Prüfen', act: () => `Die Samen trocknen noch, ${seconds(readyAt - now)} etwa.` };
    }
    return {
      label: 'Samen nehmen',
      act: () => {
        const seedItemId = content.plants.get(plantId).seedItemId as string;
        gameState.addItem(seedItemId, RACK_SEEDS);
        writeStation(key, undefined);
        return `+${RACK_SEEDS} ${content.items.get(seedItemId).name}`;
      },
    };
  }
  return {
    label: 'Trocknen',
    act: () => {
      const pick = dryablePlant();
      if (!pick) return 'Leg etwas Geerntetes auf das Gestell: Daraus trocknen Samen.';
      gameState.removeItem(pick.produceItemId, 1);
      writeStation(key, { plantId: pick.plantId, readyAt: Date.now() + RACK_DRY_MS });
      return `${content.items.get(pick.produceItemId).name} hängt zum Trocknen auf.`;
    },
  };
}

function millAction(key: string, station: Station | undefined, now: number): MachineAction {
  if (station?.readyAt !== undefined) {
    const { readyAt } = station;
    if (now < readyAt) {
      return { label: 'Prüfen', act: () => `Die Mühle mahlt noch, ${seconds(readyAt - now)} etwa.` };
    }
    return {
      label: 'Mehl holen',
      act: () => {
        gameState.addItem(FLOUR_ITEM_ID, 1);
        gameState.setFlag('collected-flour');
        writeStation(key, undefined);
        return `+1 ${content.items.get(FLOUR_ITEM_ID).name}`;
      },
    };
  }
  return {
    label: 'Mahlen',
    act: () => {
      let need = MILL_HARVEST_PER_FLOUR;
      const take: { itemId: string; count: number }[] = [];
      for (const p of carriedProduce()) {
        const n = Math.min(need, p.count);
        take.push({ itemId: p.itemId, count: n });
        need -= n;
        if (need === 0) break;
      }
      if (need > 0) return `Die Mühle braucht ${MILL_HARVEST_PER_FLOUR} Ernten zum Mahlen.`;
      for (const t of take) gameState.removeItem(t.itemId, t.count);
      writeStation(key, { readyAt: Date.now() + MILL_GRIND_MS, inputs: take });
      return 'Die Flügel drehen sich. Das Mehl ist gleich fertig.';
    },
  };
}

function compostAction(key: string, station: Station | undefined, now: number): MachineAction {
  const left = Math.max(0, (station?.activeUntil ?? 0) - now);
  return {
    label: 'Kompostieren',
    act: () => {
      if (left > COMPOST_MS * (COMPOST_MAX_LOADS - 1)) return 'Der Haufen ist satt und arbeitet. Gib ihm etwas Zeit.';
      const [pick] = carriedProduce();
      if (!pick) return 'Der Haufen mag Pflanzenreste: Bring ihm etwas Geerntetes.';
      gameState.removeItem(pick.itemId, 1);
      writeStation(key, { activeUntil: Date.now() + left + COMPOST_MS });
      return 'Der Haufen arbeitet. Beete in der Nähe wachsen schneller.';
    },
  };
}

function driftCatches(station: Station | undefined, now: number): { ready: number; startedAt: number; catchCount: number } {
  const startedAt = station?.startedAt ?? now;
  const ready = Math.min(DRIFT_MAX, Math.floor(Math.max(0, now - startedAt) / DRIFT_INTERVAL_MS));
  return { ready, startedAt, catchCount: station?.catchCount ?? 0 };
}

function collectDrift(ready: number, catchCount: number): { itemId: string; count: number }[] {
  const counts = new Map<string, number>();
  for (let i = 0; i < ready; i++) {
    const itemId = DRIFT_LOOT[(catchCount + i) % DRIFT_LOOT.length];
    counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
  }
  return [...counts.entries()].map(([itemId, count]) => ({ itemId, count }));
}

function driftAction(key: string, station: Station | undefined, now: number): MachineAction {
  const { ready, startedAt, catchCount } = driftCatches(station, now);
  if (ready === 0) {
    return {
      label: 'Prüfen',
      act: () => `Im Treibgut-Netz hängt noch nichts, etwa ${seconds(startedAt + DRIFT_INTERVAL_MS - now)} bis zum nächsten Fang.`,
    };
  }
  return {
    label: 'Netz einholen',
    act: () => {
      const gained = collectDrift(ready, catchCount);
      for (const g of gained) gameState.addItem(g.itemId, g.count);
      writeStation(key, { startedAt: now, catchCount: catchCount + ready });
      gameState.setFlag('collected-drift-net');
      const list = gained.map((g) => `${g.count} ${content.items.get(g.itemId).name}`).join(', ');
      return `+${list}`;
    },
  };
}

/** What the piece on this tile offers right now; null for pieces you just leave standing. */
export function machineAction(mapId: string, x: number, y: number, now = Date.now()): MachineAction | null {
  const kind = kindAt(mapId, x, y);
  const key = stationKey(mapId, x, y);
  const station = readState().stations[key];
  switch (kind) {
    case 'drying-rack':
      return rackAction(key, station, now);
    case 'windmill':
      return millAction(key, station, now);
    case 'compost':
      return compostAction(key, station, now);
    case 'drift-net':
      return driftAction(key, station, now);
    default:
      return null;
  }
}

/** True while the heap on this tile is still working. */
export function isCompostActive(mapId: string, x: number, y: number, now = Date.now()): boolean {
  return (readState().stations[stationKey(mapId, x, y)]?.activeUntil ?? 0) > now;
}

/**
 * Speeds up every growing bed near a barrel or a working compost heap by the time that passed
 * between `from` and `to` (epoch ms). A bed gets each kind of help once, however many stand near.
 */
export function tickMachines(from: number, to: number): void {
  const span = Math.min(to - from, MAX_TICK_SPAN_MS);
  if (span <= 0) return;
  const beds = allPlantingBeds();
  const boost = new Map<string, { barrel: boolean; compost: boolean }>();
  for (const [mapId, pieces] of Object.entries(gameState.getExt<{ pieces: Record<string, { id: string; x: number; y: number }[]> }>('building', { pieces: {} }).pieces)) {
    for (const piece of pieces) {
      const kind = content.buildables.find(piece.id)?.machine;
      if (kind !== 'rain-barrel' && kind !== 'compost') continue;
      if (kind === 'compost' && !isCompostActive(mapId, piece.x, piece.y, to)) continue;
      const radius = kind === 'compost' ? COMPOST_RADIUS_TILES : BARREL_RADIUS_TILES;
      for (const bed of beds) {
        if (bed.mapId !== mapId) continue;
        const dist = Math.hypot(bed.rect.x + bed.rect.w / 2 - (piece.x + 0.5), bed.rect.y + bed.rect.h / 2 - (piece.y + 0.5));
        if (dist > radius) continue;
        const entry = boost.get(bed.id) ?? { barrel: false, compost: false };
        if (kind === 'compost') entry.compost = true;
        else entry.barrel = true;
        boost.set(bed.id, entry);
      }
    }
  }
  for (const [bedId, b] of boost) {
    const speedup = (b.barrel ? BARREL_SPEEDUP : 0) + (b.compost ? COMPOST_SPEEDUP : 0);
    shiftGrowth(bedId, -span * speedup);
  }
}

/** What is inside a station whose piece was taken down: the finished goods, or else the input back. */
function refund(station: Station, now: number): void {
  const done = station.readyAt !== undefined && now >= station.readyAt;
  if (station.plantId) {
    const plant = content.plants.get(station.plantId);
    if (done && plant.seedItemId) gameState.addItem(plant.seedItemId, RACK_SEEDS);
    else if (!done && plant.produceItemId) gameState.addItem(plant.produceItemId, 1);
  } else if (station.inputs) {
    if (done) {
      gameState.addItem(FLOUR_ITEM_ID, 1);
      gameState.setFlag('collected-flour');
    } else for (const i of station.inputs) gameState.addItem(i.itemId, i.count);
  } else if (station.startedAt !== undefined) {
    const { ready, catchCount } = driftCatches(station, now);
    if (ready > 0) for (const g of collectDrift(ready, catchCount)) gameState.addItem(g.itemId, g.count);
  }
}

function syncDriftNetsForMap(mapId: string): void {
  const state = readState();
  const now = Date.now();
  let dirty = false;
  for (const piece of getPieces(mapId)) {
    if (content.buildables.find(piece.id)?.machine !== 'drift-net') continue;
    const key = stationKey(mapId, piece.x, piece.y);
    if (!state.stations[key]) {
      state.stations[key] = { startedAt: now, catchCount: 0 };
      dirty = true;
    }
  }
  for (const [key, station] of Object.entries(state.stations)) {
    if (!key.startsWith(`${mapId}:`)) continue;
    const [, x, y] = key.split(':');
    if (kindAt(mapId, Number(x), Number(y))) continue;
    refund(station, now);
    delete state.stations[key];
    dirty = true;
  }
  if (!dirty) return;
  gameState.setExt('machines', state);
  gameState.save();
}

bus.on('build-changed', ({ mapId }) => syncDriftNetsForMap(mapId));
bus.on('save-loaded', () => {
  const built = gameState.getExt<{ pieces: Record<string, { id: string; x: number; y: number }[]> }>('building', { pieces: {} }).pieces;
  for (const mapId of Object.keys(built)) syncDriftNetsForMap(mapId);
});

let tickerStarted = false;
/** Barrel and compost speed up beds even while the player is elsewhere. Call once at boot. */
export function startMachineTicker(): void {
  if (tickerStarted) return;
  tickerStarted = true;
  let last = Date.now();
  window.setInterval(() => {
    const now = Date.now();
    tickMachines(last, now);
    last = now;
  }, TICK_MS);
}
