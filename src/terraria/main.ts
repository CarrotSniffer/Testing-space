import { Game } from './game';

const glCanvas = document.getElementById('game-gl') as HTMLCanvasElement;
const uiCanvas = document.getElementById('game-ui') as HTMLCanvasElement;

const game = new Game(glCanvas, uiCanvas);
game.init();
game.start();
