import Phaser from 'phaser';
import { content } from '../content';
import type { NpcDef, NpcDialogueRule } from '../content/types';
import { prefersReducedMotion } from '../ui/viewport';
import { TILE_SIZE } from '../world/tiles';
import type { MapDef, NpcPlacementDef, TileRect } from '../world/types';
import { addPlacementBlocker, isTileWalkable } from './building';
import { getDayTime } from './dayClock';
import { bus } from './events';
import { onDialogueClosed, type InteractionSystem } from './interaction';
import { gameState } from './state';

/** First rule whose flag conditions hold, else undefined (caller falls back to `def.dialogueId`). */
export function pickNpcDialogue(def: NpcDef): NpcDialogueRule | undefined {
  return def.dialogues?.find(
    (rule) =>
      (!rule.mapId || rule.mapId === gameState.data.player.mapId) &&
      (rule.requires ?? []).every((flag) => gameState.hasFlag(flag)) &&
      !(rule.forbids ?? []).some((flag) => gameState.hasFlag(flag)) &&
      (rule.requiresItems ?? []).every((item) => gameState.getItemCount(item.itemId) >= item.count),
  );
}

const WALK_SPEED = 22;
/** An NPC halts while the player is this close (px), so a chat never walks away mid-sentence. */
const PAUSE_NEAR_PLAYER = 96;
/** Tiles around a door, sign, arrival point or journal page stay free of strollers. */
const KEEP_FREE_TILES = 1.1;

interface LiveNpc {
  def: NpcDef;
  placement: NpcPlacementDef;
  sprite: Phaser.GameObjects.Image;
  /** Current feet position in px. */
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  radius: number;
  visible: boolean;
  hop: { v: number };
  target: { x: number; y: number } | null;
  wait: number;
  moving: boolean;
}

/** Tiles (per map) where an NPC currently stands, so the builder can leave them alone. */
const standing = new Map<string, Set<string>>();
const tileKey = (x: number, y: number): string => `${x},${y}`;
const tileOf = (px: number, py: number): { tx: number; ty: number } => ({
  tx: Math.floor(px / TILE_SIZE),
  ty: Math.floor((py - 4) / TILE_SIZE),
});

addPlacementBlocker((mapId, x, y) => (standing.get(mapId)?.has(tileKey(x, y)) ? 'Hier steht gerade jemand.' : null));

const inRect = (r: TileRect, tx: number, ty: number): boolean => tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h;

/**
 * Scene-bound NPCs for the current map (MapDef.npcs). Each is an interactable `npc:<id>`
 * that shows the first matching NpcDialogueRule and applies its effects when that
 * dialogue closes. Visual behavior is deliberately simple: face the player, hop now and then.
 */
export class NpcLayer {
  private readonly live: LiveNpc[] = [];
  private readonly map: MapDef;
  private readonly still: boolean;

