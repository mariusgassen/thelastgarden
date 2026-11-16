import Phaser from 'phaser';
import { content, type DialogueLine } from '../content';
import { isBlightedPx } from '../systems/blight';
import { isHorseRested, RESTED_SPEED_FACTOR } from '../systems/animals';
import { AnimalLayer } from '../systems/animalLayer';
import { getMealSpeedFactor, isBlightproof } from '../systems/meals';
import { BlightLayer } from '../systems/blightLayer';
import { getBuildMode, isTileWalkable } from '../systems/building';
import { BuildLayer } from '../systems/buildLayer';
import { bus } from '../systems/events';
import { HORSE_FLAG, isRidingHere } from '../systems/horse';
import { HorseFollower } from '../systems/horseFollower';
import { inputState } from '../systems/input';
import { createSpecInteractable, InteractionSystem, type WorldApi } from '../systems/interaction';
import { JournalLayer } from '../systems/journal';
import { NightEventLayer } from '../systems/nightEvents';
import { NpcLayer } from '../systems/npcs';
import { ObstacleLayer } from '../systems/obstacles';
import { PlantLayer } from '../systems/plantLayer';
import { ToolLayer } from '../systems/toolLayer';
import { isToolActing } from '../systems/tools';
import { PlayerController } from '../systems/player';
import { QuestMarkerLayer } from '../systems/questMarkers';
import { ResourceLayer } from '../systems/resources';
import { AtmosphereLayer } from '../systems/atmosphere';
import { gameState } from '../systems/state';
import { DPR, isTouchDevice } from '../ui/viewport';
import { getMap, MAPS, START_MAP_ID, type MapDef, type ZoneDef } from '../world';
import { buildTileGrid, seededRandom, toFrameGrid } from '../world/grid';
import { SOLID_FRAMES, TILE_SIZE, TILES, TILESET_MARGIN, TILESET_SPACING, type TileId } from '../world/tiles';
import { SCENES } from './keys';

export interface WorldSceneData {
  mapId?: string;
  /** Named spawn in MapDef.spawns; omitted = saved position (or default spawn). */
  spawn?: string;
}

/** Tiles visible across the shorter screen side at zoom 1 (before clamping). */
const TARGET_TILES_ACROSS = 13;
/** Walking through blighted ground is slow going. */
const BLIGHT_SPEED_FACTOR = 0.6;

/**
 * Generic map scene: renders any MapDef and wires player, collisions, obstacles,
 * interactables and zones. Map changes restart this scene with new data.
 */
export class WorldScene extends Phaser.Scene implements WorldApi {
  map!: MapDef;
  player!: PlayerController;
  interaction!: InteractionSystem;
  obstacles!: ObstacleLayer;
  building!: BuildLayer;
  animals!: AnimalLayer;
  blight!: BlightLayer;
  plants!: PlantLayer;
  resources!: ResourceLayer;
  atmosphere!: AtmosphereLayer;
  tools!: ToolLayer;
  npcs!: NpcLayer;
  journal!: JournalLayer;
  questMarkers!: QuestMarkerLayer;
  night!: NightEventLayer;
  /** Static colliders (props, obstacles). Add your own solid bodies here. */
  solids!: Phaser.Physics.Arcade.StaticGroup;
  private marker!: Phaser.GameObjects.Image;
  private horse!: HorseFollower;
  private isWalkablePx: (x: number, y: number) => boolean = () => true;
  private flagProps: { image: Phaser.GameObjects.Image; showWhenFlag?: string; hideWhenFlag?: string; collider?: Phaser.GameObjects.Zone }[] = [];
  private currentZone: ZoneDef | null = null;
  private transitioning = false;

  constructor() {
    super(SCENES.world);
  }

  get mapId(): string {
    return this.map.id;
  }

  create(data: WorldSceneData): void {
    const mapId = data.mapId ?? gameState.data.player.mapId;
    this.map = MAPS[mapId] ?? getMap(START_MAP_ID);
    this.currentZone = null;
    this.transitioning = false;

    const widthPx = this.map.width * TILE_SIZE;
    const heightPx = this.map.height * TILE_SIZE;

    const grid = buildTileGrid(this.map);
    this.isWalkablePx = (x: number, y: number): boolean => {
      if (x < 16 || x > widthPx - 16 || y < 32 || y > heightPx - 16) return false;
      // Map tiles plus whatever the player built: bridges open water, solid pieces close ground.
      return isTileWalkable(this.map.id, Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));
    };

