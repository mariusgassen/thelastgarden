import Phaser from 'phaser';
import { content } from '../content';
import { prefersReducedMotion } from '../ui/viewport';
import { TILE_SIZE } from '../world/tiles';
import { itemTextureKey } from '../world/textures';
import {
  collectProduce,
  feedHorse,
  getHomes,
  homeKey,
  isHorseRested,
  plantedBedsNear,
  readyProduce,
  type Home,
} from './animals';
import { getPieceAt, isTileWalkable } from './building';
import { bus } from './events';
import { hasHorse } from './horse';
import type { InteractionSystem } from './interaction';
import { gameState } from './state';

const WANDER_RADIUS_TILES = 1.6;
const HEN_SPEED = 16;
const GOAT_SPEED = 20;
const BADGE_REFRESH_MS = 600;

const LABELS: Record<Home['animal'], string> = {
  hens: 'Eier nehmen',
  bees: 'Honig nehmen',
  goat: 'Streicheln',
  horse: 'Mohn besuchen',
};

interface Resident {
  sprite: Phaser.GameObjects.Image;
  speed: number;
  target: { x: number; y: number } | null;
  wait: number;
}

interface LiveHome {
  home: Home;
  residents: Resident[];
  bees: { sprite: Phaser.GameObjects.Image; phase: number; r: number }[];
  badge?: Phaser.GameObjects.Image;
  badgeItem?: string;
}

/**
 * Scene-bound residents of the current map's animal homes: hens and a goat that wander about
 * their house, bees circling a hive, a badge when eggs or honey are waiting, and the
 * interaction to take them. All rules live in systems/animals.ts.
 */