  constructor(
    private readonly scene: Phaser.Scene,
    map: MapDef,
    private readonly interaction: InteractionSystem,
    private readonly getPlayer: () => { x: number; y: number },
  ) {
    this.map = map;
    this.still = prefersReducedMotion();
    for (const placement of map.npcs ?? []) {
      const def = content.npcs.get(placement.npcId);
      const x = placement.at.x * TILE_SIZE;
      const y = placement.at.y * TILE_SIZE;
      const sprite = scene.add.image(x, y, def.id).setOrigin(0.5, 1).setDepth(y);
      const entry: LiveNpc = {
        def,
        placement,
        sprite,
        x,
        y,
        homeX: x,
        homeY: y,
        radius: placement.radius ?? 64,
        visible: false,
        hop: { v: 0 },
        target: null,
        wait: 1000 + Math.random() * 3000,
        moving: false,
      };
      this.live.push(entry);
      this.scheduleHop(entry);
      this.syncVisibility(entry);
    }
    this.markStanding();
    bus.onScene(scene, 'flag-changed', () => {
      for (const entry of this.live) this.syncVisibility(entry);
    });
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
      standing.delete(map.id);
    });
  }

  private isVisible(placement: NpcPlacementDef): boolean {
    return (
      (!placement.showWhenFlag || gameState.hasFlag(placement.showWhenFlag)) &&
      (!placement.hideWhenFlag || !gameState.hasFlag(placement.hideWhenFlag))
    );
  }

  private syncVisibility(entry: LiveNpc): void {
    const next = this.isVisible(entry.placement);
    entry.sprite.setVisible(next);
    if (next === entry.visible) return;
    entry.visible = next;
    if (next) this.register(entry);
    else this.interaction.unregister(`npc:${entry.def.id}`);
  }

  private register(entry: LiveNpc): void {
    const { def, radius } = entry;
    this.interaction.register({
      id: `npc:${def.id}`,
      label: def.interactLabel ?? 'Ansprechen',
      radius,
      markerOffset: 46,
      getPosition: () => ({ x: entry.x, y: entry.y - 10 }),
      onInteract: (ctx) => {
        const rule = pickNpcDialogue(def);
        const dialogueId = rule?.dialogueId ?? def.dialogueId;
        if (!dialogueId) return;
        ctx.world.showDialogue(dialogueId);
        if (!rule) return;
        onDialogueClosed(dialogueId, () => {
          for (const item of rule.takeItems ?? []) gameState.removeItem(item.itemId, item.count);
          for (const item of rule.giveItems ?? []) {
            gameState.addItem(item.itemId, item.count);
            ctx.world.toast(`+${item.count} ${content.items.get(item.itemId).name}`);
          }
          for (const flag of rule.setFlags ?? []) gameState.setFlag(flag);
          gameState.save();
        });
      },
    });
  }

  private scheduleHop(entry: LiveNpc): void {
    this.scene.time.delayedCall(1800 + Math.random() * 2600, () => {
      if (!entry.sprite.active) return;
      this.scene.tweens.add({
        targets: entry.hop,
        v: 7,
        duration: 130,
        yoyo: true,
        ease: 'Quad.easeOut',
        onComplete: () => this.scheduleHop(entry),
      });
    });
  }

  // ── Daily routine ──────────────────────────────────────────

  /** Up and about: by day for most, by night for nocturnal NPCs; otherwise they rest at home. */
  private isActive(entry: LiveNpc): boolean {
    const { phase } = getDayTime();
    const night = phase === 'dusk' || phase === 'night';
    return entry.placement.nocturnal ? night : !night;
  }

  /** Whether an NPC may stand on this tile: open ground, no bed, solid prop, obstacle or doorway. */
  private canStandOn(entry: LiveNpc, tx: number, ty: number): boolean {
    const map = this.map;
    const home = tileOf(entry.homeX, entry.homeY);
    if (tx === home.tx && ty === home.ty) return true;
    if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return false;
    if (!isTileWalkable(map.id, tx, ty)) return false;
    if ((map.plantingBeds ?? []).some((b) => inRect(b.rect, tx, ty))) return false;
    if (map.props.some((p) => p.solid && inRect(p.solid, tx, ty))) return false;
    if (map.obstacles.some((o) => inRect(o.rect, tx, ty))) return false;
    if ((map.blightHearts ?? []).some((h) => Math.floor(h.at.x) === tx && Math.floor(h.at.y) === ty)) return false;
    const keepFree = [...map.interactables.map((i) => i.at), ...Object.values(map.spawns), ...(map.journalPages ?? []).map((j) => j.at)];
    return !keepFree.some((pt) => Math.hypot(tx + 0.5 - pt.x, ty + 0.5 - pt.y) <= KEEP_FREE_TILES);
  }

  private pickTarget(entry: LiveNpc): { x: number; y: number } | null {
    const range = entry.placement.wander ?? 0;
    for (let tries = 0; tries < 8; tries++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = (0.6 + Math.random() * Math.max(0, range - 0.6)) * TILE_SIZE;
      const x = entry.homeX + Math.cos(angle) * dist;
      const y = entry.homeY + Math.sin(angle) * dist * 0.8;
      const { tx, ty } = tileOf(x, y);
      if (this.canStandOn(entry, tx, ty)) return { x, y };
    }
    return null;
  }

  private stepNpc(entry: LiveNpc, deltaMs: number, player: { x: number; y: number }): void {
    const range = entry.placement.wander ?? 0;
    if (range <= 0 || this.still || !entry.visible) return;
    const near = Math.hypot(player.x - entry.x, player.y - entry.y) < PAUSE_NEAR_PLAYER;
    entry.moving = false;
    if (near) return;
    if (!this.isActive(entry)) {
      // Resting: head back to the home spot and stay there.
      entry.target = { x: entry.homeX, y: entry.homeY };
    } else if (!entry.target) {
      entry.wait -= deltaMs;
      if (entry.wait > 0) return;
      entry.target = this.pickTarget(entry);
      entry.wait = 1800 + Math.random() * 4200;
      if (!entry.target) return;
    }
    const target = entry.target;
    if (!target) return;
    const dx = target.x - entry.x;
    const dy = target.y - entry.y;
    const dist = Math.hypot(dx, dy);
    const step = (WALK_SPEED * deltaMs) / 1000;
    if (dist <= step) {
      entry.x = target.x;
      entry.y = target.y;
      entry.target = null;
    } else {
      const nx = entry.x + (dx / dist) * step;
      const ny = entry.y + (dy / dist) * step;
      const { tx, ty } = tileOf(nx, ny);
      if (!this.canStandOn(entry, tx, ty)) {
        entry.target = null; // something was built in the way; pause and choose again
        return;
      }
      entry.x = nx;
      entry.y = ny;
      entry.moving = true;
      if (Math.abs(dx) > 1) entry.sprite.setFlipX(dx < 0);
    }
    this.markStanding();
  }

  private markStanding(): void {
    const tiles = new Set<string>();
    for (const npc of this.live) {
      if (!npc.visible) continue;
      const { tx, ty } = tileOf(npc.x, npc.y);
      tiles.add(tileKey(tx, ty));
    }
    standing.set(this.map.id, tiles);
  }

  private update(_time: number, deltaMs: number): void {
    const player = this.getPlayer();
    for (const npc of this.live) {
      this.stepNpc(npc, deltaMs, player);
      // Face the player when standing around; face the way of travel while walking.
      if (!npc.moving) npc.sprite.setFlipX(player.x < npc.x - 4);
      npc.sprite.setPosition(npc.x, npc.y - npc.hop.v).setDepth(npc.y);
    }
  }
}
