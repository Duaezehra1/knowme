import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Builds the same KnowMe app as a Chrome extension side panel (web/dist-extension).
 * Load it at chrome://extensions > Developer mode > Load unpacked.
 */
export default defineConfig(({ mode }) => ({
  // Optional App Check debug token for the judges' build (see src/firebase.ts). It is read from
  // web/.env.local, which is never committed, and only this build ever contains it.
  define: {
    __EXTENSION_APPCHECK_TOKEN__: JSON.stringify(
      loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '').EXTENSION_APPCHECK_TOKEN ?? '',
    ),
  },
  plugins: [react()],
  base: './',
  publicDir: 'extension-public',
  build: {
    outDir: 'dist-extension',
    emptyOutDir: true,
    // Extension pages forbid inline scripts, so skip Vite's inline preload helper.
    modulePreload: false,
    rollupOptions: {
      input: {
        sidepanel: 'sidepanel.html',
        background: 'src/extension/background.ts',
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'),
      },
    },
  },
}))
