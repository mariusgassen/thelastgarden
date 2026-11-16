import Phaser from 'phaser';
import { itemTextureKey } from '../world/textures';
import { TILE_SIZE } from '../world/tiles';
import { prefersReducedMotion } from '../ui/viewport';
import { pushBackBlight } from './blight';
import { bus } from './events';
import { getCarriedLight, getEquippedTool, useTool } from './tools';
import type { Facing } from './save';

type Player = { x: number; y: number; facing: Facing };

/** How often the carried lantern dries up the blight around the player, in ms. */
const PUSH_BACK_EVERY_MS = 250;
const HELD_OFFSET_X = 15;
const SPOT_COLORS = { sickle: 0xf3e38a, shovel: 0xa8753f, satchel: 0x9be26a, light: 0xffffff } as const;

/**
 * Scene-bound side of the tools (logic: systems/tools.ts): the lantern on its pole that the
 * player carries, the puffs when a tool is used, and the light the night veil opens around the
 * player. It only draws and forwards E and taps.
 */
export class ToolLayer {
  private readonly held: Phaser.GameObjects.Image;
  private readonly halo: Phaser.GameObjects.Image;
  private sincePush = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly mapId: string,
    private readonly getPlayer: () => Player,
  ) {
    this.held = scene.add.image(0, 0, itemTextureKey('tool-pole-lantern')).setOrigin(0.5, 1).setVisible(false);
    this.halo = scene.add
      .image(0, 0, 'light-halo')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xf3e38a)
      .setAlpha(0.3)
      .setVisible(false);
    if (!prefersReducedMotion()) {
      scene.tweens.add({ targets: this.halo, alpha: 0.18, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    bus.onScene(scene, 'tool-changed', () => this.update(0));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.held.destroy();
      this.halo.destroy();
    });
    this.update(0);
  }

  /** The carried light in world px, for the night veil; null while no lantern is in hand. */
  getLight(): { x: number; y: number; radius: number } | null {
    const light = getCarriedLight();
    if (!light) return null;
    const p = this.getPlayer();
    return { x: p.x + this.heldOffset(p), y: p.y - 34, radius: light.lightRadius };
  }

  /** Call every frame. */
  update(deltaMs: number): void {
    const light = getCarriedLight();
    const tool = getEquippedTool();
    const shown = light !== null && tool !== undefined;
    this.held.setVisible(shown);
    this.halo.setVisible(shown);
    if (!light) {
      this.sincePush = 0;
      return;
    }
    const p = this.getPlayer();
    const x = p.x + this.heldOffset(p);
    this.held.setPosition(x, p.y + 2).setFlipX(p.facing === 'left').setDepth(p.y + 1).setScale(1.15);
    this.halo.setPosition(x, p.y - 34).setDisplaySize(light.lightRadius * 1.6, light.lightRadius * 1.6).setDepth(p.y + 2);
    this.sincePush += deltaMs;
    if (this.sincePush >= PUSH_BACK_EVERY_MS) {
      this.sincePush = 0;
      pushBackBlight(this.mapId, p.x, p.y, light.pushBackTiles);
    }
  }

  /** E while the tool bar is open. */
  confirm(): void {
    this.use();
  }

  /** A tap or click while the tool bar is open: prioritizes beds at the tapped spot within reach. */
  tap(worldX?: number, worldY?: number): void {
    this.use(worldX !== undefined && worldY !== undefined ? { x: worldX, y: worldY } : undefined);
  }

  private heldOffset(p: Player): number {
    return p.facing === 'left' ? -HELD_OFFSET_X : HELD_OFFSET_X;
  }

  private use(target?: { x: number; y: number }): void {
    const p = this.getPlayer();
    const from = { x: p.x, y: p.y };
    const result = useTool(this.mapId, target ?? from, from);
    bus.emit('toast', { text: result.text });
    const kind = result.used;
    if (!result.ok || !kind) return;
    for (const spot of result.spots) this.puff(spot.x, spot.y, SPOT_COLORS[kind]);
    if (kind === 'sickle') this.swoosh(p);
  }

  private puff(x: number, y: number, tint: number): void {
    const emitter = this.scene.add.particles(x, y - 10, 'sparkle', {
      angle: { min: 200, max: 340 },
      speed: { min: 25, max: 65 },
      lifespan: 450,
      scale: { start: 0.9, end: 0 },
      tint,
      emitting: false,
    });
    emitter.setDepth(y + 1).explode(prefersReducedMotion() ? 3 : 9);
    this.scene.time.delayedCall(600, () => emitter.destroy());
  }

  /** A quick pale arc around the player, a sickle's sweep. */
  private swoosh(p: Player): void {
    const arc = this.scene.add.graphics().setDepth(p.y + 3);
    arc.lineStyle(3, 0xfff6e0, 0.85).beginPath();
    arc.arc(p.x, p.y - 12, 2.4 * TILE_SIZE * 0.6, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
    arc.strokePath();
    this.scene.tweens.add({ targets: arc, alpha: 0, duration: prefersReducedMotion() ? 120 : 320, onComplete: () => arc.destroy() });
  }
}
