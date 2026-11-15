import Phaser from 'phaser';
import { content } from './content';
import { BootScene } from './scenes/BootScene';
import { UIScene } from './scenes/UIScene';
import { WorldScene } from './scenes/WorldScene';
import { bus } from './systems/events';
import { getObstacles, isBlocked, unblockPath } from './systems/obstacles';
import { registerServiceWorker } from './systems/pwa';
import { gameState } from './systems/state';
import { cssViewportSize, DPR } from './ui/viewport';

const initial = cssViewportSize();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1f2e1d',
  scale: {
    mode: Phaser.Scale.NONE,
    width: initial.width * DPR,
    height: initial.height * DPR,
    zoom: 1 / DPR,
  },
  physics: { default: 'arcade', arcade: { debug: false } },
  input: { activePointers: 3 },
  render: { antialias: true, pixelArt: false },
  scene: [BootScene, WorldScene, UIScene],
});

function resize(): void {
  const { width, height } = cssViewportSize();
  game.scale.resize(width * DPR, height * DPR);
  game.scale.setZoom(1 / DPR);
}
window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);

registerServiceWorker();

if (import.meta.env.DEV) {
  // Debug handle for manual testing in the browser console.
  Object.assign(window, { __tlg: { game, gameState, bus, content, unblockPath, isBlocked, getObstacles } });
}
