/**
 * Save format + persistence (localStorage). No Phaser dependency.
 *
 * Extending (later waves):
 *  - Add an optional-or-defaulted field to `SaveGame` AND to `createDefaultSave()`.
 *    Old saves are deep-merged onto the defaults on load, so new fields appear automatically.
 *  - Only bump SAVE_VERSION + add a MIGRATIONS entry when you rename/transform existing data.
 *  - Small feature-specific blobs may also live in `ext[<feature>]` (see gameState.getExt/setExt).
 */

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'the-last-garden:save';

export type FlagValue = boolean | number | string;
export type Facing = 'left' | 'right';

export interface SaveGame {
  version: number;
  /** Epoch ms of the last write. */
  savedAt: number;
  player: {
    mapId: string;
    /** Pixel position in the map. */
    x: number;
    y: number;
    facing: Facing;
  };
  world: {
    /** Obstacle ids removed via unblockPath(). */
    unblockedPaths: string[];
    /** Zone ids the player has entered at least once. */
    visitedZones: string[];
    /** Generic story/progress flags, e.g. "greenhouse-unlocked". */
    flags: Record<string, FlagValue>;
  };
  inventory: {
    /** itemId -> count. */
    items: Record<string, number>;
  };
  quests: {
    active: string[];
    completed: string[];
    /** questId -> quest-specific progress data (shape owned by the quest system). */
    progress: Record<string, unknown>;
  };
  /** Namespaced storage for later waves: ext['plants'], ext['atmosphere'], … */
  ext: Record<string, unknown>;
}

export function createDefaultSave(): SaveGame {
  return {
    version: SAVE_VERSION,
    savedAt: 0,
    player: { mapId: 'garden', x: -1, y: -1, facing: 'right' },
    world: { unblockedPaths: [], visitedZones: [], flags: {} },
    inventory: { items: {} },
    quests: { active: [], completed: [], progress: {} },
    ext: {},
  };
}

type RawSave = Record<string, unknown> & { version?: number };

/** MIGRATIONS[n] upgrades a save from version n to n + 1. */
const MIGRATIONS: Record<number, (raw: RawSave) => RawSave> = {};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Loaded values win if they have the same "shape" as the default; unknown keys are kept. */
function mergeDefaults<T>(defaults: T, loaded: unknown): T {
  if (isPlainObject(defaults) && isPlainObject(loaded)) {
    const out: Record<string, unknown> = { ...loaded };
    for (const key of Object.keys(defaults)) {
      out[key] = mergeDefaults((defaults as Record<string, unknown>)[key], loaded[key]);
    }
    return out as T;
  }
  if (loaded === undefined) return defaults;
  if (Array.isArray(defaults)) return (Array.isArray(loaded) ? loaded : defaults) as T;
  if (isPlainObject(defaults)) return defaults;
  if (typeof defaults !== typeof loaded) return defaults;
  return loaded as T;
}

export function parseSave(json: string): SaveGame | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isPlainObject(raw)) return null;
  let data = raw as RawSave;
  let version = typeof data.version === 'number' ? data.version : 0;
  if (version > SAVE_VERSION) {
    console.warn(`[save] save version ${version} is newer than supported ${SAVE_VERSION}; loading best-effort`);
  }
  while (version < SAVE_VERSION) {
    const migrate = MIGRATIONS[version];
    if (migrate) data = migrate(data);
    version++;
  }
  const save = mergeDefaults(createDefaultSave(), data);
  save.version = SAVE_VERSION;
  return save;
}

export function loadSave(): SaveGame | null {
  try {
    const json = localStorage.getItem(SAVE_KEY);
    return json ? parseSave(json) : null;
  } catch (err) {
    console.warn('[save] could not read save', err);
    return null;
  }
}

export function writeSave(save: SaveGame): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch (err) {
    console.warn('[save] could not write save', err);
    return false;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* storage unavailable (private mode) — nothing to clear */
  }
}
