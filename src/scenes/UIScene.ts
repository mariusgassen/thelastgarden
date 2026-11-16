import Phaser from 'phaser';
import { content, type DialogueChoice } from '../content';
import { getBuildMode, isBuildUnlocked, selectBuildPiece, setBuildMode } from '../systems/building';
import { craftWithToast, getUnlockedRecipes, hasPocketWorkbench } from '../systems/crafting';
import { bus } from '../systems/events';
import { disembarkBoat, isBoatingHere } from '../systems/boat';
import { canRideHere, hasHorse, isRiding, toggleRiding } from '../systems/horse';
import { inputState } from '../systems/input';
import { eatMeal } from '../systems/meals';
import { gameState } from '../systems/state';
import { hasTravelMap, travelTo } from '../systems/travel';
import {
  AUTO_TOOL,
  DESELECT_TOOL,
  cycleSeed,
  equipTool,
  getEquippedTool,
  getLastToolId,
  getOwnedTools,
  getSowableSpecies,
  getToolMode,
  isAutoTool,
  isToolActing,
  peekTool,
  reEquipLastTool,
  setSowSeed,
  setToolMode,
} from '../systems/tools';
import type { ToolDef } from '../content/types';
import { Banner } from '../ui/Banner';
import { BuildBar } from '../ui/BuildBar';
import { ContextButton } from '../ui/ContextButton';
import { CraftingPanel } from '../ui/CraftingPanel';
import { DayClock } from '../ui/DayClock';
import { DialoguePanel } from '../ui/DialoguePanel';
import { drawAutoIcon, drawBoatIcon, drawHammerIcon, drawHorseIcon, drawToolIcon, HudButton } from '../ui/HudButton';
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
const TOOL_HOLD_MS = 180;
const TOOL_DRAG_PX = 10;
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
  private rideButton!: HudButton;
  private buildButton!: HudButton;
  private toolButton!: HudButton;
  private buildBar!: BuildBar;
  private toolBar!: ToolBar;
  private usingToolButton = false;
  private focusedInteractable: { id: string; label: string } | null = null;
  private dayClock!: DayClock;
  private tutorial!: TutorialHints;
  private safe: SafeArea = { top: 0, right: 0, bottom: 0, left: 0 };
  private downAt = new Map<number, { x: number; y: number; t: number }>();
  private toolHold: {
    pointerId: number;
    x: number;
    y: number;
    openedByHold: boolean;
    timer: Phaser.Time.TimerEvent;
  } | null = null;
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
    this.rideButton = new HudButton(this, (g, color) => (isBoatingHere() ? drawBoatIcon(g, color) : drawHorseIcon(g, color)), touch ? undefined : 'R');
    this.buildButton = new HudButton(this, drawHammerIcon, touch ? undefined : 'B');
    this.toolButton = new HudButton(
      this,
      (g, color) => {
        const shownId = (isAutoTool() ? AUTO_TOOL : getEquippedTool()?.id) ?? getLastToolId();
        if (shownId === AUTO_TOOL) drawAutoIcon(g, color);
        else {
          const kind = (shownId ? content.tools.find(shownId)?.kind : undefined) ?? getOwnedTools()[0]?.kind ?? 'sickle';
          drawToolIcon(g, color, kind);
        }
      },
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
        if (getToolMode().open) setToolMode(false);
        else equipTool(null);
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
          if (toolId) this.pickTool(toolId, true);
        } else if (this.buildBar.visible) {
          const pieceId = this.buildBar.pieceAt(idx);
          if (pieceId) selectBuildPiece(pieceId);
        }
      });
    });

    bus.onScene(this, 'interaction-focus', (f) => {
      this.focusedInteractable = f;
      if (this.usingToolButton) return;
      if (f) this.button.show(f.label);
      else if (!isToolActing() || getBuildMode().active || inputState.modal) this.button.hide();
    });
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
    bus.onScene(this, 'crafting-open', (options) => {
      this.dialogue.close();
      this.crafting.setOpen(true, options);
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
      this.syncHudButtons();
      this.toolBar.refresh();
      this.toolButton.refresh();
    });
    bus.onScene(this, 'boat-changed', () => {
      this.rideButton.refresh();
      this.syncHudButtons();
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
      this.resourceBar.setMapVisible(hasTravelMap());
      this.layoutTopStack();
    });
    bus.onScene(this, 'save-loaded', () => {
      this.resourceBar.setMapVisible(hasTravelMap());
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
    this.resourceBar.setMapVisible(hasTravelMap());
    this.questLog.layout(w, h, safe, topRowY, this.dayClock.width);
    this.dayClock.setPosition(w - safe.right - 18, this.questLog.topBarBottom + 8 + this.dayClock.height / 2);
    this.inventory.layout(w, h, safe);
    this.crafting.layout(w, h, safe);
    this.mapPanel.layout(w, h, safe);
    this.wiki.layout(w, h, safe);
    this.menu.layout(w, h, safe);
    this.buildBar.layout(w, h, safe);
    this.areaBanner.setMaxWidth(maxBannerW);
    this.toast.setMaxWidth(maxBannerW);
    this.tutorial.layout(w, 0, centerX, maxBannerW);
    this.syncHudButtons();
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

  private cancelToolHold(): void {
    if (!this.toolHold) return;
    this.toolHold.timer.remove(false);
    this.toolHold = null;
    this.toolBar.setPreview(null);
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
    if (inputState.modal) this.cancelToolHold();
  }

  /** Right HUD column above ContextButton (tools lowest, then build, then horse) + top-left map visibility. */
  private syncHudButtons(): void {
    const hidden = inputState.modal;
    const building = getBuildMode().active;
    const tooling = getToolMode().open;
    const equipped = Boolean(getEquippedTool()) || isAutoTool();
    this.resourceBar.setMapVisible(hasTravelMap());
    this.buildBar.setVisible(building && !hidden);
    this.syncUseButton(!hidden && !building && isToolActing());
    this.toolButton.setVisible(!hidden && getOwnedTools().length > 0);
    this.toolButton.setState(equipped || tooling);
    this.buildButton.setVisible(!hidden && isBuildUnlocked() && canRideHere());
    this.buildButton.setState(building);
    const boating = isBoatingHere();
    this.rideButton.setVisible(!hidden && (hasHorse() || boating));
    this.rideButton.setState(boating || isRiding(), canRideHere());
    const r = this.button.radius;
    const bar = this.buildBar.visible ? this.buildBar : undefined;
    // BuildBar takes the bottom edge on narrow screens; vertical ToolBar sits parallel to the button column without shifting anything.
    let buttonY = this.viewH - this.safe.bottom - r - 34;
    if (bar) buttonY = Math.min(buttonY, this.viewH - this.safe.bottom - bar.height - 14 - r);
    inputState.bottomInset = bar ? this.safe.bottom + bar.height + 10 : 0;
    this.button.setPosition(this.viewW - this.safe.right - r - 22, buttonY);
    let x = this.viewW - this.safe.right - 22 - HudButton.RADIUS;
    const startY = buttonY - r - 16 - HudButton.RADIUS;
    let y = startY;
    const step = HudButton.RADIUS * 2 + 12;
    // A short (landscape) screen starts a second column to the left instead of running into the clock.
    const topLimit = this.dayClock.bottom + 12 + HudButton.RADIUS;
    const columnTop = y;
    for (const b of [this.toolButton, this.buildButton, this.rideButton]) {
      if (!b.visible) continue;
      if (y < topLimit && y !== columnTop) {
        x -= HudButton.RADIUS * 2 + 12;
        y = columnTop;
      }
      b.setPosition(x, y);
      y -= step;
    }
    if (this.toolButton.visible) {
      this.toolBar.positionNear(this.toolButton.x, this.toolButton.y, this.dayClock.bottom + 10, this.viewH, this.safe);
    }
    this.toolBar.setVisible(tooling && !hidden);
  }

  /** While a work tool is equipped, ContextButton shows it (or yields to a nearby interactable when no tool target is in reach). */
  private syncUseButton(tooling: boolean): void {
    const auto = isAutoTool();
    const tool = getEquippedTool();
    if (!tooling || (!auto && (!tool || tool.kind === 'light'))) {
      if (this.usingToolButton) {
        this.usingToolButton = false;
        if (!inputState.modal && !getBuildMode().active && this.focusedInteractable) {
          this.button.show(this.focusedInteractable.label);
        } else {
          this.button.hide();
        }
      }
      return;
    }
    const player = gameState.data.player;
    const acts = peekTool(player.mapId, { x: player.x, y: player.y });
    if (!acts && this.focusedInteractable) {
      this.usingToolButton = false;
      this.button.show(this.focusedInteractable.label);
      return;
    }
    this.usingToolButton = true;
    // The icon is what a press would do right now; dimmed, nothing is in reach to work on.
    const kind = acts ?? (auto ? null : (tool as ToolDef).kind);
    this.button.showIcon(
      `${kind ?? 'auto'}${acts ? '' : '-dim'}`,
      (g, color) => (kind ? drawToolIcon(g, color, kind) : drawAutoIcon(g, color)),
      !acts,
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

  /** A tool slot was picked: equip it and close the picker, put it away, or cycle the satchel's seed. */
  private pickTool(toolId: string, keepOpenOnCycle = false): void {
    if (toolId === DESELECT_TOOL) {
      equipTool(null);
      setToolMode(false);
      return;
    }
    const inHand = getEquippedTool();
    if (inHand?.id === toolId && inHand.kind === 'satchel') {
      const next = cycleSeed();
      if (keepOpenOnCycle && getSowableSpecies().length > 1) return;
      setToolMode(false);
      if (next) {
        const plant = content.plants.get(next);
        const count = plant.seedItemId ? gameState.getItemCount(plant.seedItemId) : 0;
        this.enqueueToast(`Saatbeutel: ${plant.name} (${count})`);
      }
      return;
    }
    equipTool(toolId);
    setToolMode(false);
  }

  /** A seed was picked in the satchel sub-strip: select it, equip the satchel, and close the picker. */
  private pickSeed(plantId: string): void {
    if (!setSowSeed(plantId)) return;
    equipTool('tool-satchel');
    setToolMode(false);
    const plant = content.plants.get(plantId);
    const count = plant.seedItemId ? gameState.getItemCount(plant.seedItemId) : 0;
    this.enqueueToast(`Saatbeutel: ${plant.name} (${count})`);
  }

  private toggleRide(): void {
    if (inputState.modal) return;
    if (isBoatingHere()) {
      const p = gameState.data.player;
      disembarkBoat(p.mapId, p.x, p.y);
      return;
    }
    toggleRiding();
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
    if (this.toolButton.contains(p.x, p.y)) {
      if (this.toolBar.visible) {
        setToolMode(false);
        return;
      }
      this.cancelToolHold();
      const timer = this.time.delayedCall(TOOL_HOLD_MS, () => {
        if (!this.toolHold || this.toolHold.pointerId !== pointer.id) return;
        this.toolHold.openedByHold = true;
        setToolMode(true);
      });
      this.toolHold = { pointerId: pointer.id, x: p.x, y: p.y, openedByHold: false, timer };
      return;
    }
    const pickedTool = this.toolBar.pointerDown(p.x, p.y);
    if (pickedTool !== undefined) {
      if (pickedTool?.seed) this.pickSeed(pickedTool.seed);
      else if (pickedTool?.tool) this.pickTool(pickedTool.tool, true);
      return;
    }
    if (this.toolBar.visible) {
      setToolMode(false);
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
    if (top === 'map') {
      this.toggleMap();
      return;
    }
    if (this.button.contains(p.x, p.y)) return;
    this.downAt.set(pointer.id, { ...p, t: this.time.now });
    if (!this.joystick.active) this.joystick.start(pointer.id, p.x, p.y);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    const p = this.toCss(pointer);
    if (!pointer.isDown) {
      if (this.toolBar.visible && !this.toolHold && !inputState.modal) {
        const seed = this.toolBar.seedAt(p.x, p.y, false);
        const tool = seed ? undefined : this.toolBar.slotAt(p.x, p.y, false);
        this.toolBar.setPreview(tool ?? null, seed ?? null);
      }
      return;
    }
    if (this.toolHold?.pointerId === pointer.id) {
      if (!this.toolHold.openedByHold && Math.hypot(p.x - this.toolHold.x, p.y - this.toolHold.y) > TOOL_DRAG_PX) {
        this.toolHold.timer.remove(false);
        this.toolHold.openedByHold = true;
        setToolMode(true);
      }
      if (this.toolHold.openedByHold && this.toolBar.visible) {
        const seed = this.toolBar.seedAt(p.x, p.y, true);
        const tool = seed ? undefined : this.toolBar.slotAt(p.x, p.y, true);
        this.toolBar.setPreview(tool ?? null, seed ?? null);
      }
      return;
    }
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
    if (this.toolHold?.pointerId === pointer.id) {
      const hold = this.toolHold;
      this.cancelToolHold();
      if (hold.openedByHold) {
        const seed = this.toolBar.seedAt(p.x, p.y, true);
        const picked = seed ? undefined : this.toolBar.slotAt(p.x, p.y, true);
        if (seed) this.pickSeed(seed);
        else if (picked) this.pickTool(picked, false);
        else if (!this.toolButton.contains(p.x, p.y)) setToolMode(false);
      } else if (getEquippedTool() || isAutoTool()) {
        equipTool(null);
      } else if (!reEquipLastTool()) {
        setToolMode(true);
      }
      return;
    }
    const down = this.downAt.get(pointer.id);
    this.downAt.delete(pointer.id);
    this.joystick.end(pointer.id);
    if (!down) return;
    const isTap = this.time.now - down.t <= TAP_MAX_MS && Math.hypot(p.x - down.x, p.y - down.y) <= TAP_MAX_MOVE;
    if (isTap) bus.emit('tap', { x: pointer.x, y: pointer.y });
  }
}
