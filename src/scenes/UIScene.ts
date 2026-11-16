import Phaser from 'phaser';
import { content, type DialogueChoice } from '../content';
import { getBuildMode, isBuildUnlocked, selectBuildPiece, setBuildMode } from '../systems/building';
import { craftWithToast, getUnlockedRecipes, hasPocketWorkbench } from '../systems/crafting';
import { bus } from '../systems/events';
import { canRideHere, hasHorse, isRiding, toggleRiding } from '../systems/horse';
import { inputState } from '../systems/input';
import { eatMeal } from '../systems/meals';
import { gameState } from '../systems/state';
import { hasTravelMap, travelTo } from '../systems/travel';
import { AUTO_TOOL, cycleSeed, equipTool, getEquippedTool, getOwnedTools, getToolMode, isAutoTool, setToolMode } from '../systems/tools';
import type { ToolDef } from '../content/types';
import { Banner } from '../ui/Banner';
import { BuildBar } from '../ui/BuildBar';
import { ContextButton } from '../ui/ContextButton';
import { CraftingPanel } from '../ui/CraftingPanel';
import { DayClock } from '../ui/DayClock';
import { DialoguePanel } from '../ui/DialoguePanel';
import { drawAutoIcon, drawHammerIcon, drawHorseIcon, drawMapIcon, drawToolIcon, HudButton } from '../ui/HudButton';
import { InventoryPanel } from '../ui/InventoryPanel';
import { Joystick } from '../ui/Joystick';
import { MapPanel } from '../ui/MapPanel';
import { MenuPanel } from '../ui/MenuPanel';
import { QuestLog } from '../ui/QuestLog';
import { ResourceBar } from '../ui/ResourceBar';
import { ToolBar } from '../ui/ToolBar';
import { WikiPanel } from '../ui/WikiPanel';
import { TutorialHints } from '../ui/TutorialHints';
import { DPR, isTouchDevice, readSafeArea, type SafeArea } from '../ui/viewport';
import { SCENES } from './keys';

const TAP_MAX_MS = 280;
const TAP_MAX_MOVE = 12;
const TOAST_MS = 1900;
const TOP_ROW_OFFSET = 40;

/**
 * HUD overlay above WorldScene. Works in CSS pixels (camera zoom = DPR).
 * Talks to the world only through inputState and the event bus.
 */
export class UIScene extends Phaser.Scene {
  private joystick!: Joystick;
  private button!: ContextButton;
  private dialogue!: DialoguePanel;
  private areaBanner!: Banner;
  private toast!: Banner;
  private resourceBar!: ResourceBar;
  private questLog!: QuestLog;
  private inventory!: InventoryPanel;
  private crafting!: CraftingPanel;
  private mapPanel!: MapPanel;
  private wiki!: WikiPanel;
  private menu!: MenuPanel;
  private mapButton!: HudButton;
  private rideButton!: HudButton;
  private buildButton!: HudButton;
  private toolButton!: HudButton;
  private buildBar!: BuildBar;
  private toolBar!: ToolBar;
  private usingToolButton = false;
  private dayClock!: DayClock;
  private tutorial!: TutorialHints;
  private safe: SafeArea = { top: 0, right: 0, bottom: 0, left: 0 };
  private downAt = new Map<number, { x: number; y: number; t: number }>();
  private toastQueue: string[] = [];
  private toastBusyUntil = 0;

  constructor() {
    super(SCENES.ui);
  }

