import Phaser from 'phaser';
import type { DialogueLine } from '../content/types';
import type { FlagValue, SaveGame } from './save';

/**
 * Global, typed event bus. Systems and scenes communicate through it instead of
 * importing each other. Later waves: add new events to this map (additive only).
 */
export interface GameEvents {
  /** An obstacle was removed via unblockPath(). */
  'path-unblocked': { obstacleId: string; mapId: string };
  /** The nearest interactable in range changed (null = nothing in range). */
  'interaction-focus': { id: string; label: string } | null;
  /** The player interacted with something. */
  interacted: { id: string };
  /** The player entered a named zone. */
  'area-changed': { mapId: string; zoneId: string; name: string };
  /** A map finished loading. */
  'map-changed': { mapId: string };
  /** Ask the UI to show text lines (use WorldApi.showDialogue/showLines instead of emitting directly). */
  'dialogue-show': { id: string; lines: DialogueLine[] };
  /** Advance the open dialogue (keyboard E/Space while modal). */
  'dialogue-advance': undefined;
  'dialogue-closed': { id: string };
  'flag-changed': { key: string; value: FlagValue };
  'inventory-changed': { itemId: string; count: number };
  /** A seed was planted on an empty bed. */
  'plant-planted': { bedId: string; plantId: string };
  /** A planted bed just reached full growth (see systems/plants.ts isBedMature). */
  'plant-matured': { bedId: string; plantId: string };
  /** A resource/seed pickup in the world was collected. */
  'resource-collected': { nodeId: string; itemId: string };
  'save-loaded': { save: SaveGame };
  'save-written': { savedAt: number };
  /** Short transient message in the HUD. */
  toast: { text: string };
  /** A short tap/click that was not a joystick drag, in game (canvas) pixels. */
  tap: { x: number; y: number };
}

type Handler<K extends keyof GameEvents> = (payload: GameEvents[K]) => void;

class TypedBus {
  private readonly emitter = new Phaser.Events.EventEmitter();

  on<K extends keyof GameEvents>(event: K, fn: Handler<K>, context?: unknown): this {
    this.emitter.on(event, fn, context);
    return this;
  }

  once<K extends keyof GameEvents>(event: K, fn: Handler<K>, context?: unknown): this {
    this.emitter.once(event, fn, context);
    return this;
  }

  off<K extends keyof GameEvents>(event: K, fn: Handler<K>, context?: unknown): this {
    this.emitter.off(event, fn, context);
    return this;
  }

  emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    this.emitter.emit(event, payload);
  }

  /**
   * Subscribe for the lifetime of a scene: the handler is removed automatically when
   * the scene shuts down (important because WorldScene restarts on every map change).
   */
  onScene<K extends keyof GameEvents>(scene: Phaser.Scene, event: K, fn: Handler<K>): void {
    this.emitter.on(event, fn);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.emitter.off(event, fn));
  }
}

export const bus = new TypedBus();