export class AnimalLayer {
  private readonly live = new Map<string, LiveHome>();
  private readonly still = prefersReducedMotion();
  private time = 0;
  private badgeClock = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly mapId: string,
    private readonly interaction: InteractionSystem,
  ) {
    this.sync();
    bus.onScene(scene, 'build-changed', ({ mapId: id }) => {
      if (id === mapId) this.sync();
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.live.clear());
  }

  update(deltaMs: number): void {
    this.time += deltaMs;
    this.badgeClock += deltaMs;
    for (const entry of this.live.values()) {
      for (const bee of entry.bees) this.moveBee(entry.home, bee);
      for (const r of entry.residents) this.moveResident(entry.home, r, deltaMs);
    }
    if (this.badgeClock >= BADGE_REFRESH_MS) {
      this.badgeClock = 0;
      for (const entry of this.live.values()) this.refreshBadge(entry);
    }
  }

  // ── Setup ──────────────────────────────────────────────────

  private sync(): void {
    const homes = getHomes().filter((h) => h.mapId === this.mapId);
    const wanted = new Map(homes.map((h) => [homeKey(h), h]));
    for (const [k, entry] of this.live) {
      if (wanted.has(k)) continue;
      this.despawn(k, entry);
    }
    for (const [k, home] of wanted) if (!this.live.has(k)) this.spawn(k, home);
  }

  private spawn(k: string, home: Home): void {
    const cx = (home.x + 0.5) * TILE_SIZE;
    const base = (home.y + 1) * TILE_SIZE;
    const entry: LiveHome = { home, residents: [], bees: [] };
    const count = home.animal === 'hens' ? 2 : home.animal === 'goat' ? 1 : 0;
    for (let i = 0; i < count; i++) {
      const sprite = this.scene.add
        .image(cx + (i - 0.5) * 22, base + 8, home.animal === 'hens' ? 'hen' : 'goat')
        .setOrigin(0.5, 1)
        .setFlipX(i % 2 === 1);
      entry.residents.push({ sprite, speed: home.animal === 'hens' ? HEN_SPEED : GOAT_SPEED, target: null, wait: 800 + i * 1400 });
      sprite.setDepth(sprite.y);
    }
    if (home.animal === 'bees') {
      for (let i = 0; i < 4; i++) {
        entry.bees.push({
          sprite: this.scene.add.image(cx, base - 24, 'bee').setDepth(base + 30),
          phase: (i / 4) * Math.PI * 2,
          r: 14 + (i % 2) * 8,
        });
      }
    }
    this.interaction.register({
      id: `animal:${k}`,
      label: LABELS[home.animal],
      radius: 56,
      markerOffset: 46,
      getPosition: () => ({ x: cx, y: base - 14 }),
      onInteract: () => this.interact(home),
    });
    this.live.set(k, entry);
    this.refreshBadge(entry);
  }

  private despawn(k: string, entry: LiveHome): void {
    this.live.delete(k);
    for (const r of entry.residents) r.sprite.destroy();
    for (const b of entry.bees) b.sprite.destroy();
    entry.badge?.destroy();
    this.interaction.unregister(`animal:${k}`);
  }

  // ── Movement ───────────────────────────────────────────────

  private moveBee(home: Home, bee: { sprite: Phaser.GameObjects.Image; phase: number; r: number }): void {
    const cx = (home.x + 0.5) * TILE_SIZE;
    const cy = (home.y + 0.4) * TILE_SIZE;
    const a = this.still ? bee.phase : bee.phase + this.time * 0.003;
    bee.sprite.setPosition(cx + Math.cos(a) * bee.r, cy + Math.sin(a * 1.7) * (bee.r * 0.55) - 6);
  }

  private moveResident(home: Home, r: Resident, deltaMs: number): void {
    if (this.still) return;
    if (r.wait > 0) {
      r.wait -= deltaMs;
      return;
    }
    if (!r.target) {
      r.target = this.pickTarget(home);
      if (!r.target) r.wait = 2500;
      return;
    }
    const dx = r.target.x - r.sprite.x;
    const dy = r.target.y - r.sprite.y;
    const dist = Math.hypot(dx, dy);
    const step = (r.speed * deltaMs) / 1000;
    if (dist <= step) {
      r.sprite.setPosition(r.target.x, r.target.y);
      r.target = null;
      r.wait = 1200 + Math.random() * 3200;
    } else {
      r.sprite.setPosition(r.sprite.x + (dx / dist) * step, r.sprite.y + (dy / dist) * step);
      if (Math.abs(dx) > 1) r.sprite.setFlipX(dx < 0);
    }
    r.sprite.setDepth(r.sprite.y);
  }

  /** A walkable spot near the home that no piece stands on, or null. */
  private pickTarget(home: Home): { x: number; y: number } | null {
    for (let tries = 0; tries < 6; tries++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = (0.7 + Math.random() * (WANDER_RADIUS_TILES - 0.7)) * TILE_SIZE;
      const x = (home.x + 0.5) * TILE_SIZE + Math.cos(angle) * dist;
      const y = (home.y + 1) * TILE_SIZE + Math.sin(angle) * dist * 0.8 + 6;
      const tx = Math.floor(x / TILE_SIZE);
      const ty = Math.floor((y - 4) / TILE_SIZE);
      if ((tx === home.x && ty === home.y) || getPieceAt(this.mapId, tx, ty) || !isTileWalkable(this.mapId, tx, ty)) continue;
      return { x, y };
    }
    return null;
  }

  // ── Produce badge and interaction ──────────────────────────

  private refreshBadge(entry: LiveHome): void {
    const ready = readyProduce(entry.home);
    if (!ready || ready.count === 0) {
      entry.badge?.setVisible(false);
      return;
    }
    if (!entry.badge || entry.badgeItem !== ready.itemId) {
      entry.badge?.destroy();
      const x = (entry.home.x + 0.5) * TILE_SIZE;
      const y = (entry.home.y + 1) * TILE_SIZE - 40;
      entry.badge = this.scene.add.image(x, y, itemTextureKey(ready.itemId)).setScale(0.55).setDepth(94_000);
      entry.badgeItem = ready.itemId;
      if (!this.still) {
        this.scene.tweens.add({ targets: entry.badge, y: y - 4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
    entry.badge.setVisible(true);
  }

  private interact(home: Home): void {
    const toast = (text: string): void => bus.emit('toast', { text });
    switch (home.animal) {
      case 'hens':
      case 'bees': {
        const got = collectProduce(home);
        if (got) toast(`${got.count} ${content.items.get(got.itemId).name} genommen.`);
        else if (home.animal === 'hens') toast('Noch keine Eier. Die Hennen scharren zufrieden im Stroh.');
        else if (plantedBedsNear(home).length === 0) toast('Die Bienen finden hier keine Blüten. Pflanz etwas in der Nähe.');
        else toast('Noch kein Honig. Die Bienen sind fleißig.');
        break;
      }
      case 'goat':
        toast('Die Ziege knabbert an deinem Ärmel. Nachts sorgt sie für Ordnung ums Gehege.');
        break;
      case 'horse':
        if (!hasHorse()) toast('Der Stall ist noch leer. Vielleicht findet sich jemand dafür.');
        else if (isHorseRested()) toast('Mohn dreht sich im Stroh um und schnaubt zufrieden.');
        else if (feedHorse()) toast('Mohn schleckt den Honig aus deiner Hand und wirkt ausgeruht.');
        else toast(`Mohn schläft hier gern. Nach einer Nacht im Stall (oder mit Honig) ist sie ausgeruht. ${gameState.getItemCount('produce-honey') === 0 ? 'Honig gibt es vom Bienenstock.' : ''}`.trim());
        break;
    }
  }
}
