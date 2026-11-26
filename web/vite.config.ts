import { readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Writes /sw.js after each production build with the list of every built file,
 * so the installed app opens and works with no network (SRS OF-01).
 */
function offlineServiceWorker(): Plugin {
  return {
    name: 'knowme-offline-sw',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map'))
      // Files copied from public/ (manifest, icons) are not in the bundle, so list them too.
      // public/downloads (the Android APK and extension zip for judges) is never precached.
      const publicDir = fileURLToPath(new URL('./public', import.meta.url))
      const publicFiles = readdirSync(publicDir, { recursive: true, withFileTypes: true })
        .filter((d) => d.isFile())
        .map((d) => relative(publicDir, join(d.parentPath, d.name)).replace(/\\/g, '/'))
        .filter((f) => !f.startsWith('downloads/'))
      const precache = ['/', ...[...files, ...publicFiles].map((f) => `/${f}`)]
      const version = Date.now().toString(36)
      const source = `// Generated at build time. Precaches the whole app so it works offline.
const CACHE = 'knowme-${version}'
const PRECACHE = ${JSON.stringify(precache)}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('knowme-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  // Only this app's own files are cached; Firebase and Google APIs always go to the network.
  if (url.origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')))
    return
  }
  event.respondWith(caches.match(request).then((hit) => hit || fetch(request)))
})
`
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

export default defineConfig({
  // Only the extension build sets an App Check token (vite.extension.config.ts); the website never has one.
  define: { __EXTENSION_APPCHECK_TOKEN__: JSON.stringify('') },
  plugins: [react(), offlineServiceWorker()],
  server: {
    // The shared rules file (sections, emergency words, prompts) lives one level up.
    fs: { allow: ['..'] },
  },
})
