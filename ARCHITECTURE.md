# The Last Garden — Architecture (Wave 1 hand-off)

Phaser 3.90 + TypeScript 5.9 + Vite 8, mobile-first PWA. No backend; progress lives in `localStorage`.

```
npm run dev        # http://localhost:5173
npm run build      # tsc --noEmit && vite build  -> dist/
npm run preview    # serve dist/ (service worker active only here)
npm run icons      # regenerate public/icons/* from scripts/generate-icons.mjs
```

## Layers and the rule between them

| Folder | Holds | Rule |
|---|---|---|
| `src/content/` | Plants, items, quests, dialogues, NPCs as typed data and registries | Plain data. Imports neither Phaser nor systems. |
| `src/world/` | Map definitions, tile registry, grid rasterizer, generated textures | Data plus pure helpers. `textures.ts` is the only file here that draws. |
| `src/systems/` | Game logic: event bus, save, state, input, interaction, obstacles, player, pwa | Reads content and world data; communicates through `bus`. |
| `src/ui/` | HUD widgets (joystick, context button, dialogue box, banner), viewport/safe-area helpers | Never mutates game state. Writes only to `inputState` and reads events. |
| `src/scenes/` | `BootScene` (textures and save load), `WorldScene` (any map), `UIScene` (HUD overlay) | Wiring only. |
| `public/` | `manifest.json`, `sw.js`, `icons/` | Copied verbatim into `dist/`. |

Scene stack: `Boot` → starts `World` and launches `UI` on top. A map change restarts `World` with `{ mapId, spawn }`. `UI` persists across map changes.

Rendering resolution: the canvas is CSS size × `DPR` (max 2), and every camera is zoomed by `DPR`. UI code works in CSS pixels (`src/ui/viewport.ts`). In world code, `pointer.x/y` are canvas pixels, so use `camera.getWorldPoint`.

## Central singletons

- `bus` (`systems/events.ts`): a typed event bus. All event names and payloads are listed in `GameEvents`. To add an event, add a key there; existing keys don't change.
  - Inside scenes, use `bus.onScene(scene, event, fn)`. It unsubscribes automatically on shutdown, which matters because `WorldScene` restarts on every map change.
- `gameState` (`systems/state.ts`): the runtime owner of the `SaveGame`.
  - Flags: `getFlag`, `setFlag`, `hasFlag`.
  - Zones: `markZoneVisited`, `hasVisitedZone`.
  - Inventory: `addItem`, `removeItem`, `getItemCount`.
  - Per-feature storage: `getExt`, `setExt`.
  - Persistence: `save()`, `reset()`.
  - Autosave runs every 15 s, on `visibilitychange: hidden`, on `pagehide`, on map change, and on unblock.
- `inputState` (`systems/input.ts`): the joystick vector, a queued interact request, and `modal`. `modal` is true while a dialogue is open; it freezes movement, and interact then advances the dialogue.
- `content` (`content/index.ts`): `content.plants | items | quests | dialogues | npcs`, each a `Registry` with `get(id)` (throws if unknown), `find`, `has`, `all`, and `add` (runtime additions; a duplicate id throws).

## World / maps (`src/world`)

A map is a `MapDef` (`world/types.ts`). Every coordinate in it is in **tiles** (32 px), and fractions are allowed.

- `layout`: ordered `rect | ellipse | path` operations painted over `baseTile`. The result becomes a Phaser tilemap. A tile is solid if its `TILES[id].solid` is true (`world/tiles.ts`).
- `zones`: named areas. Entering one emits `area-changed`, records it in `world.visitedZones`, and shows the name banner.
- `obstacles`: see the next section.
- `props`: sprites, optionally with a `solid` collision rect. Set `ground: true` for flat decals.
- `interactables`: data-driven `dialogue` and `door` specs.
- `spawns`: named entry points. `default` is required.
- Register new maps in `MAPS` in `world/index.ts`. The greenhouse interior for Wave 3 is a new `MapDef` plus a `target` on the existing `greenhouse-door`.

The `garden` map, as a diagram:

```
greenhouse clearing (locked door) ── [bramble] ── hidden yard (well)
          │ path
hut yard (door → `workshop` map) ── main garden (spawn) ── pond ─ canal
   │ [tall grass]                    │ overgrown path       │ [fallen tree]
   └──────────────────── bus stop plaza + road ─────────────┘
```

All five required places are reachable from the start. The three obstacles block **extra** routes: a hidden corner and two shortcut loops.

| Obstacle id | `blockedBy` | Blocks |
|---|---|---|
| `bramble-greenhouse-yard` | `bramble` | Greenhouse clearing → hidden yard behind the greenhouse |
| `fallen-tree-canal` | `fallenTree` | Pond → canal bank path → bus stop |
| `tallgrass-hut-trail` | `tallGrass` | Hut yard → trail → bus stop |

