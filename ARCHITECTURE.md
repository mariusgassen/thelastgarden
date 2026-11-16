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
- `npcs.ts`: `NpcDef`. NPC behavior lives in `systems/npcs.ts`: placements with `wander` (tiles) stroll around their home spot by day, walk home at dusk and rest there; `nocturnal` ones (the owl) do the reverse. They never step on beds, solid props, obstacles, built pieces or doorways, pause when the player is near, stay still with reduced motion, and the builder refuses the tile an NPC stands on.

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
- **Inventory:** I opens the bag, C the pocket workbench (once owned), Q or Tab the quest log, M the town map, R mounts or dismounts the horse and B toggles build mode (each once unlocked).
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

**Obstacle ↔ plant mapping.** `lavender` clears `tallGrass` and `moon-fern` clears `denseFog`
through `PlantDef.clears`. `bramble` is opened per obstacle with a crafted cutting instead;
see "Workbench and recipes".
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

## Harvest and seed loop

Growing a plant is no longer only a key. A mature plant keeps giving, all in
`systems/plants.ts` (logic) and `PlantLayer` (prompt, marker, picker):

- **Produce.** `PlantDef.produceItemId` names an `ItemDef` with `category: 'produce'`
  (bramble → `produce-tendril`, lily → `produce-light-pollen`, lavender →
  `produce-scent-bundle`, night violet → `produce-nectar`, hollyhock → `produce-seed-pod`;
  the moon fern has none). `isProduceReady(bedId)` is true once the bed is mature and
  `HARVEST_REGROW_MS` (60 s) have passed since the last harvest. `harvestBed(bedId)` adds one
  produce item, keeps the plant, sets `harvested-once` and emits `plant-harvested`.
- **Seeds.** The 1st, 4th, 7th … harvest of a bed (`SEED_DROP_EVERY`) also yields one seed of
  its species, so seeds are renewable and open beds can always be filled. The one-time seed
  pickups on the maps stay as the starting supply.
- **Dew.** `waterBed(bedId)` spends one `resource-dew` to skip `DEW_BOOST_MS` (one stage) of a
  growing bed, at most once per stage. It is optional: every plant matures without it.
- **Seed picker.** `getPlantableSpecies(bedId)` lists what an open bed could take. With more
  than one, `PlantLayer` shows an ad-hoc dialogue `seed-picker:<bedId>` whose choices carry
  `DialogueChoice.id`; the UI emits `dialogue-choice { dialogueId, choiceId }` for any choice
  with an id, and `PlantLayer` calls `plantSeed(bedId, plantId)`.
- **Bed prompt.** `Pflanzen` → `Gießen` (growing, dew in the pocket, stage not yet watered) or
  `Wächst…` → `Ernten` (produce ready) or `Ansehen`.
- **HUD.** `ResourceBar` has a fifth counter: the sum of all `produce` items.
- **Save.** Only optional fields on `ext.plants.beds[bedId]`: `harvestedAt`, `harvests`,
  `wateredStage`. Old saves need no migration; their mature beds are simply ready to harvest.
- **Debug.** `__tlg.harvestBed(bedId)`, `__tlg.waterBed(bedId)`; `debugRewindGrowth(ms)` also
  fast-forwards regrowth.

## Workbench and recipes

Produce is spent at a workbench. Recipes are content, crafting is a Phaser-free system:

- **Recipes.** `content/recipes.ts` → `content.recipes`, each a `RecipeDef { id, name, result[],
  cost[], requiresFlag? }`. Every recipe is unlocked by reading a journal page
  (`journal-read:<pageId>`); the page's text states the recipe, and a toast announces it.

  | Recipe | Cost | Unlocked by | Used for |
  |---|---|---|---|
  | Brombeer-Steckling | 2 Brombeertrieb, 1 Tau | `page-bramble` | opens one `bramble` obstacle |
  | Lilienlaterne | 2 Lichtpollen, 1 Sonnenlicht | `page-lily` | one vole night |
  | Lavendelsäckchen | 2 Duftbündel, 1 Sonnenlicht | `page-lavender` | one snail night |
  | Ventildichtung | 1 Brombeertrieb, 1 Duftbündel | `page-tower` | `tower-cistern` repair |
  | Dichtzopf | 2 Duftbündel, 1 Tau | `page-heart` | `orchard-sluice` repair |
  | Achsenwachs | 2 Nektar, 1 Sonnenlicht | `page-orchard` | `mill-wheel` repair |
  | Saattütchen | 2 Samenkapsel, 1 Tau | `page-mill` | 1 seed each: bramble, lily, lavender |

