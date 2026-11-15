import Phaser from 'phaser';
import { content, type DialogueChoice } from '../content';
import { bus } from '../systems/events';
import { inputState } from '../systems/input';
import { gameState } from '../systems/state';
import { Banner } from '../ui/Banner';
import { ContextButton } from '../ui/ContextButton';
import { DialoguePanel } from '../ui/DialoguePanel';
import { Joystick } from '../ui/Joystick';
import { QuestLog } from '../ui/QuestLog';
import { ResourceBar } from '../ui/ResourceBar';
import { TutorialHints } from '../ui/TutorialHints';
import { DPR, isTouchDevice, readSafeArea, type SafeArea } from '../ui/viewport';
import { SCENES } from './keys';

const TAP_MAX_MS = 280;
const TAP_MAX_MOVE = 12;
const TOAST_MS = 1900;

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
    this.areaBanner = new Banner(this, 17);
    this.toast = new Banner(this, 14);
    this.resourceBar = new ResourceBar(this);
    this.questLog = new QuestLog(this, (open) => {
      inputState.modal = open || this.dialogue.isOpen;
      if (open) this.releaseJoystick();
    });
    this.tutorial = new TutorialHints(this, touch);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => this.questLog.scrollBy(dy * 0.5));

    const kb = this.input.keyboard;
    kb?.on('keydown-Q', () => this.toggleQuestLog());
    kb?.on('keydown-TAB', (e: KeyboardEvent) => {
      e.preventDefault();
      this.toggleQuestLog();
    });
    kb?.on('keydown-ESC', () => this.questLog.setOpen(false));
    kb?.on('keydown-UP', () => {
      if (this.dialogue.isOpen && this.dialogue.hasChoices) this.dialogue.moveChoice(-1);
    });
    kb?.on('keydown-W', () => {
      if (this.dialogue.isOpen && this.dialogue.hasChoices) this.dialogue.moveChoice(-1);
    });
    kb?.on('keydown-DOWN', () => {
      if (this.dialogue.isOpen && this.dialogue.hasChoices) this.dialogue.moveChoice(1);
    });
    kb?.on('keydown-S', () => {
      if (this.dialogue.isOpen && this.dialogue.hasChoices) this.dialogue.moveChoice(1);
    });
    ['ONE', 'TWO', 'THREE', 'FOUR'].forEach((key, idx) => {
      kb?.on(`keydown-${key}`, () => {
        if (!this.dialogue.isOpen || !this.dialogue.hasChoices) return;
        const picked = this.dialogue.pickChoiceIndex(idx);
        if (picked) this.applyDialogueChoice(picked);
      });
    });

    bus.onScene(this, 'interaction-focus', (f) => (f ? this.button.show(f.label) : this.button.hide()));
    bus.onScene(this, 'area-changed', ({ name }) => this.areaBanner.show(name));
    bus.onScene(this, 'toast', ({ text }) => this.enqueueToast(text));
    bus.onScene(this, 'dialogue-show', ({ id, lines, style, title }) => {
      this.questLog.setOpen(false);
      this.dialogue.open(id, lines, style, title);
      inputState.modal = this.dialogue.isOpen;
      if (inputState.modal) this.releaseJoystick();
    });
    bus.onScene(this, 'dialogue-advance', () => {
      if (this.questLog.isOpen) this.questLog.setOpen(false);
      else if (this.dialogue.isOpen && this.dialogue.hasChoices) {
        const picked = this.dialogue.pickSelectedChoice();
        if (picked) this.applyDialogueChoice(picked);
      } else this.advanceDialogue();
    });
    bus.onScene(this, 'inventory-changed', () => this.resourceBar.refresh());
    bus.onScene(this, 'save-loaded', () => {
      this.resourceBar.refresh();
      this.questLog.refresh();
    });
    bus.onScene(this, 'quest-updated', () => this.questLog.refresh());

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
  }

  override update(_time: number, delta: number): void {
    inputState.setMove(this.joystick.vectorX, this.joystick.vectorY);
    this.tutorial.update(delta);
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
    this.button.setPosition(w - safe.right - r - 22, h - safe.bottom - r - 34);
    this.joystick.setRestPosition(safe.left + 92, h - safe.bottom - 100);
    this.dialogue.layout(w, h, safe.bottom, safe.left, safe.right);
    this.areaBanner.setPosition(w / 2, w < 620 ? safe.top + 132 : safe.top + 34);
    this.toast.setPosition(w / 2, safe.top + 98);
    this.resourceBar.setPosition(safe.left + 18, safe.top + 26);
    this.questLog.layout(w, h, safe);
    this.tutorial.layout(w, safe.top + 165);
  }

  private enqueueToast(text: string): void {
    if (this.toastQueue.length > 4) this.toastQueue.shift();
    this.toastQueue.push(text);
  }

  private toggleQuestLog(): void {
    if (this.dialogue.isOpen) return;
    this.questLog.toggle();
  }

  private applyDialogueChoice(choice: DialogueChoice): void {
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
    inputState.modal = this.questLog.isOpen;
    if (id) bus.emit('dialogue-closed', { id });
    if (rootId && rootId !== id) bus.emit('dialogue-closed', { id: rootId });
  }

  private advanceDialogue(): void {
    const rootId = this.dialogue.getRootId();
    const id = this.dialogue.id;
    if (id === null) return;
    if (!this.dialogue.advance()) {
      inputState.modal = this.questLog.isOpen;
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
    if (this.questLog.pointerDown(p.x, p.y)) return;
    if (this.questLog.buttonContains(p.x, p.y)) {
      this.questLog.toggle();
      return;
    }
    if (this.button.contains(p.x, p.y)) return;
    this.downAt.set(pointer.id, { ...p, t: this.time.now });
    if (!this.joystick.active) this.joystick.start(pointer.id, p.x, p.y);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!pointer.isDown) return;
    const p = this.toCss(pointer);
    if (this.questLog.isOpen) {
      this.questLog.pointerMove(p.y);
      return;
    }
    this.joystick.move(pointer.id, p.x, p.y);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    this.questLog.pointerUp();
    const down = this.downAt.get(pointer.id);
    this.downAt.delete(pointer.id);
    this.joystick.end(pointer.id);
    if (!down) return;
    const p = this.toCss(pointer);
    const isTap = this.time.now - down.t <= TAP_MAX_MS && Math.hypot(p.x - down.x, p.y - down.y) <= TAP_MAX_MOVE;
    if (isTap) bus.emit('tap', { x: pointer.x, y: pointer.y });
  }
}
