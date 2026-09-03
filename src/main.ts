import { Game } from './core/Game';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element #game-canvas not found!');
    return;
  }

  // Initialize Game
  const game = new Game(canvas);

  // Expose to window for debugging if needed
  (window as unknown as { game: Game }).game = game;
});