- **System.** `systems/crafting.ts`: `getUnlockedRecipes()`, `getMissing(recipe)`,
  `craft(recipeId)` (emits `item-crafted`), `craftWithToast(recipeId)`. Interacting with a
  workbench emits `crafting-open`, which opens `ui/CraftingPanel.ts` — a visual recipe icon
  grid with craftable checkmarks, ingredient icon/count chips, and a "Herstellen" bar (1–9,
  arrows + E, or tap).
- **Stations.** New `InteractableSpec` type `craft` (`emptyDialogueId` while nothing is
  unlocked, optional `variants` that run first). Placed as `workbench` (workshop),
  `cottage-herb-rack` (M.'s cottage) and `mill-workbench` (mill interior), so each episode has
  one within a map or two.
- **Brambles.** `bramble-vine` no longer has `clears`. A handler in `systems/plants.ts` spends
  one `craft-bramble-cutting` on the inspected bramble and unblocks only that one. Without a
  cutting the obstacle shows its hint.
- **Nights.** `nightEvents.ts` spends a carried `craft-lavender-sachet` (snails) or
  `craft-lily-lantern` (voles) when beds would be harmed that no plant protects
  (`protectedBy: 'sachet' | 'lantern'`).
- **Repairs.** The three `repair` specs now cost one crafted part plus fewer raw resources.
  The crow (orchard) and M. hand over the produce for the first Episode 3 crafts, so nobody
  has to walk back to the garden.
- **Save.** Nothing new: crafted things are ordinary inventory items.

## Inventory, pocket workbench and crafting tutorials

- **Inventory ("Beutel").** `systems/inventory.ts` `getInventoryGroups()` groups carried items
  by category (no Phaser); `ui/InventoryPanel.ts` renders them as a scrollable icon grid with
  count badges and a bottom detail bar for the selected item (icons generated in
  `world/textures.ts`). It opens by tapping the resource bar (`ResourceBar.contains`) or with
  **I**, and closes with × / Esc / a tap outside. `UIScene.syncModal()` keeps
  `inputState.modal` true while any modal panel (dialogue, quest log, inventory, crafting,
  or map) is open.
- **Pocket workbench.** The item `pocket-workbench` ("Werkzeugrolle") is the reward of
  `q-craft-cutting`. While `hasPocketWorkbench()` is true, the inventory shows a "Werkeln"
  button and **C** opens the same `CraftingPanel` as a workbench, on any map. Fixed
  workbenches stay; they are how the first cutting is made.
- **Tutorial quests.** `q-craft-cutting`, `q-craft-lantern` and `q-craft-sachet` start with
  `quest-completed:q-journal-pages` (before `q-greenhouse` in the list, so the tracker keeps
  the main journey); `q-craft-seed-mix` starts with `journal-read:page-mill`. Each has a
  harvest step and a craft step whose text names the ingredients. They use two sticky flags:
  `harvested:<produceItemId>` (set by `harvestBed`) and `crafted:<recipeId>` (set by `craft`).
  The repair and bramble objectives of the main quests name their ingredients too.
- **Hints.** `TutorialHints` explains the bag on the first harvest and the pocket workbench
  when it is received.

## Horse and town map

- **Mohn, the horse.** NPC `mohn` grazes on the tramline clearing. `q-horse` (starts with
  `episode-1-complete`): meet her (`horse-met`), read `page-mohn` (teaches the recipe
  `horse-treat`), craft it, hand it over (`horse-tamed`). The hand-over uses two new optional
  `NpcDialogueRule` fields, `requiresItems` and `takeItems`.
- **Riding.** `systems/horse.ts` (no Phaser): `hasHorse()`, `isRiding()`, `isRidingHere()`,
  `toggleRiding()`; emits `riding-changed`. `PlayerController.setRiding` swaps the texture to
  `player-riding` and the speed from 140 to 245 px/s; the collision circle stays the same, so
  no path gets narrower. Maps with `MapDef.indoor` cannot be ridden on: the choice is kept and
  resumes outside. Toggle with **R** or the horseshoe button.
- **Town map.** `world/travel.ts` lists one `TravelStopDef` per outdoor map (map, entry spawn,
  position on the sheet). `systems/travel.ts`: `hasTravelMap()` (flag `greenhouse-hint-read`,
  the map board in the vestibule), `getTravelStops()`, `travelTo(mapId)` → emits `fast-travel`,
  which `WorldScene` turns into `changeMap`. A stop is known once any zone of its map was
  visited, and its spawn is the one the player first arrives by, so travel never skips an
  obstacle. `ui/MapPanel.ts` is the modal sheet (**M** or the map button; arrows + E, or tap).
- **HUD.** `ui/HudButton.ts`: two small round buttons above the context button, shown once
  unlocked and hidden while a modal is open.
- **Save.** Only `ext.horse = { riding }`. Everything else derives from flags and visited
  zones that older saves already have, so they get the map at once and `q-horse` on load.
- **New outdoor map?** Add a `TravelStopDef` (a unit test checks every outdoor map has one);
  mark interiors `indoor: true`.

## Gathering, free building and the blight

A survival edge on top of the garden: gather raw material, build freely on the tile grid, and
push back a grey wilt that creeps in at night. No money, no chores, no fail state.

- **Raw materials.** `mat-wood`, `mat-stone`, `mat-scrap` (`category: 'material'`). They come
  from piles: ordinary `ResourceNodeDef`s with two new optional fields, `texture` (`node-wood`,
  `node-stone`, `node-scrap` instead of the glowing orb) and `count` (wood gives 2). They regrow
  after 60 s. The first material sets `gathered-material`, which unlocks build mode.
- **Roaming pickups.** Every node with `respawnMs` (light, dew, piles) is drawn to a new spot
  each time it is collected: open grass within `ROAM_TILES` (8) of its home in the map data,
  reachable from home, off beds, props, doors, NPCs, spawns, built pieces, blight, other pickups
  and at least 3 tiles from where it was. The first appearance is always the map spot. Seeded
  by `ext.resources.seed` (drawn once per save; `setSpawnSeed` pins it in tests), with
  `rolls` and `spots` beside it. One-time finds and seeds never move. Nothing can be built on a
  pickup's current tile.
- **Pieces.** `content/buildables.ts` → `content.buildables`, each a `BuildableDef { cost, on,
  solid?, wardRadius?, lightRadius?, planter?, rest? }`:

  | Piece | Cost | Does |
  |---|---|---|
  | Zaun | 1 Holz | wall; the blight never grows through a piece |
  | Hecke | 1 Holz, 1 Brombeertrieb | wall, wards 1.5 tiles |
  | Laterne | 1 Schrott, 1 Lichtpollen | wards 2.5 tiles, lights the night veil |
  | Pflanzkübel | 2 Holz, 1 Feldstein | a planting bed; a mature plant in it wards like any bed |
  | Steg | 2 Holz | on water next to the bank or another plank; makes it walkable |
  | Unterstand | 4 Holz, 2 Feldstein, 1 Schrott | wards 3.5 tiles; *Rasten* skips to 07:00 |
  | Dornenhecke | 2 Dornenranke | wall, wards 2.5 tiles (see "Guarding, building and food plants") |
  | Flechtzaun | 2 Weidenrute | wall, wards 1 tile |
  | Schilfsteg | 2 Schilfbündel | like the Steg |

- **System.** `systems/building.ts` (no Phaser): `whyNotPlace` / `placePiece` / `removePiece`
  (full refund; a planter also returns its seed), `isTileWalkable`, `getPieces`, and the
  runtime-only build mode (`getBuildMode`, `setBuildMode`, `selectBuildPiece`, emits
  `build-mode-changed`). Placement refuses solid tiles, indoor maps, blocked obstacles, the tiles
  of beds and solid props, a ~1 tile circle around every interactable, NPC, pickup, page and
  spawn (so nothing important can be walled off), the player's own tile for solid pieces, and
  anything beyond 3.5 tiles. Other systems can veto tiles with `addPlacementBlocker`.
  Planters reach `allPlantingBeds()` through `setDynamicBedProvider` in `world/index.ts`, so
  plants, wards and nights treat them like any bed (id `planter:<mapId>:<x>:<y>`).
- **Rendering.** `systems/buildLayer.ts` (`BuildLayer`): sprites `build-<id>`, colliders,
  bridges switch the ground tile's collision off, a cursor (ghost + green/red/orange outline) on
  desktop, and a shelter's *Rasten* interactable. While build mode is on, E and taps place or
  remove instead of interacting.
- **HUD.** Hammer `HudButton` (**B**) above the horse and map buttons, outdoors once unlocked.
  `ui/BuildBar.ts` is the piece picker at the bottom (tap a slot or 1–9; Esc/B closes).
- **The blight.** `systems/blight.ts` (logic) and `systems/blightLayer.ts` (patches, spores,
  hearts). It wakes with `episode-1-complete`. `MapDef.blightHearts` (`{ id, at, reach }`, whole
  tiles; garden ×3, tramline, orchard, old mill) each take `GROWTH_PER_NIGHT` (6) tiles per
  in-game night, nearest first, never further than `reach` steps, never onto a built piece or a
  warded tile (pieces with `wardRadius`, and every mature bed, ~3–4 tiles). `refreshBlight`
  drops warded tiles and everything cut off from its heart, so a lantern at the edge pushes it
  back and a ward on the heart (`isHeartSealed`) dries it all up for as long as it stands. It
  runs on `build-changed` and every second for the current map (plants mature on their own
  clock). On blight the player walks at 60 %, nothing can be built, and renewable pickups stay
  away (one-time finds never do). Every night on every map grows once (`startBlightScheduler`
  watches the day clock; a shelter's rest counts as the night).
- **Quest.** Optional `q-blight` (starts with `episode-1-complete`): gather, build, inspect a
  heart (`blight-seen`), seal one (`blight-heart-sealed`). Reward 4 Holz, 2 Schrott.
- **Save.** Only `ext.building = { pieces: { [mapId]: { id, x, y }[] } }` and
  `ext.blight = { tiles: { [mapId]: "x,y"[] } }`. Old saves start empty; past Episode 1 the
  blight simply begins with the next night.
- **Debug.** `__tlg.placePiece(mapId, id, x, y)`, `removePiece`, `getPieces`, `setBuildMode`,
  `blightNightfall()`, `refreshBlight(mapId)`, `getBlightTiles(mapId)`.
- **New outdoor map?** Optionally add `blightHearts`; a unit test checks hearts sit on open
  ground, away from spawns and beds.

## Tools and gadgets

Four craftable tools make the garden work easier. None is used up, nothing is sold.

- **Tools.** `content/tools.ts` → `content.tools` (`ToolDef { id, kind, hint, reachTiles?,
  lightRadius?, pushBackTiles? }`, `id` = the item id). Each is an ordinary non-stackable
  `category: 'tool'` item with a workbench recipe, unlocked by playing instead of by a journal page:

  | Tool | Cost | Unlocked by | Does |
  |---|---|---|---|
  | Sichel | 2 Holz, 1 Schrott | `harvested-once` | harvests every ripe bed within 3.2 tiles at once |
  | Spaten | 2 Holz, 1 Feldstein | `gathered-material` | digs a plant out with its growth and sets it into a free bed it accepts |
  | Saatbeutel | 1 Brombeertrieb, 1 Duftbündel, 1 Schrott | `harvested-once` | sows the picked species into every free bed within 4 tiles |
  | Stablaterne | 1 Holz, 1 Schrott, 2 Lichtpollen | `built:lantern` | carried light: opens the night veil, dries up blight within 2.4 tiles |

  A tool already carried drops out of `getUnlockedRecipes()` (and `craft` refuses it), so nobody
  makes two. The first tool made goes into the hand.
- **System.** `systems/tools.ts` (no Phaser): `getOwnedTools`, `getEquippedTool`, `equipTool`,
  `getToolMode` / `setToolMode` / `isToolActing`, `useTool(mapId, at)` → `{ ok, text, spots }`,
  `getSowSeed` / `cycleSeed`, `getCarriedPlant`, `getCarriedLight`, `describeTool`. Emits
  `tool-changed`. Plant moving is two small functions in `systems/plants.ts`: `uprootBed`
  (emits `plant-removed`, which `PlantLayer` turns into the sprite going away) and
  `transplantInto`; `bedAccepts` is the species rule of a bed. The blight side is
  `pushBackBlight(mapId, px, py, radiusTiles)` in `systems/blight.ts`: it only clears what is
  there, it is not a ward, so it never seals a heart and the blight may creep back at night.
- **Tool mode.** The tool button (**T**) opens `ui/ToolBar.ts` (tap a slot or 1–4; tools not made
  yet stay dim; picking the satchel again switches the seed). While it is open with a sickle,
  spade or satchel in hand, E and any tap use the tool around the player instead of
  interacting, like build mode, and the two modes close each other. The lantern needs no mode:
  picking it closes the bar and it just shines.
- **World.** `systems/toolLayer.ts` (`ToolLayer`): the lantern on its pole beside the player, puffs
  where a tool worked, a sickle sweep, and the blight push-back every 250 ms. `AtmosphereLayer`
  takes a `carriedLight` callback and punches the player's light into the night veil (redrawn at
  most every 70 ms while the player moves). Reduced motion shortens the effects.
- **Save.** Only `ext.tools = { equipped?, seed?, carried? }`; `carried` is the plant in the
  shovel (`plantId`, `progressMs`, optional `sinceHarvestMs`, `harvests`), so it survives a
  reload. Old saves have no tools and need no migration. Flags: `moved-plant`,
  `used-tool:<kind>`.
- **Debug.** `__tlg.equipTool`, `setToolMode`, `useTool(mapId, { x, y })`, `getCarriedPlant`.

## Guarding, building and food plants

Six more species in `content/plants.ts`, each with one job. They use the ordinary seed loop
(plant, grow, harvest, every third harvest drops a seed) and accept any open bed or planter
(`ANY_BED_SPECIES_ORDER` in `systems/plants.ts`).

| Species | Produce | Job |
|---|---|---|
| Leuchtkappe `glowcap` | Leuchtkappe | `lightRadius` 140 opens the night veil; wards 5 tiles |
| Dornwurz `thornroot` | Dornenranke | wards 4.5 tiles; canes build the Dornenhecke |
| Schilf `reed` | Schilfbündel | builds the Schilfsteg |
| Korbweide `willow` | Weidenrute | builds the Flechtzaun |
| Honigbeere `honeyberry` | Honigbeere | food, cooked into Beerenmus |
| Goldrübe `gold-turnip` | Goldrübe | food, cooked into Rübeneintopf |

- **Wards.** `PlantDef.wardRadius` overrides the default 3 tiles a mature plant keeps free of
  blight (`getWards` in `systems/blight.ts`).
- **Seeds.** One-time `ResourceNodeDef`s: honeyberry and gold turnip in the garden, thornroot on
  the hill path, glowcap on the tramline, willow at the river farms, reed at the old mill.
- **Meals.** `ItemDef.meal = { effect, minutes }` on `category: 'meal'` items; `systems/meals.ts`
  (`eatMeal`, `getMealSpeedFactor`, `isBlightproof`) keeps `ext.meal = { effect, until }`.
  `swift` (Beerenmus, 3 min) walks 25 % faster; `blightproof` (Rübeneintopf, 4 min) ignores the
  blight's slowdown. The bag's *Essen* button eats the selected meal. No hunger, no fail state.
- **Cooking.** Workbench recipes without a journal page: `requiresFlag` is
  `harvested:<produce item>`, which the first harvest of the crop sets.
- **Save.** Only `ext.meal`; old saves have none and need no migration.

## Helper animals

Animals move into homes you build; nothing to feed, no chores, nothing lost if left alone. No
money, no selling.

- **Homes.** Four pieces in `content/buildables.ts` carry `BuildableDef.home = { animal }`:
  Bienenstock (3 Holz, 1 Lichtpollen), Hühnerstall (4 Holz, 1 Schrott), Ziegengehege (4 Holz,
  1 Feldstein, 1 Brombeertrieb) and Pferdestall (5 Holz, 2 Feldstein, 1 Schrott).
- **Logic.** `systems/animals.ts` (no Phaser):
  - *Bees:* beds within 6 tiles grow and regrow 50 % faster (`speedUpBeds` in `plants.ts`, ticks
    every 3 s, also off-screen), every second harvest from such a bed yields one extra, and the
    hive fills with `produce-honey` (1 per 120 s, max 3) while something is planted nearby.
  - *Hens:* a henhouse within 9 tiles keeps snails off a bed (`isCoveredByHens`, used by the snail
    night, outcome `protectedBy: 'hens'`, dialogue `night-snails-hens`) and lays `produce-egg`
    (1 per 75 s, max 4).
  - *Goat:* once per night (`onNightfall` in `blight.ts`, after the blight has grown) grazes the 6
    blighted tiles nearest the pen within 10 tiles (`clearBlightTiles`) and opens the nearest
    blocked bramble within 10 tiles.
  - *Stable:* after a night with a stable standing and Mohn befriended she is rested: riding is
    12 % faster until the next night. Honey given at the stable rests her at once (`feedHorse`).
- **Produce** is derived from a timestamp per home, so it keeps coming while the game is closed.
  Eggs and honey are plain `produce` items for the cooking recipes to use.
- **Rendering.** `systems/animalLayer.ts` (`AnimalLayer`): hens and goat wander ~1.6 tiles around
  their home on free ground (standing still with reduced motion), bees circle the hive, an item
  badge shows when produce waits, and each home has an interactable (*Eier nehmen*, *Honig nehmen*,
  *Streicheln*, *Mohn besuchen*).
- **Save.** Only `ext.animals = { stamps: { "<mapId>:<x>:<y>": epoch ms }, rested: boolean }`; old
  saves start empty.
- **Debug.** `__tlg.animals.{getHomes, readyProduce, collectProduce, isHorseRested, feedHorse}`;
  `__tlg.restUntilMorning()` runs a night including the goat and the stable.

## Working buildings

Four more build pieces that do something (`BuildableDef.machine`, `systems/machines.ts`, no
Phaser). No money and nothing spoils; every machine only makes something faster or turns
harvest into something else.

| Piece | Cost | Does |
|---|---|---|
| Regentonne | 3 Holz, 1 Schrott | beds within 2.5 tiles grow +50 % faster |
| Komposthaufen | 3 Holz | *Kompostieren* eats one produce item and works for 2 min (up to 3 stacked); beds within 3 tiles grow +100 % faster meanwhile |
| Trockengestell | 2 Holz, 1 Schrott | *Trocknen* hangs one produce item; after 90 s *Samen nehmen* gives 2 seeds of its species |
| Windmühle | 4 Holz, 3 Feldstein, 2 Schrott | *Mahlen* takes 2 produce items; after 60 s *Mehl holen* gives 1 `craft-flour` (Blütenmehl) |

- **State.** `ext.machines = { stations: { "<mapId>:<x>:<y>": { plantId?, inputs?, readyAt?, activeUntil? } } }`.
  Old saves start empty. Taking a piece down hands back what is inside (finished goods if done,
  otherwise the input).
- **Growth boost.** `tickMachines(from, to)` calls `shiftGrowth` on every growing bed in range,
  also on other maps; `startMachineTicker()` runs it every 5 s (one tick counts at most 10 s).
  A bed gets each kind of help once, so a row of barrels does not stack.
- **Rendering.** `BuildLayer.registerMachine` registers one interactable per rack, mill and
  heap whose label follows `machineAction(...).label`; the windmill's sails are a second sprite
  turning in a tween (not under reduced motion). The first time a machine is built, its
  description is toasted.
- **Build bar.** `ui/BuildBar.ts` wraps into rows of six; keys 1–9 pick the first nine slots.
- **Flour** is a plain `craft-flour` material for cooking recipes; nothing consumes it yet.
## Almanach (in-game wiki)

`systems/wiki.ts` (no Phaser) builds entries from the content registries, so new content shows
up without a hand-written page: every plant, item (except notes), recipe and build piece, plus
any other registry added to `content` (animals, machines, ... get a generic entry from `name`
and `description`; `quests`, `dialogues`, `npcs` are skipped). Hand-written how-it-works topics
live in `content/wiki.ts` (`WIKI_TOPICS`, optional `requiresFlag`), as do German section titles
and order (`WIKI_SECTION_TITLES`, `WIKI_SECTION_ORDER`). Items get "grows into / used for"
lines derived from plants, recipes and buildables.

- **People, places, story.** `persons:<npc>` from `content.npcs` (found on which maps comes from `MapDef.npcs`; known after talking to them, remembered in `ext.wiki`), `places:<map>` from `MAPS` (known once a zone is visited), `story:<quest>` from `content.quests` (known once started; shows objectives and status). Tools are items, so their entries get the tool's `hint`; meals show their effect.
- **Discovery.** Items when owned, plants when their seed or produce is known, recipes when
  unlocked, build pieces once build mode is unlocked, topics by flag (`requiresFlag` or `requiresAnyFlag`). Generic registries are
  always listed. To gate or customise, call `registerWikiSource(() => WikiEntry[])` at module load.
  Locked entries show as "???". Discovery is sticky.
- **Save.** `ext.wiki = { seen: string[] }`, no migration; the first scan after loading picks up
  what an old save already has.
- **UI.** `ui/WikiPanel.ts`, Menü button (top left, opens the menu list; Almanach is its first entry) and **H**. Esc steps back from an
  entry, then closes.

## The living village

After Episode 4, Erlenbrück wakes up in three quarters. Villagers move back and ask for things the
garden makes; handing them over restores the quarter. No selling, no money, nothing to do daily, no
fail state.

- **Content.** `content/village.ts` is the one place to edit: `VILLAGE_PARTS` (`VillagePartDef`) and
  `VILLAGERS` (`VillagerDef`: look, spot, `request`, `gift`, four lines). The NPCs, dialogues and one
  quest per quarter (`q-village-<part>`) are generated from it and added to the registries in
  `content/index.ts`; `content.villageParts` holds the quarters.

  | Quarter | Map | Villagers | They ask for | Restored |
  |---|---|---|---|---|
  | `plaza` Dorfplatz | `garden` | Hanne, Piet | Blütenmehl, Eier · Honig, Leuchtkappen | bakery, stall, 4 lamps; clears `fallen-tree-canal`; wards 6 tiles of the plaza |
  | `farms` Die drei Höfe | `river-farms` | Wilma, Bruno | Rübeneintopf, Beerenmus · Goldrüben, Honig | farm shop, washing line, crates |
  | `orchard` Obsthof | `orchard` | Ottilie, Konrad | Honig, Nektar · Honigbeeren, Blütenmehl | cider hut, crates; wards 6 tiles of the meadow |

- **Order.** The Episode 4 ending flag opens the first quarter, and each finished quarter opens the
  next in the ring plaza → farms → orchard → plaza. `VillagePartDef.openedBy` lists the ending flag and
  the quest that precedes it, so `QuestDef.startsWhen` does all the work:
  garden ending → plaza, farms, orchard; valley → farms, orchard, plaza; future → orchard, plaza, farms.
  M. announces the first one once (`m-village-hint-<ending>`), and celebrates when all three are done.
- **System.** `systems/village.ts` (no Phaser). `syncVillage()` derives the flags from the quest
  states, so there is nothing extra to save and old saves land in the right place:
  `village-open:<part>` (villagers appear), `village-restored:<part>` (buildings appear, unblocks,
  ward) and `village-all-restored`. `village-helped:<villager>` is set by the villager's NPC rule.
  A hand-over is an ordinary `NpcDialogueRule` with `requiresItems`, `takeItems`, `giveItems`.
  `getVillageStatus()` lists each quarter's state and progress.
- **World data.** Villagers are `MapDef.npcs` with `showWhenFlag: 'village-open:<part>'`; restored
  buildings are `MapDef.props` with `showWhenFlag: 'village-restored:<part>'`. A prop with
  `showWhenFlag` and `solid` now has no collision until it appears (`WorldScene.applyPropFlags`).
  Textures are generated in `world/textures.ts` (`generateVillageTextures`: villager sprites, portraits
  and the buildings).
- **Blight.** `registerWardSource(fn)` in `systems/blight.ts` lets other systems add fixed wards;
  the village adds its `VillagePartDef.ward` once restored.
- **Save.** Flags and quests only. No new save fields.
- **Debug.** `__tlg.village.getVillageStatus()` / `syncVillage()`. To skip ahead, set
  `chronicle-ending-garden` (or `-valley`, `-future`) and then `village-helped:<villager>` flags.
- **New villager or quarter?** Add a `VillagerDef` or `VillagePartDef`, place the NPC and its
  restored props on the map, and add the new quarter to the ring through `openedBy`. A unit test
  checks that everything stands on open ground and clear of pickups.

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
