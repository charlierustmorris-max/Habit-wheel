import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Builds the app as one self-contained file you can open straight from disk.
 * IIFE rather than ES modules, because a module script will not run over file://.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-single',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        assetFileNames: 'app.[ext]',
      },
    },
  },
});
