import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 720;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#f3f4f6',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 0.35 },
      debug: false,
    },
  },
  scene: [GameScene],
};

new Phaser.Game(config);