    const tilemap = this.make.tilemap({
      data: toFrameGrid(grid, this.map.decorate?.seed ?? 1),
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = tilemap.addTilesetImage('tiles', 'tiles', TILE_SIZE, TILE_SIZE, TILESET_MARGIN, TILESET_SPACING)!;
    const ground = tilemap.createLayer(0, tileset, 0, 0)!;
    ground.setCollision(SOLID_FRAMES).setDepth(-10);

    this.physics.world.setBounds(0, 0, widthPx, heightPx);
    this.cameras.main.setBackgroundColor(this.map.backgroundColor);

    this.solids = this.physics.add.staticGroup();
    this.decorate(grid);
    this.placeProps();

    this.interaction = new InteractionSystem(() => ({
      world: this,
      playerX: this.player.feetX,
      playerY: this.player.feetY,
    }));
    for (const spec of this.map.interactables) this.interaction.register(createSpecInteractable(spec));
    this.obstacles = new ObstacleLayer(this, this.map, this.solids, this.interaction);
    this.building = new BuildLayer(
      this,
      this.map,
      this.solids,
      this.interaction,
      ground,
      () => ({ x: this.player.feetX, y: this.player.feetY, facing: this.player.facing }),
      isTouchDevice(),
    );
    this.animals = new AnimalLayer(this, this.map.id, this.interaction);
    this.blight = new BlightLayer(this, this.map.id, this.interaction);
    this.plants = new PlantLayer(this, this.map.id, this.interaction);
    this.resources = new ResourceLayer(this, this.map.id, this.interaction);
    this.tools = new ToolLayer(this, this.map.id, () => ({ x: this.player.feetX, y: this.player.feetY, facing: this.player.facing }));
    this.atmosphere = new AtmosphereLayer(this, this.map, () => this.tools.getLight());
    this.npcs = new NpcLayer(this, this.map, this.interaction, () => this.player.feetX);
    this.journal = new JournalLayer(this, this.map.id, this.interaction);
    this.questMarkers = new QuestMarkerLayer(this, this.interaction);
    this.night = new NightEventLayer(this, this);

    const spawn = this.resolveSpawn(data.spawn);
    // Record the active map before checking riding state so building entry/exit and fast travel match this map.
    gameState.data.player.mapId = this.map.id;
    this.player = new PlayerController(this, spawn.x, spawn.y, gameState.data.player.facing);
    this.player.setRiding(isRidingHere(this.map.id));
    this.horse = new HorseFollower(this, this.map.id, this.isWalkablePx);
    this.horse.sync(this.player.feetX, this.player.feetY, this.player.facing);
    bus.onScene(this, 'riding-changed', () => this.applyRiding());
    bus.onScene(this, 'flag-changed', ({ key, value }) => {
      if (key === HORSE_FLAG && value) {
        const npcMohn = this.map.npcs?.find((n) => n.npcId === 'mohn');
        const at = npcMohn ? { x: npcMohn.at.x * TILE_SIZE, y: npcMohn.at.y * TILE_SIZE } : undefined;
        this.horse.sync(this.player.feetX, this.player.feetY, this.player.facing, at);
      }
    });
    bus.onScene(this, 'fast-travel', ({ mapId: destMapId, spawn: stopSpawn }) => this.changeMap(destMapId, stopSpawn));
    this.physics.add.collider(this.player.sprite, ground);
    this.physics.add.collider(this.player.sprite, this.solids);

    this.marker = this.add.image(0, 0, 'marker').setVisible(false).setDepth(100_000);
    this.tweens.add({ targets: this.marker, displayOriginY: 14, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.applyZoom();
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.applyZoom, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.applyZoom, this);
      this.horse.destroy();
      this.interaction.clear();
    });

    const kb = this.input.keyboard;
    if (kb) {
      for (const key of ['E', 'SPACE', 'ENTER']) kb.on(`keydown-${key}`, () => inputState.requestInteract());
      kb.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');
    }

    bus.onScene(this, 'tap', ({ x, y }) => {
      if (inputState.modal || this.transitioning) return;
      const p = this.cameras.main.getWorldPoint(x, y);
      if (getBuildMode().active) this.building.tap(p.x, p.y);
      else if (isToolActing()) this.tools.tap();
      else this.interaction.interactAt(p.x, p.y);
    });

    this.cameras.main.fadeIn(300, 31, 46, 29);
    bus.emit('map-changed', { mapId: this.map.id });
    this.updateZone();
    if (data.spawn) {
      this.syncPlayerToSave();
      gameState.save();
    }
  }

