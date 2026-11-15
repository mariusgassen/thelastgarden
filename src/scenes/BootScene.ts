import Phaser from 'phaser';
// Importing this registers its module-level obstacle-interact handler exactly once.
import { startGrowthTicker } from '../systems/plants';
import { gameState } from '../systems/state';
import { generateTextures } from '../world/textures';
import { SCENES } from './keys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  create(): void {
    generateTextures(this);
    gameState.init();
    gameState.startAutosave();
    startGrowthTicker();
    this.scene.start(SCENES.world);
    this.scene.launch(SCENES.ui);
  }
}
