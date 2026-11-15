import { bus } from './events';
import { clearSave, createDefaultSave, loadSave, writeSave, type FlagValue, type SaveGame } from './save';

const AUTOSAVE_INTERVAL_MS = 15_000;

/**
 * The single source of truth for persistent game progress at runtime.
 * Mutate progress only through these methods so events fire and saves stay consistent.
 */
class GameState {
  data: SaveGame = createDefaultSave();
  private autosaveTimer: number | undefined;

  /** Loads the save from storage (or starts fresh). Call once at boot. */
  init(): void {
    this.data = loadSave() ?? createDefaultSave();
    bus.emit('save-loaded', { save: this.data });
  }

  save(): void {
    this.data.savedAt = Date.now();
    if (writeSave(this.data)) bus.emit('save-written', { savedAt: this.data.savedAt });
  }

  /** Wipes progress (storage + memory). Callers should restart the world afterwards. */
  reset(): void {
    clearSave();
    this.data = createDefaultSave();
    bus.emit('save-loaded', { save: this.data });
  }

  startAutosave(): void {
    if (this.autosaveTimer !== undefined) return;
    this.autosaveTimer = window.setInterval(() => this.save(), AUTOSAVE_INTERVAL_MS);
    // Mobile browsers may kill a backgrounded tab without further notice.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.save();
    });
    window.addEventListener('pagehide', () => this.save());
  }

  // ── Flags ────────────────────────────────────────────────
  getFlag(key: string): FlagValue | undefined {
    return this.data.world.flags[key];
  }

  hasFlag(key: string): boolean {
    return Boolean(this.data.world.flags[key]);
  }

  setFlag(key: string, value: FlagValue = true): void {
    if (this.data.world.flags[key] === value) return;
    this.data.world.flags[key] = value;
    bus.emit('flag-changed', { key, value });
  }

  // ── Paths / obstacles (use systems/obstacles.ts unblockPath() as the public API) ──
  isPathUnblocked(obstacleId: string): boolean {
    return this.data.world.unblockedPaths.includes(obstacleId);
  }

  markPathUnblocked(obstacleId: string): void {
    if (!this.isPathUnblocked(obstacleId)) this.data.world.unblockedPaths.push(obstacleId);
  }

  // ── Zones ────────────────────────────────────────────────
  hasVisitedZone(zoneId: string): boolean {
    return this.data.world.visitedZones.includes(zoneId);
  }

  markZoneVisited(zoneId: string): void {
    if (!this.hasVisitedZone(zoneId)) this.data.world.visitedZones.push(zoneId);
  }

  // ── Inventory (placeholder API; UI arrives in a later wave) ──
  getItemCount(itemId: string): number {
    return this.data.inventory.items[itemId] ?? 0;
  }

  addItem(itemId: string, count = 1): void {
    const next = Math.max(0, this.getItemCount(itemId) + count);
    if (next === 0) delete this.data.inventory.items[itemId];
    else this.data.inventory.items[itemId] = next;
    bus.emit('inventory-changed', { itemId, count: next });
  }

  removeItem(itemId: string, count = 1): boolean {
    if (this.getItemCount(itemId) < count) return false;
    this.addItem(itemId, -count);
    return true;
  }

  // ── Extension slots for later waves ──────────────────────
  getExt<T>(key: string, fallback: T): T {
    return (this.data.ext[key] as T | undefined) ?? fallback;
  }

  setExt<T>(key: string, value: T): void {
    this.data.ext[key] = value;
  }
}

export const gameState = new GameState();
