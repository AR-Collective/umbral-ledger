import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// "npm run build" makes a normal static site in dist/ (good for GitHub Pages or itch.io).
// "npm run build:single" makes ONE html file in dist-single/ with everything inlined,
// which is handy for sending the game to a judge or opening it without a server.
export default defineConfig(({ mode }) => ({
  base: './',
  server: { port: 5173, open: false },
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 4000,
  },
  plugins: mode === 'single' ? [viteSingleFile()] : [],
}));