  override update(_time: number, delta: number): void {
    if (inputState.consumeInteract()) {
      if (inputState.modal) bus.emit('dialogue-advance', undefined);
      else if (!this.transitioning) {
        if (getBuildMode().active) this.building.confirm();
        else if (isToolActing()) this.tools.confirm();
        else this.interaction.interactFocused();
      }
    }

    const frozen = inputState.modal || this.transitioning;
    const building = getBuildMode().active || isToolActing();
    const onBlight = isBlightedPx(this.map.id, this.player.feetX, this.player.feetY);
    const restedHorse = isRidingHere(this.map.id) && isHorseRested() ? RESTED_SPEED_FACTOR : 1;
    const blightDrag = onBlight && !isBlightproof() ? BLIGHT_SPEED_FACTOR : 1;
    this.player.update(delta, frozen, blightDrag * restedHorse * getMealSpeedFactor());
    this.animals.update(delta);
    this.building.update(!frozen);
    this.tools.update(delta);
    this.horse.update(this.player.feetX, this.player.feetY, delta, frozen);
    this.atmosphere.update(delta);
    // While building (or working with a tool), E and taps act on the world, so nothing else takes the focus.
    this.interaction.update(!frozen && !building);
    this.updateMarker();
    this.updateZone();
    if (!this.transitioning) this.syncPlayerToSave();
  }

  private syncPlayerToSave(): void {
    const p = gameState.data.player;
    p.mapId = this.map.id;
    p.x = this.player.feetX;
    p.y = this.player.feetY;
    p.facing = this.player.facing;
  }

