import Phaser from 'phaser';
import type { QuestDef } from '../content/types';
import { getActiveQuests, getCompletedQuests, getObjectiveStates, getTrackedObjective } from '../systems/quests';
import { THEME } from './theme';
import type { SafeArea } from './viewport';

const PANEL_MAX_W = 460;
const PAD = 20;
const BUTTON_H = 34;
const BUTTON_MIN_W = 114;

/**
 * Quest HUD: a top-right "Aufgaben" button with an open-quest badge, a one-line tracker
 * (current objective) under the resource bar, and a scrollable modal panel listing active
 * quests with their objectives plus finished quests. Reads quest state only; never mutates it.
 */
export class QuestLog {
  readonly button: Phaser.GameObjects.Container;
  private readonly buttonBg: Phaser.GameObjects.Graphics;
  private readonly buttonText: Phaser.GameObjects.Text;
  private readonly badge: Phaser.GameObjects.Container;
  private readonly badgeText: Phaser.GameObjects.Text;

  private readonly tracker: Phaser.GameObjects.Container;
  private readonly trackerBg: Phaser.GameObjects.Graphics;
  private readonly trackerText: Phaser.GameObjects.Text;

  private readonly backdrop: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Container;
  private readonly panelBg: Phaser.GameObjects.Graphics;
  private readonly panelTitle: Phaser.GameObjects.Text;
  private readonly closeText: Phaser.GameObjects.Text;
  private readonly list: Phaser.GameObjects.Container;
  private readonly listMask: Phaser.GameObjects.Graphics;
  private panelW = 320;
  private panelH = 200;
  private listTop = 0;
  private listViewH = 0;
  private listContentH = 0;
  private scrollY = 0;
  private dragLastY: number | null = null;
  private viewW = 0;
  private viewH = 0;
  private safe: SafeArea = { top: 0, right: 0, bottom: 0, left: 0 };
  private topRowY = 40;
  private trackerH = 0;
  private buttonW = BUTTON_MIN_W;
  private open = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onOpenChange: (open: boolean) => void,
  ) {
    // Button
    this.buttonBg = scene.add.graphics();
    this.buttonText = scene.add
      .text(0, 0, 'Aufgaben', { fontFamily: THEME.font, fontSize: '14px', fontStyle: 'bold', color: THEME.creamCss })
      .setOrigin(1, 0.5);
    this.badgeText = scene.add
      .text(0, 0, '0', { fontFamily: THEME.font, fontSize: '12px', fontStyle: 'bold', color: THEME.inkCss })
      .setOrigin(0.5);
    this.badge = scene.add.container(0, 0, [scene.add.circle(0, 0, 10, THEME.sun), this.badgeText]);
    this.button = scene.add.container(0, 0, [this.buttonBg, this.buttonText, this.badge]).setDepth(90_000);

    // Tracker (top-left anchored so wrapped lines expand downward without hitting ResourceBar)
    this.trackerBg = scene.add.graphics();
    this.trackerText = scene.add
      .text(12, 6, '', {
        fontFamily: THEME.font,
        fontSize: '14px',
        fontStyle: 'bold',
        color: THEME.creamCss,
        lineSpacing: 3,
      })
      .setOrigin(0, 0);
    this.tracker = scene.add.container(0, 0, [this.trackerBg, this.trackerText]).setDepth(90_000);

    // Panel
    this.backdrop = scene.add.rectangle(0, 0, 10, 10, 0x000000, 0.45).setOrigin(0).setDepth(95_999).setVisible(false);
    this.panelBg = scene.add.graphics();
    this.panelTitle = scene.add.text(PAD, PAD - 2, 'Aufgaben', {
      fontFamily: THEME.font,
      fontSize: '20px',
      fontStyle: 'bold',
      color: THEME.sunCss,
    });
    this.closeText = scene.add
      .text(0, PAD - 6, '×', { fontFamily: THEME.font, fontSize: '28px', color: THEME.creamCss })
      .setOrigin(1, 0);
    this.list = scene.add.container(0, 0);
    this.listMask = scene.add.graphics().setVisible(false);
    if (scene.renderer.type === Phaser.WEBGL) {
      this.list.enableFilters().filters?.external.addMask(this.listMask);
    } else {
      this.list.setMask(this.listMask.createGeometryMask());
    }
    this.panel = scene.add
      .container(0, 0, [this.panelBg, this.panelTitle, this.closeText, this.list])
      .setDepth(96_000)
      .setVisible(false);

    this.refresh();
  }

  get isOpen(): boolean {
    return this.open;
  }

  get buttonLeft(): number {
    return this.button.x - this.buttonW;
  }

  get topBarBottom(): number {
    return this.button.y + BUTTON_H / 2;
  }

  get trackerBottom(): number {
    return this.tracker.visible ? this.tracker.y + this.trackerH : this.topBarBottom;
  }

  layout(viewW: number, viewH: number, safe: SafeArea, topRowY = safe.top + 40): void {
    this.viewW = viewW;
    this.viewH = viewH;
    this.safe = safe;
    this.topRowY = topRowY;
    this.button.setPosition(viewW - safe.right - 18, topRowY);
    this.tracker.setPosition(safe.left + 14, this.topBarBottom + 8);
    this.trackerText.setWordWrapWidth(Math.max(160, Math.min(380, viewW - safe.left - safe.right - 52)), true);
    this.backdrop.setSize(viewW, viewH);
    this.panelW = Math.min(PANEL_MAX_W, Math.max(240, viewW - safe.left - safe.right - 24));
    const maxH = viewH - safe.top - safe.bottom - 36;
    this.panelH = Math.min(maxH, this.listContentH + this.listTop + PAD);
    this.listViewH = this.panelH - this.listTop - PAD;
    this.panel.setPosition(safe.left + (viewW - safe.left - safe.right - this.panelW) / 2, safe.top + 18 + (maxH - this.panelH) / 2);
    this.drawPanel();
    this.refreshTracker();
  }

  /** Pointer (CSS px) hit-test for the HUD button. */
  buttonContains(x: number, y: number): boolean {
    const b = this.button;
    return x >= b.x - this.buttonW && x <= b.x + 6 && y >= b.y - BUTTON_H / 2 - 6 && y <= b.y + BUTTON_H / 2 + 6;
  }

  toggle(): void {
    this.setOpen(!this.open);
  }

  setOpen(open: boolean): void {
    if (this.open === open) return;
    this.open = open;
    this.backdrop.setVisible(open);
    this.panel.setVisible(open);
    if (open) {
      this.refresh();
      this.scrollY = 0;
      this.applyScroll();
      this.panel.setAlpha(0).setScale(0.96);
      this.scene.tweens.add({ targets: this.panel, alpha: 1, scale: 1, duration: 160, ease: 'Back.easeOut' });
    } else {
      this.refreshTracker();
    }
    this.onOpenChange(open);
  }

  /** Pointer handling while the panel is open; returns true if consumed. */
  pointerDown(x: number, y: number): boolean {
    if (!this.open) return false;
    const inside = x >= this.panel.x && x <= this.panel.x + this.panelW && y >= this.panel.y && y <= this.panel.y + this.panelH;
    const onClose = x >= this.panel.x + this.panelW - 56 && y <= this.panel.y + 52;
    if (!inside || onClose) {
      this.setOpen(false);
      return true;
    }
    this.dragLastY = y;
    return true;
  }

  pointerMove(y: number): void {
    if (!this.open || this.dragLastY === null) return;
    this.scrollBy(this.dragLastY - y);
    this.dragLastY = y;
  }

  pointerUp(): void {
    this.dragLastY = null;
  }

  scrollBy(dy: number): void {
    const max = Math.max(0, this.listContentH - this.listViewH);
    this.scrollY = Phaser.Math.Clamp(this.scrollY + dy, 0, max);
    this.applyScroll();
  }

  refresh(): void {
    this.rebuildList();
    if (this.viewW > 0) this.layout(this.viewW, this.viewH, this.safe, this.topRowY);
    const openCount = getActiveQuests().length;
    this.badge.setVisible(openCount > 0);
    this.badgeText.setText(String(openCount));
    this.buttonBg.clear();
    const w = openCount > 0 ? Math.max(BUTTON_MIN_W, Math.ceil(this.buttonText.width) + 48) : Math.max(102, Math.ceil(this.buttonText.width) + 28);
    this.buttonW = w;
    this.buttonBg.fillStyle(THEME.panel, THEME.panelAlpha * 0.85);
    this.buttonBg.fillRoundedRect(-w, -BUTTON_H / 2, w + 4, BUTTON_H, BUTTON_H / 2);
    this.buttonText.setPosition(-14, 0);
    this.badge.setPosition(-w + 17, 0);
  }

  private refreshTracker(): void {
    const tracked = getTrackedObjective();
    this.trackerBg.clear();
    if (!tracked || this.open) {
      this.tracker.setVisible(false);
      this.trackerH = 0;
      return;
    }
    this.tracker.setVisible(true);
    this.trackerText.setText(`▸ ${tracked.objective.description}`);
    const w = this.trackerText.width + 24;
    this.trackerH = this.trackerText.height + 12;
    this.trackerBg.fillStyle(THEME.panel, THEME.panelAlpha * 0.75);
    this.trackerBg.fillRoundedRect(0, 0, w, this.trackerH, 10);
  }

  private rebuildList(): void {
    this.list.removeAll(true);
    const width = this.panelW - PAD * 2;
    let y = 0;
    const add = (text: string, style: Phaser.Types.GameObjects.Text.TextStyle, x = 0): Phaser.GameObjects.Text => {
      const t = this.scene.add.text(x, y, text, { fontFamily: THEME.font, ...style }).setWordWrapWidth(width - x, true);
      this.list.add(t);
      y += t.height;
      return t;
    };

    const active = getActiveQuests();
    if (active.length === 0) {
      add('Keine offenen Aufgaben. Sieh dich im Garten um.', { fontSize: '15px', color: THEME.creamCss });
      y += 8;
    }
    active.forEach((quest: QuestDef, i) => {
      if (i > 0) y += 14;
      add(quest.title, { fontSize: '17px', fontStyle: 'bold', color: THEME.sunCss });
      y += 2;
      add(quest.summary, { fontSize: '13px', color: '#d6cfb6', lineSpacing: 2 });
      y += 6;
      for (const { objective, done } of getObjectiveStates(quest.id)) {
        const t = add(`${done ? '✓' : '○'}  ${objective.description}`, {
          fontSize: '15px',
          color: done ? '#9fb98a' : THEME.creamCss,
          lineSpacing: 2,
        });
        if (done) t.setAlpha(0.7);
        y += 4;
      }
    });

    const completed = getCompletedQuests();
    if (completed.length > 0) {
      y += 18;
      add('Erledigt', { fontSize: '13px', fontStyle: 'bold', color: '#9fb98a' });
      y += 4;
      for (const quest of completed.slice().reverse()) {
        add(`✓  ${quest.title}`, { fontSize: '14px', color: '#b8c7a6' });
        y += 3;
      }
    }
    this.listContentH = y + 4;
    this.listTop = PAD + 36;
  }

  private drawPanel(): void {
    this.panelBg.clear();
    this.panelBg.fillStyle(0x000000, 0.3);
    this.panelBg.fillRoundedRect(0, 6, this.panelW, this.panelH, 18);
    this.panelBg.fillStyle(THEME.panel, 0.97);
    this.panelBg.fillRoundedRect(0, 0, this.panelW, this.panelH, 18);
    this.panelBg.lineStyle(2, THEME.sun, 0.7);
    this.panelBg.strokeRoundedRect(1, 1, this.panelW - 2, this.panelH - 2, 17);
    this.panelBg.lineStyle(1, THEME.cream, 0.15);
    this.panelBg.lineBetween(PAD, this.listTop - 8, this.panelW - PAD, this.listTop - 8);
    this.closeText.setX(this.panelW - PAD + 6);
    this.list.setPosition(PAD, this.listTop);
    this.listMask.clear();
    this.listMask.fillStyle(0xffffff);
    this.listMask.fillRect(this.panel.x, this.panel.y + this.listTop, this.panelW, this.listViewH);
    this.applyScroll();
  }

  private applyScroll(): void {
    this.list.setY(this.listTop - this.scrollY);
  }
}
