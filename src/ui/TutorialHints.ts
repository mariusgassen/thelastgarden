import Phaser from 'phaser';
import { content } from '../content';
import { bus } from '../systems/events';
import { hasHorse, HORSE_FLAG } from '../systems/horse';
import { inputState } from '../systems/input';
import { gameState } from '../systems/state';
import { hasTravelMap, TRAVEL_MAP_FLAG } from '../systems/travel';
import { THEME } from './theme';

interface TutorialExt {
  seen: string[];
}

interface Hint {
  id: string;
  text: string;
  /** Auto-dismiss after this many ms (default 10 s). */
  ttlMs?: number;
}

const MOVE_HOLD_MS = 700;

/**
 * Unobtrusive one-time hints (movement, interaction, seeds, planting, quest log). Each id is
 * shown once per save (`ext.tutorial.seen`); hints queue if one is already visible.
 */
export class TutorialHints {
  private readonly container: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;
  private readonly queue: Hint[] = [];
  private current: Hint | null = null;
  private ttlTimer: Phaser.Time.TimerEvent | null = null;
  private moveHeldMs = 0;
  private keysDown = 0;
  private viewW = 0;
  private centerX = 0;
  private maxW = 380;
  private y = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    touch: boolean,
    private readonly onBeforeShow?: () => void,
  ) {
    const kb = scene.input.keyboard;
    kb?.on('keydown', (e: KeyboardEvent) => {
      if (!e.repeat) this.keysDown++;
    });
    kb?.on('keyup', () => (this.keysDown = Math.max(0, this.keysDown - 1)));
    this.bg = scene.add.graphics();
    this.text = scene.add
      .text(0, 0, '', { fontFamily: THEME.font, fontSize: '15px', color: THEME.creamCss, align: 'center', lineSpacing: 4 })
      .setOrigin(0.5);
    this.container = scene.add.container(0, 0, [this.bg, this.text]).setDepth(94_000).setAlpha(0);

    this.enqueue({
      id: 'move',
      text: touch ? 'Lege einen Finger auf den Bildschirm und ziehe, um zu gehen.' : 'Bewegen: WASD oder Pfeiltasten.',
      ttlMs: 20_000,
    });
    bus.onScene(scene, 'interaction-focus', (f) => {
      if (f) {
        this.enqueue({
          id: 'interact',
          text: touch ? 'Tippe auf das Objekt oder auf den Knopf unten rechts.' : 'E oder Leertaste: interagieren.',
          ttlMs: 12_000,
        });
      }
    });
    bus.onScene(scene, 'interacted', () => this.dismiss('interact'));
    bus.onScene(scene, 'inventory-changed', ({ itemId, count }) => {
      if (count > 0 && content.items.find(itemId)?.category === 'seed') {
        this.enqueue({ id: 'seed', text: 'Samen! Pflanze sie auf ein freies Beet — die dunkle Erde im Hauptgarten.', ttlMs: 12_000 });
      }
    });
    bus.onScene(scene, 'inventory-changed', ({ itemId, count }) => {
      if (count <= 0) return;
      if (content.items.find(itemId)?.category === 'produce') {
        this.enqueue({
          id: 'inventory',
          text: touch
            ? 'Tippe auf die Leiste oben links, um in deinen Beutel zu sehen.'
            : 'Taste I oder ein Klick auf die Leiste oben links öffnet deinen Beutel.',
          ttlMs: 10_000,
        });
      } else if (itemId === 'pocket-workbench') {
        this.enqueue({
          id: 'pocket-workbench',
          text: touch
            ? 'Die Werkzeugrolle ist deine Werkbank für unterwegs: Beutel öffnen und „Werkeln“ antippen.'
            : 'Die Werkzeugrolle ist deine Werkbank für unterwegs: Taste C, oder im Beutel „Werkeln“.',
          ttlMs: 12_000,
        });
      }
    });
    // Also on load, so saves from before these features learn about them.
    const mapHint = () =>
      this.enqueue({
        id: 'travel-map',
        text: touch
          ? 'Der Stadtplan ist abgezeichnet: Der Kartenknopf unten rechts bringt dich schnell an Orte, die du schon kennst.'
          : 'Der Stadtplan ist abgezeichnet: Taste M oder der Kartenknopf unten rechts bringt dich schnell an Orte, die du schon kennst.',
        ttlMs: 14_000,
      });
    const horseHint = () =>
      this.enqueue({
        id: 'riding',
        text: touch
          ? 'Mohn begleitet dich jetzt. Der Hufeisenknopf unten rechts lässt dich auf- und absteigen.'
          : 'Mohn begleitet dich jetzt. Taste R oder der Hufeisenknopf unten rechts lässt dich auf- und absteigen.',
        ttlMs: 14_000,
      });
    if (hasTravelMap()) mapHint();
    if (hasHorse()) horseHint();
    bus.onScene(scene, 'flag-changed', ({ key, value }) => {
      if (key === TRAVEL_MAP_FLAG && value) mapHint();
      if (key === HORSE_FLAG && value) horseHint();
    });
    bus.onScene(scene, 'plant-planted', () => {
      this.dismiss('seed');
      this.enqueue({ id: 'planted', text: 'Pflanzen brauchen Zeit. Schau später wieder vorbei — und achte nachts auf deine Beete.', ttlMs: 8_000 });
    });
    bus.onScene(scene, 'quest-started', () => {
      this.enqueue({
        id: 'quests',
        text: touch ? 'Deine Aufgaben findest du oben rechts.' : 'Deine Aufgaben findest du oben rechts (Taste Q).',
        ttlMs: 8_000,
      });
    });
  }

  get height(): number {
    return this.current ? this.text.height + 20 : 0;
  }

  layout(viewW: number, y: number, centerX = viewW / 2, maxWidth = viewW - 48): void {
    this.viewW = viewW;
    this.centerX = centerX;
    this.maxW = Math.min(380, Math.max(180, maxWidth));
    this.y = y;
    this.text.setWordWrapWidth(this.maxW - 36, true);
    this.redraw();
    if (this.current) {
      this.scene.tweens.killTweensOf(this.container);
      this.container.setAlpha(1);
    }
  }

  setTopY(topY: number): void {
    this.y = topY + (this.text.height + 20) / 2;
    this.container.setPosition(this.centerX, this.y);
  }

  /** Call every frame with the frame delta; dismisses the movement hint once the player walked a bit. */
  update(deltaMs: number): void {
    if (this.current?.id !== 'move') return;
    if (this.keysDown > 0 || Math.hypot(inputState.moveX, inputState.moveY) > 0.2) this.moveHeldMs += deltaMs;
    if (this.moveHeldMs >= MOVE_HOLD_MS) this.dismiss('move');
  }

  private seen(): TutorialExt {
    return gameState.getExt<TutorialExt>('tutorial', { seen: [] });
  }

  private markSeen(id: string): void {
    const ext = this.seen();
    if (ext.seen.includes(id)) return;
    ext.seen.push(id);
    gameState.setExt('tutorial', ext);
  }

  private enqueue(hint: Hint): void {
    if (this.seen().seen.includes(hint.id)) return;
    if (this.current?.id === hint.id || this.queue.some((h) => h.id === hint.id)) return;
    this.queue.push(hint);
    if (!this.current) this.showNext();
  }

  private showNext(): void {
    const next = this.queue.shift();
    if (!next) return;
    this.current = next;
    this.markSeen(next.id);
    this.text.setText(next.text);
    this.redraw();
    this.onBeforeShow?.();
    this.scene.tweens.killTweensOf(this.container);
    this.container.setAlpha(0).setY(this.y + 8);
    this.scene.tweens.add({ targets: this.container, alpha: 1, y: this.y, duration: 260, ease: 'Sine.easeOut' });
    this.ttlTimer?.remove();
    this.ttlTimer = this.scene.time.delayedCall(next.ttlMs ?? 10_000, () => this.dismiss(next.id));
  }

  private dismiss(id: string): void {
    if (this.current?.id !== id) {
      const i = this.queue.findIndex((h) => h.id === id);
      if (i >= 0) this.queue.splice(i, 1);
      return;
    }
    this.current = null;
    this.ttlTimer?.remove();
    this.ttlTimer = null;
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 300,
      onComplete: () => this.scene.time.delayedCall(400, () => this.showNext()),
    });
  }

  private redraw(): void {
    const w = this.text.width + 36;
    const h = this.text.height + 20;
    this.bg.clear();
    this.bg.fillStyle(THEME.panel, THEME.panelAlpha * 0.9);
    this.bg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    this.bg.lineStyle(1.5, THEME.sun, 0.45);
    this.bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    this.container.setPosition(this.centerX || this.viewW / 2, this.y);
  }
}
