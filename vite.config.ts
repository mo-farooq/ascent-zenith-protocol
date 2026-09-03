import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: false
  },
  css: {
    postcss: {}
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/examples/jsm/postprocessing/')) {
            return 'postprocessing-vendor';
          }
          if (id.includes('node_modules/three/')) {
            return 'three-vendor';
          }
        }
      }
    }
  }
});