## Obstacle / path-unblock API (`src/systems/obstacles.ts`) — for Wave 2

```ts
import {
  unblockPath, isBlocked, getObstacles, getObstaclesBlockedBy, addObstacleInteractHandler,
} from '../systems/obstacles';

unblockPath('bramble-greenhouse-yard'); // true if it was removed now
isBlocked('fallen-tree-canal');         // boolean
getObstacles('garden');                 // ObstacleDef & { mapId }[]
getObstaclesBlockedBy('bramble');       // obstacles of that kind that are still blocked
```

`unblockPath(id)` does the following:

1. Rejects the call (returns false and logs a warning) if the id is unknown, `removable: false`, or the obstacle is already cleared.
2. Stores the id in `SaveGame.world.unblockedPaths`.
3. Emits `path-unblocked { obstacleId, mapId }`.
4. Saves immediately.

If the obstacle is on the current map, `ObstacleLayer` removes its collider and its prompt, then fades out the sprite. On load, cleared obstacles are never spawned. You can call `unblockPath` from anywhere, even when the obstacle is on another map.

**Hooking plant abilities into obstacles.** Walking up to a blocked obstacle shows an *Untersuchen* prompt; its interactable id is `obstacle:<id>`. By default the prompt shows `def.hint`. To replace that behavior:

```ts
const remove = addObstacleInteractHandler((obstacle, ctx) => {
  const plant = /* the player's mature plant whose PlantDef.clears includes obstacle.blockedBy */;
  if (!plant) return false;          // not handled → next handler / hint
  unblockPath(obstacle.id);
  ctx.world.toast(`${plant.name} öffnet den Weg.`);
  return true;
});
```

Each `PlantDef` already carries `clears: ObstacleKind[]` and `abilityId` (`content/plants.ts`). Wave 1 implements no ability logic. To add a new obstacle kind:

1. Extend `ObstacleKind` in `content/types.ts`.
2. Add an `obstacle-<kind>` texture in `world/textures.ts`.
3. Place the obstacle in a map's `obstacles` list.

## Interaction API (`src/systems/interaction.ts`)

```ts
interface Interactable {
  id: string;            // unique per map
  label: string;         // context-button text, e.g. "Gießen"
  radius: number;        // px from the player's feet
  getPosition(): { x: number; y: number };  // px, called every frame (may move)
  canInteract?(ctx): boolean;
  onInteract(ctx: InteractionContext): void;  // ctx.world: changeMap/showDialogue/showLines/toast
  markerOffset?: number;
}

const off = worldScene.interaction.register(myInteractable); // returns unregister
```

To get the scene: `game.scene.getScene('World') as WorldScene`, or receive it in your own system's constructor. Registrations are cleared when the map changes, so register again on `map-changed`.

- Each frame, the system focuses the nearest in-range item. It emits `interaction-focus` (which shows the context button) and draws a bouncing marker over that item.
- An item is triggered by the context button, by **E / Space / Enter**, or by **tapping** it while the player is in range. Every trigger emits `interacted { id }`.
- **Data-driven specs** (`MapDef.interactables`):
  - `dialogue` shows `content.dialogues[dialogueId]`.
  - `door` moves to `target.mapId`/`spawn`. If the door is `locked`, it opens only once `gameState.hasFlag(unlockFlag)` is true; otherwise it shows `lockedDialogueId`. The greenhouse door uses `locked: true, unlockFlag: 'greenhouse-unlocked'` and has no `target` yet.
  - To change how a built-in spec type behaves: `setSpecHandler('door', fn)`.
  - To add a new spec type: add a variant to `InteractableSpec` and add an entry to `specHandlers`.

## Content (`src/content`)

To add an entry, append it to the array in the matching file. The interfaces live in `content/types.ts`.

- `plants.ts`: `PlantDef`. `seedItemId`, `growthStages`, `clears`, `abilityId`, `color`.
- `items.ts`: `ItemDef`. The categories are `seed | tool | key | material | note`.
- `quests.ts`: `QuestDef`. Objectives are a union of `flag | item | unblock | visitZone`. Wave 1 has no quest runtime yet; progress goes in `SaveGame.quests`.
- `dialogues.ts`: `DialogueDef`, a list of lines `{ speaker?, text }`. The UI shows them in order. Choices and branching are Wave 3 work: extend `DialogueLine` and `DialogueBox`.
- `npcs.ts`: `NpcDef`. Contains only the crow stub; there is no NPC behavior yet.

All player-facing text is German.