  // ── WorldApi ───────────────────────────────────────────────
  changeMap(mapId: string, spawn: string): void {
    if (this.transitioning) return;
    getMap(mapId); // throws early on typos in map data
    this.transitioning = true;
    this.player.sprite.setVelocity(0, 0);
    this.cameras.main.fadeOut(250, 31, 46, 29);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({ mapId, spawn } satisfies WorldSceneData);
    });
  }

  showDialogue(dialogueId: string): void {
    const dialogue = content.dialogues.get(dialogueId);
    bus.emit('dialogue-show', { id: dialogue.id, lines: dialogue.lines, style: dialogue.style, title: dialogue.title });
  }

  showLines(id: string, lines: DialogueLine[]): void {
    bus.emit('dialogue-show', { id, lines });
  }

  toast(text: string): void {
    bus.emit('toast', { text });
  }

  // ── internals ─────────────────────────────────────────────
  private applyRiding(): void {
    const riding = isRidingHere(this.map.id);
    if (riding === this.player.isRiding) return;
    const { feetX: x, feetY: y } = this.player;
    this.player.setRiding(riding);
    if (!riding) {
      // The player steps down beside her head.
      const left = this.player.facing === 'left';
      const beside = { x: x + (left ? 26 : -26), y };
      this.horse.sync(x, y, this.player.facing, this.isWalkablePx(beside.x, beside.y) ? beside : undefined);
    } else {
      this.horse.sync(x, y, this.player.facing);
    }
    const puff = this.add.particles(x, y - 6, 'sparkle', {
      angle: { min: 180, max: 360 },
      speed: { min: 20, max: 60 },
      lifespan: 450,
      scale: { start: 0.9, end: 0 },
      emitting: false,
    });
    puff.setDepth(y + 1).explode(8);
    this.time.delayedCall(600, () => puff.destroy());
  }

  private resolveSpawn(spawnName?: string): { x: number; y: number } {
    const saved = gameState.data.player;
    if (!spawnName && saved.mapId === this.map.id && saved.x >= 0 && saved.y >= 0) {
      return { x: saved.x, y: saved.y };
    }
    const tile = (spawnName && this.map.spawns[spawnName]) || this.map.spawns.default;
    return { x: tile.x * TILE_SIZE, y: tile.y * TILE_SIZE };
  }

  private applyZoom(): void {
    const cssMin = Math.min(this.scale.width, this.scale.height) / DPR;
    const zoom = Phaser.Math.Clamp(cssMin / (TARGET_TILES_ACROSS * TILE_SIZE), 1, 2) * DPR;
    const cam = this.cameras.main.setZoom(zoom);
    // Maps smaller than the view (interiors) are centered by growing the bounds symmetrically.
    const w = this.map.width * TILE_SIZE;
    const h = this.map.height * TILE_SIZE;
    const viewW = this.scale.width / zoom;
    const viewH = this.scale.height / zoom;
    const bw = Math.max(w, viewW);
    const bh = Math.max(h, viewH);
    cam.setBounds((w - bw) / 2, (h - bh) / 2, bw, bh);
  }

  private updateMarker(): void {
    const f = this.interaction.focused;
    if (!f) {
      this.marker.setVisible(false);
      return;
    }
    const p = f.getPosition();
    this.marker.setVisible(true).setPosition(p.x, p.y - (f.markerOffset ?? 34));
  }

  private updateZone(): void {
    const tx = this.player.feetX / TILE_SIZE;
    const ty = this.player.feetY / TILE_SIZE;
    const zone =
      this.map.zones.find((z) => tx >= z.rect.x && tx < z.rect.x + z.rect.w && ty >= z.rect.y && ty < z.rect.y + z.rect.h) ??
      null;
    if (!zone || zone === this.currentZone) return;
    this.currentZone = zone;
    gameState.markZoneVisited(zone.id);
    bus.emit('area-changed', { mapId: this.map.id, zoneId: zone.id, name: zone.name });
  }

  private placeProps(): void {
    this.flagProps = [];
    for (const prop of this.map.props) {
      const x = prop.at.x * TILE_SIZE;
      const y = prop.at.y * TILE_SIZE;
      const image = this.add
        .image(x, y, prop.texture)
        .setOrigin(0.5, 1)
        .setScale(prop.scale ?? 1)
        .setFlipX(prop.flipX ?? false)
        .setDepth(prop.ground ? -5 : y);
      const flagProp: (typeof this.flagProps)[number] | undefined =
        prop.showWhenFlag || prop.hideWhenFlag ? { image, showWhenFlag: prop.showWhenFlag, hideWhenFlag: prop.hideWhenFlag } : undefined;
      if (flagProp) this.flagProps.push(flagProp);
      if (prop.solid) {
        const r = prop.solid;
        const zone = this.add.zone((r.x + r.w / 2) * TILE_SIZE, (r.y + r.h / 2) * TILE_SIZE, r.w * TILE_SIZE, r.h * TILE_SIZE);
        this.solids.add(zone);
        // A prop that only appears later (a restored building) is not in the way before that.
        if (flagProp && prop.showWhenFlag) flagProp.collider = zone;
      }
    }
    this.applyPropFlags();
    bus.onScene(this, 'flag-changed', () => this.applyPropFlags());
  }

  private applyPropFlags(): void {
    for (const p of this.flagProps) {
      const visible =
        (!p.showWhenFlag || gameState.hasFlag(p.showWhenFlag)) && (!p.hideWhenFlag || !gameState.hasFlag(p.hideWhenFlag));
      p.image.setVisible(visible);
      if (p.collider) (p.collider.body as Phaser.Physics.Arcade.StaticBody).enable = visible;
    }
  }

  /** Purely visual: trees along forest edges, flowers and tufts on grass. Deterministic per map. */
  private decorate(grid: TileId[][]): void {
    const deco = this.map.decorate;
    if (!deco) return;
    const rnd = seededRandom(deco.seed);
    const solidAt = (x: number, y: number) => {
      const row = grid[y];
      return !row || row[x] === undefined || TILES[row[x]].solid;
    };
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const tile = grid[y][x];
        const cx = (x + 0.5) * TILE_SIZE;
        const r = rnd();
        if (tile === 'forest' && deco.trees) {
          // Canopies reach ~2 tiles up and ~1 sideways: only plant where that area is forest, so trees never hide walkable ground.
          const canopyFree = [-1, 0, 1].every((dx) => solidAt(x + dx, y - 1) && solidAt(x + dx, y - 2));
          const edge = !solidAt(x, y + 1) || !solidAt(x - 1, y) || !solidAt(x + 1, y);
          if (canopyFree && ((edge && r < 0.6) || r < 0.05)) {
            const by = (y + 1) * TILE_SIZE + rnd() * 8;
            this.add
              .image(cx + (rnd() - 0.5) * 14, by, rnd() < 0.5 ? 'tree' : 'tree-dark')
              .setOrigin(0.5, 1)
              .setScale(0.8 + rnd() * 0.35)
              .setFlipX(rnd() < 0.5)
              .setDepth(by);
          }
        } else if (deco.flowers && (tile === 'grass' || tile === 'wildGrass') && r < 0.09) {
          this.add
            .image(cx + (rnd() - 0.5) * 20, (y + 0.5) * TILE_SIZE + (rnd() - 0.5) * 20, `flower-${Math.floor(rnd() * 4)}`)
            .setDepth(-4);
        } else if (deco.flowers && (tile === 'wildGrass' || tile === 'overgrownPath') && r < 0.22) {
          this.add.image(cx + (rnd() - 0.5) * 20, (y + 0.5) * TILE_SIZE, 'grass-tuft').setDepth(-4);
        } else if (deco.flowers && tile === 'grass' && r > 0.985) {
          const by = (y + 0.9) * TILE_SIZE;
          this.add.image(cx, by, 'bush').setOrigin(0.5, 1).setDepth(by);
        }
      }
    }
  }
}
