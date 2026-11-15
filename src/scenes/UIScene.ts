import Phaser from 'phaser';
import { bus } from '../systems/events';
import { inputState } from '../systems/input';
import { Banner } from '../ui/Banner';
import { ContextButton } from '../ui/ContextButton';
import { DialogueBox } from '../ui/DialogueBox';
import { Joystick } from '../ui/Joystick';
import { DPR, isTouchDevice, readSafeArea, type SafeArea } from '../ui/viewport';
import { SCENES } from './keys';

const TAP_MAX_MS = 280;
const TAP_MAX_MOVE = 12;

/**
 * HUD overlay above WorldScene. Works in CSS pixels (camera zoom = DPR).
 * Talks to the world only through inputState and the event bus.
 */
export class UIScene extends Phaser.Scene {
  private joystick!: Joystick;
  private button!: ContextButton;
  private dialogue!: DialogueBox;
  private areaBanner!: Banner;
  private toast!: Banner;
  private safe: SafeArea = { top: 0, right: 0, bottom: 0, left: 0 };
  private downAt = new Map<number, { x: number; y: number; t: number }>();

  constructor() {
    super(SCENES.ui);
  }

  create(): void {
    this.cameras.main.setOrigin(0, 0).setZoom(DPR);
    this.input.addPointer(2);

    const touch = isTouchDevice();
    this.joystick = new Joystick(this, touch);
    this.button = new ContextButton(this, !touch, () => inputState.requestInteract());
    this.dialogue = new DialogueBox(this);
    this.areaBanner = new Banner(this, 17);
    this.toast = new Banner(this, 14);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);

    bus.onScene(this, 'interaction-focus', (f) => (f ? this.button.show(f.label) : this.button.hide()));
    bus.onScene(this, 'area-changed', ({ name }) => this.areaBanner.show(name));
    bus.onScene(this, 'toast', ({ text }) => this.toast.show(text, 1800));
    bus.onScene(this, 'dialogue-show', ({ id, lines }) => {
      this.dialogue.open(id, lines);
      inputState.modal = this.dialogue.isOpen;
      if (inputState.modal) this.releaseJoystick();
    });
    bus.onScene(this, 'dialogue-advance', () => this.advanceDialogue());

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
  }

  override update(): void {
    inputState.setMove(this.joystick.vectorX, this.joystick.vectorY);
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
    this.dialogue.layout(w, h, safe.bottom);
    this.areaBanner.setPosition(w / 2, safe.top + 34);
    this.toast.setPosition(w / 2, safe.top + 78);
  }

  private advanceDialogue(): void {
    const id = this.dialogue.id;
    if (id === null) return;
    if (!this.dialogue.advance()) {
      inputState.modal = false;
      bus.emit('dialogue-closed', { id });
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
      this.advanceDialogue();
      return;
    }
    if (this.button.contains(p.x, p.y)) return;
    this.downAt.set(pointer.id, { ...p, t: this.time.now });
    if (!this.joystick.active) this.joystick.start(pointer.id, p.x, p.y);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!pointer.isDown) return;
    const p = this.toCss(pointer);
    this.joystick.move(pointer.id, p.x, p.y);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    const down = this.downAt.get(pointer.id);
    this.downAt.delete(pointer.id);
    this.joystick.end(pointer.id);
    if (!down) return;
    const p = this.toCss(pointer);
    const isTap = this.time.now - down.t <= TAP_MAX_MS && Math.hypot(p.x - down.x, p.y - down.y) <= TAP_MAX_MOVE;
    if (isTap) bus.emit('tap', { x: pointer.x, y: pointer.y });
  }
}