## Save system (`src/systems/save.ts`)

```ts
interface SaveGame {
  version: number; savedAt: number;
  player:   { mapId; x; y; facing };                               // px, feet position
  world:    { unblockedPaths: string[]; visitedZones: string[]; flags: Record<string, FlagValue> };
  inventory:{ items: Record<string, number> };
  quests:   { active: string[]; completed: string[]; progress: Record<string, unknown> };
  ext:      Record<string, unknown>;                               // per-feature namespaces
}
```

- Storage key: `the-last-garden:save`.
- **To add a field:** add it to the interface **and** to `createDefaultSave()`. On load, the save is deep-merged onto the defaults, so older saves pick up the new field. Keys the defaults don't know are kept.
- **To rename or transform existing data:** bump `SAVE_VERSION` and add `MIGRATIONS[oldVersion]`.
- **Small per-feature state:** `gameState.setExt('plants', {...})` and `gameState.getExt('plants', fallback)`.
- Change progress only through `gameState` methods, so the matching events fire.

## Input

- **Desktop:** WASD or the arrow keys to move. E, Space or Enter to interact or advance dialogue.
- **Touch:** a floating joystick that appears wherever the finger goes down. The context button sits bottom-right and is only visible while something is in range. A short tap on an object that is in range interacts with it. Up to 3 pointers are tracked, so you can move and press the button at the same time.
- **Safe areas:** `env(safe-area-inset-*)` is read through `#safe-area-probe` in `index.html`. The HUD re-runs its layout on resize.

## PWA (skeleton; Wave 4 completes it)

- `public/manifest.json`: standalone, portrait, PNG icons at 192 and 512 px plus a maskable 512 and an SVG.
- `public/sw.js`: precaches the app shell. Navigations are network-first; other same-origin GETs are cache-first and filled at runtime.
- Registration lives in `src/systems/pwa.ts` and runs **only in production builds**. Test it with `npm run build && npm run preview`.
- When the shell list or the cache strategy changes, bump `CACHE` in `sw.js`.

## Plant Abilities (Wave 2 hand-off)

Resources, inventory, planting and the 3 plant abilities. New systems: `systems/plants.ts`
(logic, no Phaser), `systems/plantLayer.ts` (`PlantLayer`, scene-bound rendering), and
`systems/resources.ts` (logic + `ResourceLayer`, scene-bound rendering) — the same
logic/rendering split as `obstacles.ts`/`ObstacleLayer`.

**Resources & inventory.** No new save fields were needed. "Sonnenlicht" / "Tau" /
"Fundstück" are ordinary `ItemDef`s with the new `category: 'resource'`
(`resource-sunlight`, `resource-dew`, `resource-curio`), and "Samen" is the existing 3
`category: 'seed'` items. Both go through Wave 1's `gameState.addItem` /
`getItemCount` / `removeItem` and live in `SaveGame.inventory.items`, unchanged. The HUD
(`ui/ResourceBar.ts`, top-left) shows 4 counters: the 3 resource items plus the **sum**
of all seed items as one "Samen" number. It refreshes on `inventory-changed`.

**World data.** Two new optional `MapDef` fields (`world/types.ts`), both additive:

```ts
plantingBeds?: PlantingBedDef[];  // { id, rect, plantId? }  — rect is tiles, plantId omitted = "any species"
resourceNodes?: ResourceNodeDef[]; // { id, itemId, at, label, respawnMs? } — no respawnMs = one-time pickup
```

Looked up the same way as obstacles: `allPlantingBeds()` / `findPlantingBed(id)` and
`allResourceNodes()` / `findResourceNode(id)` in `world/index.ts`; `systems/resources.ts`
wraps the latter as `getResourceNodes(mapId?)`, mirroring `obstacles.ts`'s `getObstacles`.

**Garden map beds.** Reused the 4 existing `soil` rects as beds: `bed-bramble` (only
accepts `bramble-vine`), `bed-lily` (`glow-lily`), `bed-lavender` (`lavender`), and
`bed-extra` (`plantId` omitted — accepts the first species, in the fixed order
bramble-vine → glow-lily → lavender, that the player owns a seed for; there's no seed-picker
UI in this wave). `bed-bramble`/`bed-lily`/`bed-lavender` are the "3 verwilderte Beete" for
Wave 3's Quest 3.

**Obstacle ↔ plant mapping.** `bramble-vine` clears `bramble` and `lavender` clears
`tallGrass` — both already set in `content/plants.ts` from Wave 1 and left unchanged.
**`fallenTree` (`fallen-tree-canal`) has no plant that clears it.** No `PlantDef.clears`
targets it; moving a fallen tree needs something a plant can't do alone. Leave it to a
future wave (a tool, or the Wave 3 crow). This still meets "at least 2 paths unlocked by
the right plant."

