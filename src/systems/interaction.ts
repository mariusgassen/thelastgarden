import type { DialogueLine } from '../content/types';
import type { InteractableSpec } from '../world/types';
import { TILE_SIZE } from '../world/tiles';
import { bus } from './events';
import { gameState } from './state';

/** What interactables may do to the world. Implemented by WorldScene. */
export interface WorldApi {
  readonly mapId: string;
  changeMap(mapId: string, spawn: string): void;
  /** Show a dialogue from content/dialogues.ts. */
  showDialogue(dialogueId: string): void;
  /** Show ad-hoc text lines in the dialogue box (e.g. obstacle hints). */
  showLines(id: string, lines: DialogueLine[]): void;
  toast(text: string): void;
}

export interface InteractionContext {
  world: WorldApi;
  /** Player feet position in pixels. */
  playerX: number;
  playerY: number;
}

/**
 * Anything the player can interact with. Register instances with
 * `worldScene.interaction.register(...)`; the system handles focus, prompt,
 * keyboard (E/Space), the context button and tapping.
 */
export interface Interactable {
  /** Unique within the current map. */
  id: string;
  /** Short action label for the context button ("Lesen", "Gießen", …). */
  label: string;
  /** Pixel distance from the player's feet within which interaction is possible. */
  radius: number;
  /** Position in pixels (where the focus marker hovers). Called every frame. */
  getPosition(): { x: number; y: number };
  /** Optional gate; return false to make it temporarily non-focusable. */
  canInteract?(ctx: InteractionContext): boolean;
  onInteract(ctx: InteractionContext): void;
  /** Vertical marker offset in px above getPosition() (default 34). */
  markerOffset?: number;
}

const TAP_TOLERANCE_PX = 40;

export class InteractionSystem {
  private readonly items = new Map<string, Interactable>();
  private current: Interactable | null = null;
  private currentLabel = '';

  constructor(private readonly getContext: () => InteractionContext) {}

  /** Returns an unregister function. Re-registering an id replaces the previous entry. */
  register(item: Interactable): () => void {
    this.items.set(item.id, item);
    return () => this.unregister(item.id);
  }

  unregister(id: string): void {
    this.items.delete(id);
    if (this.current?.id === id) this.setFocus(null);
  }

  get(id: string): Interactable | undefined {
    return this.items.get(id);
  }

  get focused(): Interactable | null {
    return this.current;
  }

  /** Picks the nearest interactable in range. Call once per frame. */
  update(enabled: boolean): void {
    if (!enabled) {
      this.setFocus(null);
      return;
    }
    const ctx = this.getContext();
    let best: Interactable | null = null;
    let bestDist = Infinity;
    for (const item of this.items.values()) {
      const d = this.distanceToPlayer(item, ctx);
      if (d <= item.radius && d < bestDist && item.canInteract?.(ctx) !== false) {
        best = item;
        bestDist = d;
      }
    }
    this.setFocus(best);
  }

  interactFocused(): boolean {
    if (!this.current) return false;
    this.run(this.current);
    return true;
  }

  /** Tap/click at a world position: interacts with a tapped object that is in range. */
  interactAt(worldX: number, worldY: number): boolean {
    const ctx = this.getContext();
    let best: Interactable | null = null;
    let bestDist = TAP_TOLERANCE_PX;
    for (const item of this.items.values()) {
      const p = item.getPosition();
      const d = Math.hypot(p.x - worldX, p.y - worldY);
      if (d <= bestDist && this.distanceToPlayer(item, ctx) <= item.radius && item.canInteract?.(ctx) !== false) {
        best = item;
        bestDist = d;
      }
    }
    if (!best) return false;
    this.run(best);
    return true;
  }

  clear(): void {
    this.items.clear();
    this.setFocus(null);
  }

  private run(item: Interactable): void {
    item.onInteract(this.getContext());
    bus.emit('interacted', { id: item.id });
  }

  private distanceToPlayer(item: Interactable, ctx: InteractionContext): number {
    const p = item.getPosition();
    return Math.hypot(p.x - ctx.playerX, p.y - ctx.playerY);
  }

  private setFocus(item: Interactable | null): void {
    const label = item?.label ?? '';
    if (item === this.current && label === this.currentLabel) return;
    this.current = item;
    this.currentLabel = label;
    bus.emit('interaction-focus', item ? { id: item.id, label } : null);
  }
}

// ── Data-driven interactables (MapDef.interactables) ─────────────────────────

type SpecHandler<K extends InteractableSpec['type']> = (
  spec: Extract<InteractableSpec, { type: K }>,
  ctx: InteractionContext,
) => void;

const specHandlers: { [K in InteractableSpec['type']]: SpecHandler<K> } = {
  dialogue: (spec, ctx) => ctx.world.showDialogue(spec.dialogueId),
  door: (spec, ctx) => {
    const unlocked = !spec.locked || (spec.unlockFlag !== undefined && gameState.hasFlag(spec.unlockFlag));
    if (!unlocked) {
      if (spec.lockedDialogueId) ctx.world.showDialogue(spec.lockedDialogueId);
      else ctx.world.toast('Verschlossen.');
      return;
    }
    if (spec.target) ctx.world.changeMap(spec.target.mapId, spec.target.spawn);
  },
};

/** Replace the behavior of a built-in spec type (e.g. Wave 3 adds key checks to doors). */
export function setSpecHandler<K extends InteractableSpec['type']>(type: K, handler: SpecHandler<K>): void {
  (specHandlers as Record<string, unknown>)[type] = handler;
}

export function createSpecInteractable(spec: InteractableSpec): Interactable {
  const pos = { x: spec.at.x * TILE_SIZE, y: spec.at.y * TILE_SIZE };
  return {
    id: spec.id,
    label: spec.label,
    radius: spec.radius ?? 56,
    getPosition: () => pos,
    onInteract: (ctx) => (specHandlers[spec.type] as SpecHandler<typeof spec.type>)(spec as never, ctx),
  };
}
