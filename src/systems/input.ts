/**
 * Shared input state between the HUD (joystick, context button) and the world.
 * The UI writes, WorldScene reads. Keyboard input is merged in by the player controller.
 */
class InputState {
  /** Analog move vector from the virtual joystick, each axis -1..1, magnitude <= 1. */
  moveX = 0;
  moveY = 0;
  /** True while a modal UI (dialogue) is open: movement is frozen, interact advances the UI. */
  modal = false;
  /** CSS px of the bottom edge a HUD bar (build or tool bar) covers; the camera may scroll that far past the map. */
  bottomInset = 0;
  private interactQueued = false;

  setMove(x: number, y: number): void {
    this.moveX = x;
    this.moveY = y;
  }

  requestInteract(): void {
    this.interactQueued = true;
  }

  /** Returns true once per queued interact request. */
  consumeInteract(): boolean {
    const queued = this.interactQueued;
    this.interactQueued = false;
    return queued;
  }
}

export const inputState = new InputState();
