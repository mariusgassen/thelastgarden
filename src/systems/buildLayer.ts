import Phaser from 'phaser';
import { content } from '../content';
import { TILE_SIZE } from '../world/tiles';
import type { MapDef } from '../world/types';
import { restUntilMorning } from './blight';
import {
  BUILD_REACH_TILES,
  getBuildMode,
  getPieceAt,
  getPieces,
  placePiece,
  removePiece,
  whyNotPlace,
  whyNotRemove,
  type PlacedPiece,
} from './building';
import { prefersReducedMotion } from '../ui/viewport';
import { bus } from './events';
import type { InteractionSystem } from './interaction';
import { machineAction } from './machines';
import type { Facing } from './save';
import { gameState } from './state';

interface LivePiece {
  piece: PlacedPiece;
  sprite: Phaser.GameObjects.Image;
  body?: Phaser.GameObjects.Zone;
  /** Moving parts drawn on top of the sprite (the windmill's sails). */
  extra?: Phaser.GameObjects.Image;
}

const OK_COLOR = 0x9be26a;
const NO_COLOR = 0xe2705a;
const PICK_COLOR = 0xe9a23b;

const pieceKey = (p: { x: number; y: number }): string => `${p.x},${p.y}`;

export function buildTextureKey(pieceId: string): string {
  return `build-${pieceId}`;
}

/**
 * Scene-bound renderer, colliders and build-mode cursor for the current map's built pieces.
 * All rules live in systems/building.ts; this layer only draws and forwards taps.
 */