**Growth.** Uniform `STAGE_DURATION_MS` (15 s) per stage; `currentStage(bed)` computes
`min(growthStages, floor((now - plantedAt) / STAGE_DURATION_MS))` from `ext.plants`'s
stored `plantedAt`, so maturity is always correct after a reload or a map change — no
stage number is persisted. State shape:

```ts
ext.plants = { beds: { [bedId]: { bedId, plantId, plantedAt } } }
ext.resources = { collected: string[]; lastCollectedAt: Record<string, number> } // one-time vs. respawnable nodes
```

`startGrowthTicker()` (called once from `BootScene`) polls every 2 s and, for each bed
that just became mature, sets two flags and emits `plant-matured`:

- `bed-restored:<bedId>` — "restored" means **mature**, not just planted.
- `ability:<abilityId>` — set once any bed with that `PlantDef.abilityId` is mature.

**Wave 3 query API** (`systems/plants.ts`): `isBedPlanted(bedId)`, `isBedMature(bedId)`,
`getBedState(bedId)`, `hasAbility(abilityId)`, `getAllPlantedBeds()`. Quest 3 ("3 beete
wiederherstellen") needs no new `QuestObjective` variant — use 3
`{ type: 'flag', flag: 'bed-restored:bed-bramble' }`-style objectives (ditto `bed-lily`,
`bed-lavender`); the quest runtime already listens for `flag-changed` per Wave 1's plan.

**Obstacle hook.** `systems/plants.ts` registers one `addObstacleInteractHandler` at
**module load** (imported once from `BootScene`, so it's never duplicated across map
changes): on inspecting a blocked obstacle it calls `getMatureClearingKind(obstacle.blockedBy)`,
and if any mature bed's `PlantDef.clears` matches, calls `unblockPath(obstacle.id)` and
shows a flavor toast. Maturity is recomputed at interact time, not cached, so it's correct
even if the player planted on a different map visit.

**Wave 4 atmosphere hooks.** `PlantDef.lightRadius?: number` (set to 150 on `glow-lily`)
plus `getLightSources(): { bedId, mapId, lightRadius }[]` in `systems/plants.ts` — a
real day/night layer can dim the world and use these as light cutouts. `PlantLayer`
already renders a placeholder additive glow + firefly particles around a mature
`lightRadius` plant; `plant-matured` fires for any ambient effect Wave 4 wants to add.

**Adding a new plant.** Add a `PlantDef` (`content/plants.ts`) and its seed `ItemDef`
(`content/items.ts`); add 3 textures `plant-<id>-sprout` / `-growing` / `-mature` in
`world/textures.ts`; add a `PlantingBedDef` entry to a map; if it should clear an
obstacle, set `clears`; if it needs a custom on-mature visual beyond a texture swap, add
a branch to `PlantLayer.updateAmbient`.

**Debugging.** `window.__tlg` (dev only) gained: `plantSeed(bedId)`, `getBedState(bedId)`,
`isBedMature(bedId)`, `hasAbility(abilityId)`, `getAllPlantedBeds()`,
`debugRewindGrowth(ms)` (rewinds every planted bed's clock so growth/maturity advances
immediately — stage durations are 15 s, so a few seconds of rewind per stage is enough),
`getResourceNodes(mapId?)`, `collectNode(id)`, `give(itemId, n)`, and
`teleport(tileX, tileY)`.

```js
__tlg.give('seed-bramble-vine', 2);
__tlg.plantSeed('bed-bramble');
__tlg.debugRewindGrowth(60_000);     // fast-forward growth
__tlg.teleport(35, 16);              // walk up to the bramble obstacle, then press E
```

## Wave boundaries

- **Wave 2 (plant abilities):** done — see "Plant Abilities" above.
- **Wave 3 (quests/story):**
  - Quest runtime listens on `bus` for `area-changed`, `path-unblocked`, `inventory-changed` and `flag-changed`.
  - Use the `bed-restored:<bedId>` flags for Quest 3; see "Plant Abilities" above.
  - Branching dialogue.
  - Crow NPC as an interactable.
  - Greenhouse interior map; set the `greenhouse-unlocked` flag and add a `target` to the door.
- **Wave 4 (atmosphere / PWA):**
  - `systems/atmosphere.ts` supplies a four-minute visual day/night cycle, wind-borne sparkle motes and a dimming veil. It is scene-bound and has no save data.
  - Mature glow lilies are queried through `getLightSources()` and erase circular light cutouts from the night veil; their additive halo/fireflies remain in `PlantLayer`.
  - Full offline support and an update flow in `sw.js`.
