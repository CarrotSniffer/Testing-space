import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/Testing-space/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        minicity: resolve(__dirname, 'games/minicity/index.html'),
        'new-game': resolve(__dirname, 'games/new-game/index.html'),
        'fortune-engine': resolve(__dirname, 'games/fortune-engine/index.html'),
      },
    },
  },
});
