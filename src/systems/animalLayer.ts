import Phaser from 'phaser';
import { content } from '../content';
import { prefersReducedMotion } from '../ui/viewport';
import { TILE_SIZE } from '../world/tiles';
import { itemTextureKey } from '../world/textures';
import {
  collectProduce,
  feedHorse,
  getHomes,
  hasClearDuckPath,
  homeKey,
  isDuckTraversable,
  isDuckWaterSurface,
  isHorseRested,
  plantedBedsNear,
  reachableDuckTiles,
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
const DUCK_SPEED = 22;
const GOAT_SPEED = 20;
const BADGE_REFRESH_MS = 600;

const LABELS: Record<Home['animal'], string> = {
  hens: 'Eier nehmen',
  bees: 'Honig nehmen',
  ducks: 'Tau nehmen',
  goat: 'Streicheln',
  horse: 'Mohn besuchen',
};

interface Resident {
  sprite: Phaser.GameObjects.Image;
  speed: number;
  target: { x: number; y: number } | null;
  wait: number;
  phase: number;
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
 * their house, ducks that swim on the pond and waddle along the shore, bees circling a hive,
 * a badge when produce is waiting, and the interaction to take them. All rules live in systems/animals.ts.
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
    const count = home.animal === 'hens' || home.animal === 'ducks' ? 2 : home.animal === 'goat' ? 1 : 0;
    const speed = home.animal === 'hens' ? HEN_SPEED : home.animal === 'ducks' ? DUCK_SPEED : GOAT_SPEED;
    const duckSpots = home.animal === 'ducks' ? reachableDuckTiles(home) : [];
    const duckWaterSpots = duckSpots.filter((s) => s.water);
    const duckStartPool = duckWaterSpots.length > 0 ? duckWaterSpots : duckSpots;
    for (let i = 0; i < count; i++) {
      let start: { x: number; y: number };
      if (home.animal === 'ducks' && duckStartPool.length > 0) {
        const spot = duckStartPool[Math.floor((i * duckStartPool.length) / count + Math.random() * (duckStartPool.length / count)) % duckStartPool.length];
        start = { x: (spot.x + 0.3 + Math.random() * 0.4) * TILE_SIZE, y: (spot.y + 0.4 + Math.random() * 0.35) * TILE_SIZE };
      } else {
        start =
          home.animal === 'ducks'
            ? { x: cx + (i - 0.5) * 14, y: (home.y + 0.65) * TILE_SIZE }
            : { x: cx + (i - 0.5) * 22, y: base + 8 };
      }
      const texture =
        home.animal === 'hens'
          ? 'hen'
          : home.animal === 'ducks'
            ? isDuckWaterSurface(this.mapId, start.x, start.y)
              ? 'duck'
              : 'duck-walk'
            : 'goat';
      const sprite = this.scene.add
        .image(start.x, start.y, texture)
        .setOrigin(0.5, 1)
        .setFlipX(i % 2 === 1);
      const wait = home.animal === 'ducks' ? 200 + i * 700 : 800 + i * 1400;
      entry.residents.push({ sprite, speed, target: null, wait, phase: i * 1.7 });
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
      r.target = home.animal === 'ducks' ? this.pickDuckTarget(home, r.sprite.x, r.sprite.y) : this.pickTarget(home);
      if (!r.target) r.wait = 1500;
      return;
    }
    const dx = r.target.x - r.sprite.x;
    const dy = r.target.y - r.sprite.y;
    const dist = Math.hypot(dx, dy);
    const step = (r.speed * deltaMs) / 1000;
    if (dist <= step) {
      r.sprite.setPosition(r.target.x, r.target.y);
      r.target = null;
      r.sprite.setRotation(0);
      r.wait = home.animal === 'ducks' ? 700 + Math.random() * 1800 : 1200 + Math.random() * 3200;
    } else {
      const nx = r.sprite.x + (dx / dist) * step;
      const ny = r.sprite.y + (dy / dist) * step;
      if (home.animal === 'ducks') {
        const tx = Math.floor(nx / TILE_SIZE);
        const ty = Math.floor((ny - 2) / TILE_SIZE);
        if (!isDuckTraversable(this.mapId, tx, ty)) {
          r.target = null;
          r.sprite.setRotation(0);
          return;
        }
      }
      r.sprite.setPosition(nx, ny);
      if (Math.abs(dx) > 1) r.sprite.setFlipX(dx < 0);
      if (home.animal === 'ducks') {
        const swimming = isDuckWaterSurface(this.mapId, nx, ny);
        const nextTex = swimming ? 'duck' : 'duck-walk';
        if (r.sprite.texture.key !== nextTex) r.sprite.setTexture(nextTex);
        r.sprite.setRotation(swimming ? 0 : Math.sin(this.time * 0.015 + r.phase) * 0.09);
      }
    }
    r.sprite.setDepth(r.sprite.y);
  }

  /** A walkable/swimmable water or shore spot connected to the duckhouse, with a clear path from current position. */
  private pickDuckTarget(home: Home, fromX: number, fromY: number): { x: number; y: number } | null {
    const spots = reachableDuckTiles(home);
    if (spots.length === 0) return null;
    const waterSpots = spots.filter((s) => s.water);
    const shoreSpots = spots.filter((s) => !s.water);
    const preferShore = shoreSpots.length > 0 && (waterSpots.length === 0 || Math.random() < 0.45);
    const pool = preferShore ? shoreSpots : waterSpots.length > 0 ? waterSpots : spots;
    for (let i = 0; i < 16; i++) {
      const list = i < 10 ? pool : spots;
      const spot = list[Math.floor(Math.random() * list.length)];
      const x = (spot.x + 0.2 + Math.random() * 0.6) * TILE_SIZE;
      const y = (spot.y + 0.3 + Math.random() * 0.55) * TILE_SIZE;
      if (Math.hypot(x - fromX, y - fromY) < 10) continue;
      if (hasClearDuckPath(this.mapId, fromX, fromY, x, y)) return { x, y };
    }
    // Fallback when boxed in by a corner: step to the nearest reachable tile with a clear path.
    const sorted = [...spots].sort(
      (a, b) =>
        Math.hypot((a.x + 0.5) * TILE_SIZE - fromX, (a.y + 0.6) * TILE_SIZE - fromY) -
        Math.hypot((b.x + 0.5) * TILE_SIZE - fromX, (b.y + 0.6) * TILE_SIZE - fromY),
    );
    for (const spot of sorted) {
      const x = (spot.x + 0.5) * TILE_SIZE;
      const y = (spot.y + 0.6) * TILE_SIZE;
      if (hasClearDuckPath(this.mapId, fromX, fromY, x, y)) return { x, y };
    }
    return null;
  }

  /** A walkable spot near the home that no piece stands on, or null. */
  private pickTarget(home: Home): { x: number; y: number } | null {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = (0.7 + Math.random() * (WANDER_RADIUS_TILES - 0.7)) * TILE_SIZE;
      const x = (home.x + 0.5) * TILE_SIZE + Math.cos(angle) * dist;
      const y = (home.y + 1) * TILE_SIZE + Math.sin(angle) * dist * 0.8 + 6;
      const tx = Math.floor(x / TILE_SIZE);
      const ty = Math.floor((y - 4) / TILE_SIZE);
      if ((tx === home.x && ty === home.y) || getPieceAt(this.mapId, tx, ty)) continue;
      if (!isTileWalkable(this.mapId, tx, ty)) continue;
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
      case 'bees':
      case 'ducks': {
        const got = collectProduce(home);
        if (got) toast(`${got.count} ${content.items.get(got.itemId).name} genommen.`);
        else if (home.animal === 'hens') toast('Noch keine Eier. Die Hennen scharren zufrieden im Stroh.');
        else if (home.animal === 'ducks') toast('Noch kein Tau. Die Enten gründeln gemütlich im Wasser.');
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