  create(): void {
    this.cameras.main.setOrigin(0, 0).setZoom(DPR);
    this.input.addPointer(2);

    const touch = isTouchDevice();
    this.joystick = new Joystick(this, touch);
    this.button = new ContextButton(this, !touch, () => inputState.requestInteract());
    this.dialogue = new DialoguePanel(
      this,
      touch,
      (choice) =>
        (choice.requires ?? []).every((f) => gameState.hasFlag(f)) &&
        !(choice.forbids ?? []).some((f) => gameState.hasFlag(f)),
    );
    this.areaBanner = new Banner(this, 17, () => this.layoutTopStack());
    this.toast = new Banner(this, 14, () => this.layoutTopStack());
    this.resourceBar = new ResourceBar(this);
    this.questLog = new QuestLog(this, (open) => {
      if (open) {
        this.inventory.setOpen(false);
        this.crafting.setOpen(false);
        this.mapPanel.setOpen(false);
        this.wiki.setOpen(false);
      }
      this.syncModal();
      if (open) this.releaseJoystick();
      this.layoutTopStack();
    });
    this.inventory = new InventoryPanel(
      this,
      (open) => {
        if (open) {
          this.questLog.setOpen(false);
          this.crafting.setOpen(false);
          this.mapPanel.setOpen(false);
          this.wiki.setOpen(false);
        }
        this.syncModal();
        if (open) this.releaseJoystick();
      },
      hasPocketWorkbench,
      () => this.openPocketWorkbench(),
      (itemId) => {
        if (eatMeal(itemId)) this.enqueueToast(`${content.items.get(itemId).name} gegessen.`);
      },
    );
    this.crafting = new CraftingPanel(
      this,
      touch,
      (open) => {
        if (open) {
          this.questLog.setOpen(false);
          this.inventory.setOpen(false);
          this.mapPanel.setOpen(false);
          this.wiki.setOpen(false);
        }
        this.syncModal();
        if (open) this.releaseJoystick();
      },
      (recipeId) => craftWithToast(recipeId),
    );
    this.mapPanel = new MapPanel(
      this,
      touch,
      (open) => {
        if (open) {
          this.questLog.setOpen(false);
          this.inventory.setOpen(false);
          this.crafting.setOpen(false);
          this.wiki.setOpen(false);
        }
        this.syncModal();
        if (open) this.releaseJoystick();
      },
      (mapId) => {
        if (travelTo(mapId)) this.mapPanel.setOpen(false);
      },
    );
    this.wiki = new WikiPanel(this, (open) => {
      if (open) {
        this.questLog.setOpen(false);
        this.inventory.setOpen(false);
        this.crafting.setOpen(false);
        this.mapPanel.setOpen(false);
      }
      this.syncModal();
      if (open) this.releaseJoystick();
    });
    this.menu = new MenuPanel(this, [{ label: 'Almanach  (H)', action: () => this.toggleWiki() }], (open) => {
      if (open) {
        this.questLog.setOpen(false);
        this.inventory.setOpen(false);
        this.crafting.setOpen(false);
        this.mapPanel.setOpen(false);
        this.wiki.setOpen(false);
      }
      this.syncModal();
      if (open) this.releaseJoystick();
    });
    this.mapButton = new HudButton(this, drawMapIcon, touch ? undefined : 'M');
    this.rideButton = new HudButton(this, drawHorseIcon, touch ? undefined : 'R');
    this.buildButton = new HudButton(this, drawHammerIcon, touch ? undefined : 'B');
    this.toolButton = new HudButton(
      this,
      (g, color) =>
        isAutoTool() ? drawAutoIcon(g, color) : drawToolIcon(g, color, (getEquippedTool() ?? getOwnedTools()[0])?.kind ?? 'sickle'),
      touch ? undefined : 'T',
    );
    this.buildBar = new BuildBar(this, touch);
    this.toolBar = new ToolBar(this, touch);
    this.dayClock = new DayClock(this);
    this.tutorial = new TutorialHints(this, touch, () => this.layoutTopStack());

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (this.inventory.isOpen) this.inventory.scrollBy(dy * 0.5);
      else if (this.crafting.isOpen) this.crafting.scrollBy(dy * 0.5);
      else if (this.wiki.isOpen) this.wiki.scrollBy(dy * 0.5);
      else this.questLog.scrollBy(dy * 0.5);
    });

    const kb = this.input.keyboard;
    kb?.on('keydown-Q', () => this.toggleQuestLog());
    kb?.on('keydown-TAB', (e: KeyboardEvent) => {
      e.preventDefault();
      this.toggleQuestLog();
    });
    kb?.on('keydown-I', () => {
      if (!this.dialogue.isOpen) this.inventory.toggle();
    });
    kb?.on('keydown-C', () => {
      if (!this.dialogue.isOpen && !this.crafting.isOpen && hasPocketWorkbench()) this.openPocketWorkbench();
    });
    kb?.on('keydown-H', () => this.toggleWiki());
    kb?.on('keydown-M', () => this.toggleMap());
    kb?.on('keydown-R', () => this.toggleRide());
    kb?.on('keydown-B', () => this.toggleBuild());
    kb?.on('keydown-T', () => this.toggleTools());
    kb?.on('keydown-ESC', () => {
      if (!inputState.modal) {
        setBuildMode(false);
        setToolMode(false);
      }
      this.questLog.setOpen(false);
      this.inventory.setOpen(false);
      this.crafting.setOpen(false);
      this.mapPanel.setOpen(false);
      this.wiki.back();
      this.menu.setOpen(false);
    });
    const stepY = (dir: 1 | -1) => () => {
      if (this.dialogue.isOpen && this.dialogue.hasChoices) this.dialogue.moveChoice(dir);
      else if (this.crafting.isOpen) this.crafting.moveSelection(0, dir);
      else if (this.inventory.isOpen) this.inventory.moveSelection(0, dir);
      else if (this.menu.isOpen) this.menu.moveSelection(dir);
      else if (this.wiki.isOpen) this.wiki.moveSelection(dir);
      else this.mapPanel.moveSelection(dir);
    };
    const stepX = (dir: 1 | -1) => () => {
      if (this.crafting.isOpen) this.crafting.moveSelection(dir, 0);
      else if (this.inventory.isOpen) this.inventory.moveSelection(dir, 0);
      else if (this.menu.isOpen) this.menu.moveSelection(dir);
      else if (this.wiki.isOpen) this.wiki.moveSelection(dir);
      else this.mapPanel.moveSelection(dir);
    };
    for (const key of ['UP', 'W']) kb?.on(`keydown-${key}`, stepY(-1));
    for (const key of ['DOWN', 'S']) kb?.on(`keydown-${key}`, stepY(1));
    for (const key of ['LEFT', 'A']) kb?.on(`keydown-${key}`, stepX(-1));
    for (const key of ['RIGHT', 'D']) kb?.on(`keydown-${key}`, stepX(1));
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'].forEach((key, idx) => {
      kb?.on(`keydown-${key}`, () => {
        if (this.dialogue.isOpen && this.dialogue.hasChoices) {
          const picked = this.dialogue.pickChoiceIndex(idx);
          if (picked) this.applyDialogueChoice(picked);
        } else if (this.crafting.isOpen) {
          this.crafting.craftIndex(idx);
        } else if (this.toolBar.visible) {
          const toolId = this.toolBar.toolAt(idx);
          if (toolId) this.pickTool(toolId);
        } else if (this.buildBar.visible) {
          const pieceId = this.buildBar.pieceAt(idx);
          if (pieceId) selectBuildPiece(pieceId);
        }
      });
    });

    bus.onScene(this, 'interaction-focus', (f) => (f ? this.button.show(f.label) : this.button.hide()));
    bus.onScene(this, 'area-changed', ({ name }) => this.areaBanner.show(name));
    bus.onScene(this, 'toast', ({ text }) => this.enqueueToast(text));
    bus.onScene(this, 'dialogue-show', ({ id, lines, style, title }) => {
      this.questLog.setOpen(false);
      this.inventory.setOpen(false);
      this.crafting.setOpen(false);
      this.mapPanel.setOpen(false);
      this.wiki.setOpen(false);
      this.menu.setOpen(false);
      this.dialogue.open(id, lines, style, title);
      inputState.modal = this.dialogue.isOpen;
      if (inputState.modal) this.releaseJoystick();
    });
    bus.onScene(this, 'crafting-open', () => {
      this.dialogue.close();
      this.crafting.setOpen(true);
    });
    bus.onScene(this, 'dialogue-advance', () => {
      if (this.questLog.isOpen) this.questLog.setOpen(false);
      else if (this.inventory.isOpen) this.inventory.setOpen(false);
      else if (this.crafting.isOpen) this.crafting.confirm();
      else if (this.mapPanel.isOpen) this.mapPanel.confirm();
      else if (this.wiki.isOpen) this.wiki.confirm();
      else if (this.menu.isOpen) this.menu.confirm();
      else if (this.dialogue.isOpen && this.dialogue.hasChoices) {
        const picked = this.dialogue.pickSelectedChoice();
        if (picked) this.applyDialogueChoice(picked);
      } else this.advanceDialogue();
    });
    bus.onScene(this, 'build-mode-changed', () => this.buildBar.refresh());
    bus.onScene(this, 'tool-changed', () => {
      this.toolBar.refresh();
      this.toolButton.refresh();
    });
    bus.onScene(this, 'inventory-changed', () => {
      this.buildBar.refresh();
      this.toolBar.refresh();
      this.toolButton.refresh();
      this.resourceBar.refresh();
      this.inventory.refresh();
      this.crafting.refresh();
      this.layoutTopStack();
    });
    bus.onScene(this, 'flag-changed', () => {
      this.crafting.refresh();
    });
    bus.onScene(this, 'save-loaded', () => {
      this.resourceBar.refresh();
      this.questLog.refresh();
      this.inventory.refresh();
      this.crafting.refresh();
      this.layoutTopStack();
    });
    bus.onScene(this, 'quest-updated', () => {
      this.questLog.refresh();
      this.layoutTopStack();
    });

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
  }

  override update(_time: number, delta: number): void {
    inputState.setMove(this.joystick.vectorX, this.joystick.vectorY);
    this.dayClock.update();
    this.tutorial.update(delta);
    this.syncHudButtons();
    if (this.toastQueue.length > 0 && this.time.now >= this.toastBusyUntil) {
      this.toast.show(this.toastQueue.shift() as string, TOAST_MS);
      this.toastBusyUntil = this.time.now + TOAST_MS + 300;
    }
  }

  private get viewW(): number {
    return this.scale.width / DPR;
  }

  private get viewH(): number {
    return this.scale.height / DPR;
  }

  private layout(): void {
    this.safe = readSafeArea();
    const { viewW: w, viewH: h, safe } = this;
    const r = this.button.radius;
    const topRowY = safe.top + TOP_ROW_OFFSET;
    const centerX = safe.left + (w - safe.left - safe.right) / 2;
    const maxBannerW = Math.max(200, w - safe.left - safe.right - 24);

    this.button.setPosition(w - safe.right - r - 22, h - safe.bottom - r - 34);
    this.joystick.setRestPosition(safe.left + 92, h - safe.bottom - 100);
    this.dialogue.layout(w, h, safe.bottom, safe.left, safe.right);
    this.resourceBar.setPosition(safe.left + 28, topRowY);
    this.questLog.layout(w, h, safe, topRowY, this.dayClock.width);
    this.dayClock.setPosition(w - safe.right - 18, this.questLog.topBarBottom + 8 + this.dayClock.height / 2);
    this.inventory.layout(w, h, safe);
    this.crafting.layout(w, h, safe);
    this.mapPanel.layout(w, h, safe);
    this.wiki.layout(w, h, safe);
    this.menu.layout(w, h, safe);
    this.buildBar.layout(w, h, safe);
    this.toolBar.layout(w, h, safe);
    this.areaBanner.setMaxWidth(maxBannerW);
    this.toast.setMaxWidth(maxBannerW);
    this.tutorial.layout(w, 0, centerX, maxBannerW);
    this.layoutTopStack();
  }

  private layoutTopStack(): void {
    if (!this.tutorial) return;
    const { viewW: w, safe } = this;
    const topRowY = safe.top + TOP_ROW_OFFSET;
    const centerX = safe.left + (w - safe.left - safe.right) / 2;

    const leftClearance = centerX - (this.resourceBar.rightEdge + 16);
    const rightClearance = this.questLog.buttonLeft - 16 - centerX;
    const maxTopRowBannerW = 2 * Math.min(leftClearance, rightClearance);
    const areaFitsTopRow = maxTopRowBannerW >= this.areaBanner.width;

    let nextY = Math.max(this.questLog.trackerBottom, this.dayClock.bottom);
    if (areaFitsTopRow) {
      this.areaBanner.setPosition(centerX, topRowY);
      if (this.areaBanner.isVisible) {
        nextY = Math.max(nextY, topRowY + this.areaBanner.height / 2);
      }
    } else {
      const areaTop = nextY + 10;
      this.areaBanner.setPosition(centerX, areaTop + this.areaBanner.height / 2);
      if (this.areaBanner.isVisible) nextY = areaTop + this.areaBanner.height;
    }

    const toastTop = nextY + 10;
    this.toast.setPosition(centerX, toastTop + this.toast.height / 2);
    if (this.toast.isVisible) nextY = toastTop + this.toast.height;

    this.tutorial.setTopY(nextY + 12);
  }

  private enqueueToast(text: string): void {
    if (this.toastQueue.length > 4) this.toastQueue.shift();
    this.toastQueue.push(text);
  }

  private syncModal(): void {
    inputState.modal =
      this.dialogue.isOpen ||
      this.questLog.isOpen ||
      this.inventory.isOpen ||
      this.crafting.isOpen ||
      this.mapPanel.isOpen ||
      this.wiki.isOpen ||
      this.menu.isOpen;
  }

  /** Map, horse and build buttons: a column above the context button, shown once unlocked. */
  private syncHudButtons(): void {
    const hidden = inputState.modal;
    const building = getBuildMode().active;
    const tooling = getToolMode().open;
    this.buildBar.setVisible(building && !hidden);
    this.toolBar.setVisible(tooling && !hidden);
    this.syncUseButton(tooling && !hidden);
    this.toolButton.setVisible(!hidden && getOwnedTools().length > 0);
    this.toolButton.setState(tooling);
    this.buildButton.setVisible(!hidden && isBuildUnlocked() && canRideHere());
    this.buildButton.setState(building);
    this.mapButton.setVisible(!hidden && hasTravelMap());
    this.rideButton.setVisible(!hidden && hasHorse());
    this.rideButton.setState(isRiding(), canRideHere());
    const r = this.button.radius;
    const bar = this.buildBar.visible ? this.buildBar : this.toolBar.visible ? this.toolBar : undefined;
    // The bars take the bottom edge on narrow screens; the action button and the column move up above them.
    let buttonY = this.viewH - this.safe.bottom - r - 34;
    if (bar) buttonY = Math.min(buttonY, this.viewH - this.safe.bottom - bar.height - 14 - r);
    this.button.setPosition(this.viewW - this.safe.right - r - 22, buttonY);
    let x = this.viewW - this.safe.right - 22 - HudButton.RADIUS;
    const startY = buttonY - r - 16 - HudButton.RADIUS;
    let y = startY;
    const step = HudButton.RADIUS * 2 + 12;
    // A short (landscape) screen starts a second column to the left instead of running into the clock.
    const topLimit = this.dayClock.bottom + 12 + HudButton.RADIUS;
    let columnTop = y;
    for (const b of [this.buildButton, this.toolButton, this.rideButton, this.mapButton]) {
      if (!b.visible) continue;
      if (y < topLimit && y !== columnTop) {
        x -= HudButton.RADIUS * 2 + 12;
        y = columnTop;
      }
      b.setPosition(x, y);
      y -= step;
    }
  }

  /** While the tool bar is open, the big round button is the tool in hand: one tap uses it (on touch there is no E). */
  private syncUseButton(tooling: boolean): void {
    if (!tooling) {
      if (this.usingToolButton) {
        this.usingToolButton = false;
        this.button.hide();
      }
      return;
    }
    const auto = isAutoTool();
    const tool = getEquippedTool();
    if (!auto && (!tool || tool.kind === 'light')) {
      if (this.usingToolButton) this.button.hide();
      this.usingToolButton = false;
      return;
    }
    this.usingToolButton = true;
    this.button.showIcon(auto ? 'auto' : (tool as ToolDef).kind, (g, color) =>
      auto ? drawAutoIcon(g, color) : drawToolIcon(g, color, (tool as ToolDef).kind),
    );
  }

  private toggleMap(): void {
    if (this.dialogue.isOpen || !hasTravelMap()) return;
    this.mapPanel.toggle();
  }

  private toggleWiki(): void {
    if (this.dialogue.isOpen) return;
    this.wiki.toggle();
  }

  private toggleBuild(): void {
    if (inputState.modal) return;
    if (!isBuildUnlocked()) return;
    if (!canRideHere()) this.enqueueToast('Drinnen ist kein Platz zum Bauen.');
    else setBuildMode(!getBuildMode().active);
  }

  private toggleTools(): void {
    if (inputState.modal || getOwnedTools().length === 0) return;
    setToolMode(!getToolMode().open);
  }

  /** A tool slot was picked: take it in hand; the satchel again switches to the next kind of seed. */
  private pickTool(toolId: string): void {
    const inHand = getEquippedTool();
    if (inHand?.id === toolId && inHand.kind === 'satchel') cycleSeed();
    else if (toolId === AUTO_TOOL && isAutoTool()) return;
    else equipTool(toolId);
  }

  private toggleRide(): void {
    if (!inputState.modal) toggleRiding();
  }

  /** The pocket workbench: the same crafting panel a workbench opens, from anywhere. */
  private openPocketWorkbench(): void {
    this.inventory.setOpen(false);
    if (getUnlockedRecipes().length > 0) this.crafting.setOpen(true);
    else this.enqueueToast('Du kennst noch kein Rezept.');
  }

  private toggleQuestLog(): void {
    if (this.dialogue.isOpen) return;
    this.questLog.toggle();
  }

  private applyDialogueChoice(choice: DialogueChoice): void {
    if (choice.id && this.dialogue.id) bus.emit('dialogue-choice', { dialogueId: this.dialogue.id, choiceId: choice.id });
    for (const item of choice.giveItems ?? []) {
      gameState.addItem(item.itemId, item.count);
      this.enqueueToast(`+${item.count} ${content.items.get(item.itemId).name}`);
    }
    for (const flag of choice.setFlags ?? []) gameState.setFlag(flag);
    gameState.save();
    if (choice.nextDialogueId) {
      const next = content.dialogues.get(choice.nextDialogueId);
      this.dialogue.openBranch(next.id, next.lines, next.style, next.title);
      return;
    }
    const rootId = this.dialogue.getRootId();
    const id = this.dialogue.id;
    this.dialogue.close();
    this.syncModal();
    if (id) bus.emit('dialogue-closed', { id });
    if (rootId && rootId !== id) bus.emit('dialogue-closed', { id: rootId });
  }

  private advanceDialogue(): void {
    const rootId = this.dialogue.getRootId();
    const id = this.dialogue.id;
    if (id === null) return;
    if (!this.dialogue.advance()) {
      this.syncModal();
      bus.emit('dialogue-closed', { id });
      if (rootId && rootId !== id) bus.emit('dialogue-closed', { id: rootId });
    }
  }

  private releaseJoystick(): void {
    for (const id of [...this.downAt.keys()]) this.joystick.end(id);
  }

  private toCss(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    return { x: pointer.x / DPR, y: pointer.y / DPR };
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    const p = this.toCss(pointer);
    if (this.dialogue.isOpen) {
      if (this.dialogue.hasChoices) {
        const picked = this.dialogue.pickChoiceAt(p.x, p.y);
        if (picked) this.applyDialogueChoice(picked);
      } else {
        this.advanceDialogue();
      }
      return;
    }
    if (this.menu.pointerDown(p.x, p.y)) return;
    if (this.wiki.pointerDown(p.x, p.y)) return;
    if (this.mapPanel.pointerDown(p.x, p.y)) return;
    if (this.crafting.pointerDown(p.x, p.y)) return;
    if (this.inventory.pointerDown(p.x, p.y)) return;
    if (this.questLog.pointerDown(p.x, p.y)) return;
    const pickedTool = this.toolBar.pointerDown(p.x, p.y);
    if (pickedTool !== undefined) {
      if (pickedTool) this.pickTool(pickedTool);
      return;
    }
    const pickedPiece = this.buildBar.pointerDown(p.x, p.y);
    if (pickedPiece !== undefined) {
      if (pickedPiece) selectBuildPiece(pickedPiece);
      return;
    }
    if (this.buildButton.contains(p.x, p.y)) {
      this.toggleBuild();
      return;
    }
    if (this.toolButton.contains(p.x, p.y)) {
      this.toggleTools();
      return;
    }
    if (this.mapButton.contains(p.x, p.y)) {
      this.toggleMap();
      return;
    }
    if (this.rideButton.contains(p.x, p.y)) {
      this.toggleRide();
      return;
    }
    if (this.questLog.buttonContains(p.x, p.y)) {
      this.questLog.toggle();
      return;
    }
    const top = this.resourceBar.hit(p.x, p.y);
    if (top === 'inventory') {
      this.inventory.toggle();
      return;
    }
    if (top === 'menu') {
      this.menu.toggle();
      return;
    }
    if (this.button.contains(p.x, p.y)) return;
    this.downAt.set(pointer.id, { ...p, t: this.time.now });
    if (!this.joystick.active) this.joystick.start(pointer.id, p.x, p.y);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!pointer.isDown) return;
    const p = this.toCss(pointer);
    if (this.mapPanel.isOpen) return;
    if (this.wiki.isOpen) {
      this.wiki.pointerMove(p.y);
      return;
    }
    if (this.crafting.isOpen) {
      this.crafting.pointerMove(p.y);
      return;
    }
    if (this.inventory.isOpen) {
      this.inventory.pointerMove(p.y);
      return;
    }
    if (this.questLog.isOpen) {
      this.questLog.pointerMove(p.y);
      return;
    }
    this.joystick.move(pointer.id, p.x, p.y);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    const p = this.toCss(pointer);
    this.questLog.pointerUp();
    this.inventory.pointerUp(p.x, p.y);
    this.crafting.pointerUp(p.x, p.y);
    this.wiki.pointerUp(p.x, p.y);
    const down = this.downAt.get(pointer.id);
    this.downAt.delete(pointer.id);
    this.joystick.end(pointer.id);
    if (!down) return;
    const isTap = this.time.now - down.t <= TAP_MAX_MS && Math.hypot(p.x - down.x, p.y - down.y) <= TAP_MAX_MOVE;
    if (isTap) bus.emit('tap', { x: pointer.x, y: pointer.y });
  }
}
