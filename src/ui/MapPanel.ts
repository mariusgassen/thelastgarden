import Phaser from 'phaser';
import { getTravelStops, type TravelStopState } from '../systems/travel';
import { TRAVEL_RIVER } from '../world/travel';
import { THEME } from './theme';
import type { SafeArea } from './viewport';

const PANEL_MAX_W = 460;
const PAD = 20;
const SHEET_TOP = PAD + 36;
const SHEET_ASPECT = 0.72;
const FOOTER_H = 46;
const HIT_RADIUS = 30;
const PARCHMENT = 0xf1e6c8;
const ROUTE = 0x8a603d;

/**
 * "Stadtplan": a modal sheet with every travel stop. Known stops can be tapped (or chosen
 * with the arrow keys and confirmed) to travel there; unknown ones show as "?". Reads state
 * only; travelling is delegated to the scene through `onTravel`.
 */
export class MapPanel {
  private readonly backdrop: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Container;
  private readonly panelBg: Phaser.GameObjects.Graphics;
  private readonly sheet: Phaser.GameObjects.Graphics;
  private readonly closeText: Phaser.GameObjects.Text;
  private readonly footer: Phaser.GameObjects.Text;
  private readonly labels: Phaser.GameObjects.Container;
  private stops: TravelStopState[] = [];
  private selected = -1;
  private panelW = 320;
  private panelH = 200;
  private sheetW = 280;
  private sheetH = 200;
  private open = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly touch: boolean,
    private readonly onOpenChange: (open: boolean) => void,
    private readonly onTravel: (mapId: string) => void,
  ) {
    this.backdrop = scene.add.rectangle(0, 0, 10, 10, 0x000000, 0.45).setOrigin(0).setDepth(95_999).setVisible(false);
    this.panelBg = scene.add.graphics();
    const title = scene.add.text(PAD, PAD - 2, 'Stadtplan', {
      fontFamily: THEME.font,
      fontSize: '20px',
      fontStyle: 'bold',
      color: THEME.sunCss,
    });
    this.closeText = scene.add
      .text(0, PAD - 6, '×', { fontFamily: THEME.font, fontSize: '28px', color: THEME.creamCss })
      .setOrigin(1, 0);
    this.sheet = scene.add.graphics();
    this.labels = scene.add.container(0, 0);
    this.footer = scene.add
      .text(0, 0, '', { fontFamily: THEME.font, fontSize: '13px', color: '#d6cfb6', align: 'center', lineSpacing: 2 })
      .setOrigin(0.5, 0.5);
    this.panel = scene.add
      .container(0, 0, [this.panelBg, title, this.closeText, this.sheet, this.labels, this.footer])
      .setDepth(96_000)
      .setVisible(false);
  }

  get isOpen(): boolean {
    return this.open;
  }

  layout(viewW: number, viewH: number, safe: SafeArea): void {
    this.backdrop.setSize(viewW, viewH);
    const maxH = viewH - safe.top - safe.bottom - 36;
    this.panelW = Math.min(PANEL_MAX_W, Math.max(240, viewW - safe.left - safe.right - 24));
    this.sheetW = this.panelW - PAD * 2;
    this.sheetH = Math.max(120, Math.min(Math.round(this.sheetW * SHEET_ASPECT), maxH - SHEET_TOP - FOOTER_H - PAD));
    this.panelH = SHEET_TOP + this.sheetH + FOOTER_H + PAD;
    this.panel.setPosition(safe.left + (viewW - safe.left - safe.right - this.panelW) / 2, safe.top + 18 + (maxH - this.panelH) / 2);
    this.footer.setWordWrapWidth(this.sheetW, true);
    this.draw();
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
      this.stops = getTravelStops();
      this.selected = this.stops.findIndex((s) => s.current);
      this.draw();
      this.panel.setAlpha(0).setScale(0.96);
      this.scene.tweens.add({ targets: this.panel, alpha: 1, scale: 1, duration: 160, ease: 'Back.easeOut' });
    }
    this.onOpenChange(open);
  }

  /** Pointer handling while the panel is open; returns true if consumed. */
  pointerDown(x: number, y: number): boolean {
    if (!this.open) return false;
    const lx = x - this.panel.x;
    const ly = y - this.panel.y;
    const inside = lx >= 0 && lx <= this.panelW && ly >= 0 && ly <= this.panelH;
    const onClose = lx >= this.panelW - 56 && ly <= 52;
    if (!inside || onClose) {
      this.setOpen(false);
      return true;
    }
    let best = -1;
    let bestDist = HIT_RADIUS;
    this.stops.forEach((s, i) => {
      const p = this.stopPos(s);
      const d = Math.hypot(p.x - lx, p.y - ly);
      if (s.known && d <= bestDist) {
        best = i;
        bestDist = d;
      }
    });
    if (best >= 0) this.choose(best);
    return true;
  }

  /** Keyboard: step through the known stops. */
  moveSelection(dir: 1 | -1): void {
    if (!this.open) return;
    const n = this.stops.length;
    for (let step = 1; step <= n; step++) {
      const i = (((this.selected + dir * step) % n) + n) % n;
      if (this.stops[i].known) {
        this.selected = i;
        this.draw();
        return;
      }
    }
  }

  /** Keyboard: travel to the selected stop, or close if that is where the player already is. */
  confirm(): void {
    if (this.open) this.choose(this.selected);
  }

  private choose(index: number): void {
    const s = this.stops[index];
    if (!s || s.current) {
      this.setOpen(false);
      return;
    }
    this.selected = index;
    this.onTravel(s.stop.mapId);
  }

  private stopPos(s: TravelStopState): { x: number; y: number } {
    return { x: PAD + s.stop.at.x * this.sheetW, y: SHEET_TOP + s.stop.at.y * this.sheetH };
  }

  private draw(): void {
    this.panelBg.clear();
    this.panelBg.fillStyle(0x000000, 0.3);
    this.panelBg.fillRoundedRect(0, 6, this.panelW, this.panelH, 18);
    this.panelBg.fillStyle(THEME.panel, 0.97);
    this.panelBg.fillRoundedRect(0, 0, this.panelW, this.panelH, 18);
    this.panelBg.lineStyle(2, THEME.sun, 0.7);
    this.panelBg.strokeRoundedRect(1, 1, this.panelW - 2, this.panelH - 2, 17);
    this.closeText.setX(this.panelW - PAD + 6);

    const g = this.sheet.clear();
    const at = (p: { x: number; y: number }) => ({ x: PAD + p.x * this.sheetW, y: SHEET_TOP + p.y * this.sheetH });
    g.fillStyle(PARCHMENT, 1);
    g.fillRoundedRect(PAD, SHEET_TOP, this.sheetW, this.sheetH, 10);
    g.lineStyle(1.5, ROUTE, 0.5);
    g.strokeRoundedRect(PAD + 4, SHEET_TOP + 4, this.sheetW - 8, this.sheetH - 8, 7);

    g.lineStyle(6, 0x8fb7c9, 0.75);
    g.beginPath();
    TRAVEL_RIVER.map(at).forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
    g.strokePath();

    // Routes between neighbouring stops: dotted, darker once both ends are known.
    for (let i = 1; i < this.stops.length; i++) {
      const a = this.stopPos(this.stops[i - 1]);
      const b = this.stopPos(this.stops[i]);
      const walked = this.stops[i - 1].known && this.stops[i].known;
      g.fillStyle(ROUTE, walked ? 0.9 : 0.25);
      const dots = Math.max(2, Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 9));
      for (let d = 1; d < dots; d++) g.fillCircle(a.x + ((b.x - a.x) * d) / dots, a.y + ((b.y - a.y) * d) / dots, 1.6);
    }

    this.labels.removeAll(true);
    this.stops.forEach((s, i) => {
      const p = this.stopPos(s);
      if (i === this.selected) {
        g.lineStyle(2.5, THEME.sun, 1);
        g.strokeCircle(p.x, p.y, 15);
      }
      if (s.known) {
        g.fillStyle(s.current ? THEME.sun : THEME.moss, 1);
        g.fillCircle(p.x, p.y, 9);
        g.lineStyle(2, THEME.ink, 0.9);
        g.strokeCircle(p.x, p.y, 9);
      } else {
        g.fillStyle(0xd9c9a0, 1);
        g.fillCircle(p.x, p.y, 8);
        g.lineStyle(1.5, ROUTE, 0.45);
        g.strokeCircle(p.x, p.y, 8);
      }
      this.labels.add(
        this.scene.add
          .text(p.x, p.y + (s.known ? 16 : 0), s.known ? s.stop.name : '?', {
            fontFamily: THEME.font,
            fontSize: '12px',
            fontStyle: 'bold',
            color: s.known ? THEME.inkCss : '#8a7a5c',
          })
          .setOrigin(0.5, s.known ? 0 : 0.5),
      );
    });

    const here = this.stops.find((s) => s.current);
    const picked = this.stops[this.selected];
    const hint = this.touch
      ? 'Tippe auf einen bekannten Ort, um dorthin zu reisen.'
      : 'Klicke einen bekannten Ort an — oder wähle mit den Pfeiltasten und reise mit E.';
    this.footer
      .setText(picked && !picked.current ? `Nach „${picked.stop.name}“ reisen?  E / Leertaste` : here ? `Du bist hier: ${here.stop.name}. ${hint}` : hint)
      .setPosition(this.panelW / 2, SHEET_TOP + this.sheetH + (FOOTER_H + PAD) / 2 - 2);
  }
}
