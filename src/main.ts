import Phaser from 'phaser';
import { content } from './content';
import { SCENES } from './scenes/keys';
import { BootScene } from './scenes/BootScene';
import { UIScene } from './scenes/UIScene';
import { WorldScene } from './scenes/WorldScene';
import { bus } from './systems/events';
import { getObstacles, isBlocked, unblockPath } from './systems/obstacles';
import {
  debugRewindGrowth,
  getAllPlantedBeds,
  getBedState,
  hasAbility,
  isBedMature,
  plantSeed,
} from './systems/plants';
import { FEET_OFFSET_Y } from './systems/player';
import { registerServiceWorker } from './systems/pwa';
import { collectNode, getResourceNodes } from './systems/resources';
import { gameState } from './systems/state';
import { cssViewportSize, DPR } from './ui/viewport';
import { TILE_SIZE } from './world/tiles';

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
  Object.assign(window, {
    __tlg: {
      game,
      gameState,
      bus,
      content,
      unblockPath,
      isBlocked,
      getObstacles,
      // Plant abilities (Wave 2):
      plantSeed,
      getBedState,
      isBedMature,
      hasAbility,
      getAllPlantedBeds,
      debugRewindGrowth,
      getResourceNodes,
      collectNode,
      give: (itemId: string, n = 1) => gameState.addItem(itemId, n),
      teleport: (tileX: number, tileY: number) => {
        const world = game.scene.getScene(SCENES.world) as WorldScene;
        world.player.sprite.setPosition(tileX * TILE_SIZE, tileY * TILE_SIZE - FEET_OFFSET_Y);
      },
    },
  });
}
