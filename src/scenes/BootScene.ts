import Phaser from 'phaser';
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
    this.scene.start(SCENES.world);
    this.scene.launch(SCENES.ui);
  }
}