export class BuildLayer {
  private readonly live = new Map<string, LivePiece>();
  private readonly ghost: Phaser.GameObjects.Image;
  private readonly outline: Phaser.GameObjects.Graphics;
  private target: { x: number; y: number } | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: MapDef,
    private readonly solids: Phaser.Physics.Arcade.StaticGroup,
    private readonly interaction: InteractionSystem,
    private readonly ground: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer,
    private readonly getPlayer: () => { x: number; y: number; facing: Facing },
    /** Touch devices have no hover: a tap on a tile builds there right away. */
    private readonly touch: boolean,
  ) {
    this.ghost = scene.add.image(0, 0, buildTextureKey(getBuildMode().pieceId)).setVisible(false).setDepth(95_000);
    this.outline = scene.add.graphics().setVisible(false).setDepth(95_001);
    this.sync();
    bus.onScene(scene, 'build-changed', ({ mapId }) => {
      if (mapId === map.id) this.sync();
    });
  }

  /** Call every frame; draws the cursor while build mode is on. */
  update(enabled: boolean): void {
    const mode = getBuildMode();
    if (!enabled || !mode.active || this.touch) {
      this.target = null;
      this.ghost.setVisible(false);
      this.outline.setVisible(false);
      return;
    }
    const player = this.getPlayer();
    this.target = this.hoverTile(player) ?? {
      x: Math.floor(player.x / TILE_SIZE) + (player.facing === 'left' ? -1 : 1),
      y: Math.floor(player.y / TILE_SIZE),
    };
    this.drawCursor(this.target, player);
  }

  /** Keyboard confirm: act on the tile under the cursor. */
  confirm(): void {
    if (this.target) this.act(this.target.x, this.target.y);
  }

  /** A tap or click at a world position while build mode is on. */
  tap(worldX: number, worldY: number): void {
    this.act(Math.floor(worldX / TILE_SIZE), Math.floor(worldY / TILE_SIZE));
  }

  private hoverTile(player: { x: number; y: number }): { x: number; y: number } | null {
    const pointer = this.scene.input.activePointer;
    const p = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    if (Math.hypot(p.x - player.x, p.y - player.y) > (BUILD_REACH_TILES + 0.5) * TILE_SIZE) return null;
    return { x: Math.floor(p.x / TILE_SIZE), y: Math.floor(p.y / TILE_SIZE) };
  }

  private act(x: number, y: number): void {
    const player = this.getPlayer();
    const existing = getPieceAt(this.map.id, x, y);
    if (existing) {
      const reason = removePiece(this.map.id, x, y, player);
      if (reason) this.refuse(x, y, reason);
      else bus.emit('toast', { text: `${content.buildables.get(existing.id).name} abgebaut.` });
      return;
    }
    const pieceId = getBuildMode().pieceId;
    const first = !gameState.hasFlag(`built:${pieceId}`);
    const reason = placePiece(this.map.id, pieceId, x, y, player);
    if (reason) this.refuse(x, y, reason);
    else {
      this.puff((x + 0.5) * TILE_SIZE, (y + 0.8) * TILE_SIZE);
      const def = content.buildables.get(pieceId);
      if (first && def.machine) bus.emit('toast', { text: def.description });
    }
  }

  private refuse(x: number, y: number, reason: string): void {
    bus.emit('toast', { text: reason });
    const flash = this.scene.add.graphics().setDepth(95_001);
    flash.lineStyle(2, NO_COLOR, 1).strokeRect(x * TILE_SIZE + 1, y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    this.scene.tweens.add({ targets: flash, alpha: 0, duration: 450, onComplete: () => flash.destroy() });
  }

  private puff(x: number, y: number): void {
    const emitter = this.scene.add.particles(x, y, 'sparkle', {
      angle: { min: 200, max: 340 },
      speed: { min: 20, max: 55 },
      lifespan: 420,
      scale: { start: 0.8, end: 0 },
      tint: 0xe8d9b5,
      emitting: false,
    });
    emitter.setDepth(y + 1).explode(7);
    this.scene.time.delayedCall(550, () => emitter.destroy());
  }

  private drawCursor(tile: { x: number; y: number }, player: { x: number; y: number }): void {
    const mode = getBuildMode();
    const existing = getPieceAt(this.map.id, tile.x, tile.y);
    const blocked = existing
      ? whyNotRemove(this.map.id, tile.x, tile.y, player)
      : whyNotPlace(this.map.id, mode.pieceId, tile.x, tile.y, player);
    const color = blocked ? NO_COLOR : existing ? PICK_COLOR : OK_COLOR;
    this.outline
      .clear()
      .lineStyle(2, color, 0.95)
      .strokeRect(tile.x * TILE_SIZE + 1, tile.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2)
      .setVisible(true);
    if (existing) {
      this.ghost.setVisible(false);
      return;
    }
    const pos = this.spritePosition(mode.pieceId, tile.x, tile.y);
    this.ghost
      .setTexture(buildTextureKey(mode.pieceId))
      .setOrigin(0.5, pos.originY)
      .setPosition(pos.x, pos.y)
      .setAlpha(blocked ? 0.4 : 0.7)
      .setTint(blocked ? NO_COLOR : 0xffffff)
      .setVisible(true);
  }

  private spritePosition(pieceId: string, x: number, y: number): { x: number; y: number; originY: number; depth: number } {
    const cx = (x + 0.5) * TILE_SIZE;
    // Bridges lie flat on the water; everything else stands on the tile's lower edge.
    if (content.buildables.get(pieceId).on === 'water') return { x: cx, y: (y + 0.5) * TILE_SIZE, originY: 0.5, depth: -6 };
    return { x: cx, y: (y + 1) * TILE_SIZE, originY: 1, depth: (y + 0.7) * TILE_SIZE - 1 };
  }

  private sync(): void {
    const pieces = getPieces(this.map.id);
    const wanted = new Set(pieces.map(pieceKey));
    for (const [k, entry] of this.live) {
      if (wanted.has(k) && pieces.some((p) => pieceKey(p) === k && p.id === entry.piece.id)) continue;
      this.despawn(k, entry);
    }
    for (const piece of pieces) if (!this.live.has(pieceKey(piece))) this.spawn(piece);
  }

  private spawn(piece: PlacedPiece): void {
    const def = content.buildables.get(piece.id);
    const pos = this.spritePosition(piece.id, piece.x, piece.y);
    const sprite = this.scene.add.image(pos.x, pos.y, buildTextureKey(piece.id)).setOrigin(0.5, pos.originY).setDepth(pos.depth);
    const entry: LivePiece = { piece, sprite };
    if (def.solid) {
      const s = def.solid;
      entry.body = this.scene.add.zone(
        (piece.x + s.x + s.w / 2) * TILE_SIZE,
        (piece.y + s.y + s.h / 2) * TILE_SIZE,
        s.w * TILE_SIZE,
        s.h * TILE_SIZE,
      );
      this.solids.add(entry.body);
    }
    if (def.on === 'water') this.ground.getTileAt(piece.x, piece.y)?.setCollision(false);
    if (def.rest) {
      const at = { x: (piece.x + 0.5) * TILE_SIZE, y: (piece.y + 0.8) * TILE_SIZE };
      this.interaction.register({
        id: `build:${pieceKey(piece)}`,
        label: 'Rasten',
        radius: 50,
        markerOffset: 60,
        getPosition: () => at,
        onInteract: (ctx) => {
          restUntilMorning();
          this.scene.cameras.main.fadeIn(900, 16, 25, 54);
          ctx.world.toast('Du rastest unter dem Dach, bis der Morgen kommt.');
        },
      });
    }
    if (def.machine) this.registerMachine(piece);
    if (def.machine === 'windmill') entry.extra = this.addSails(pos);
    this.live.set(pieceKey(piece), entry);
  }

  /** Rack, windmill and compost heap: one interactable whose label follows the machine's state. */
  private registerMachine(piece: PlacedPiece): void {
    const at = { x: (piece.x + 0.5) * TILE_SIZE, y: (piece.y + 0.8) * TILE_SIZE };
    const mapId = this.map.id;
    const action = () => machineAction(mapId, piece.x, piece.y);
    if (!action()) return;
    this.interaction.register({
      id: `build:${pieceKey(piece)}`,
      get label() {
        return action()?.label ?? '';
      },
      radius: 56,
      markerOffset: 64,
      getPosition: () => at,
      onInteract: (ctx) => {
        const act = action();
        if (act) ctx.world.toast(act.act());
      },
    });
  }

  private addSails(pos: { x: number; y: number; depth: number }): Phaser.GameObjects.Image {
    const sails = this.scene.add.image(pos.x, pos.y - 64 + 17, 'build-windmill-sails').setDepth(pos.depth + 1);
    if (!prefersReducedMotion()) this.scene.tweens.add({ targets: sails, angle: 360, duration: 14_000, repeat: -1 });
    return sails;
  }

  private despawn(k: string, entry: LivePiece): void {
    this.live.delete(k);
    entry.sprite.destroy();
    if (entry.extra) {
      this.scene.tweens.killTweensOf(entry.extra);
      entry.extra.destroy();
    }
    if (entry.body) this.solids.remove(entry.body, true, true);
    if (content.buildables.get(entry.piece.id).on === 'water') {
      this.ground.getTileAt(entry.piece.x, entry.piece.y)?.setCollision(true);
    }
    this.interaction.unregister(`build:${k}`);
  }
}
