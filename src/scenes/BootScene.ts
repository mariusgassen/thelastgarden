import Phaser from 'phaser';
// Importing this registers its module-level obstacle-interact handler exactly once.
import { startAnimals } from '../systems/animals';
import { startBlightScheduler } from '../systems/blight';
import { startMachineTicker } from '../systems/machines';
import { startGrowthTicker } from '../systems/plants';
import { hideAppLoader, showBootError } from '../systems/pwa';
import { startNightScheduler } from '../systems/nightEvents';
import { startQuestRuntime } from '../systems/quests';
import { gameState } from '../systems/state';
import { generateTextures } from '../world/textures';
import { SCENES } from './keys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  create(): void {
    try {
      generateTextures(this);
      gameState.init();
      gameState.startAutosave();
      startGrowthTicker();
      startQuestRuntime();
      startNightScheduler();
      startBlightScheduler();
      startAnimals();
      startMachineTicker();
      this.scene.start(SCENES.world);
      this.scene.launch(SCENES.ui);
      hideAppLoader();
    } catch (err) {
      console.error('[boot] failed to initialize game', err);
      showBootError(err);
    }
  }
}
