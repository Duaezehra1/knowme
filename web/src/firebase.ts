import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app'
import { CustomProvider, initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'

// Values come from web/.env.local (see .env.example).
const config: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseApp: FirebaseApp | null = config.apiKey && config.projectId ? initializeApp(config) : null

/** Set only by the extension build (vite.extension.config.ts); always empty on the website. */
declare const __EXTENSION_APPCHECK_TOKEN__: string

export const isExtension = location.protocol === 'chrome-extension:'

// App Check (SE-01):
// - Website: reCAPTCHA Enterprise. Localhost exchanges a registered debug token (dev builds only).
// - Extension: reCAPTCHA can't run in extension pages, so the judges' extension build carries one
//   registered debug token from web/.env.local (never committed). Without it, the extension uses
//   on-device AI only, because App Check would reject its cloud calls.
const siteKey: string | undefined = import.meta.env.VITE_RECAPTCHA_SITE_KEY || undefined
const debugToken: string | undefined = import.meta.env.DEV ? import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || undefined : undefined
const extensionToken: string | undefined = isExtension ? __EXTENSION_APPCHECK_TOKEN__ || undefined : undefined
const isLocalhost = ['localhost', '127.0.0.1'].includes(location.hostname)

function useDebugToken(token: string) {
  ;(self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN = token
}

if (firebaseApp && isExtension && extensionToken) {
  useDebugToken(extensionToken)
  // In debug mode App Check only uses the debug token, so this provider is never asked for one.
  initializeAppCheck(firebaseApp, {
    provider: new CustomProvider({ getToken: () => Promise.reject(new Error('The extension uses its debug token.')) }),
    isTokenAutoRefreshEnabled: true,
  })
} else if (firebaseApp && !isExtension && (siteKey || (isLocalhost && debugToken))) {
  if (isLocalhost && debugToken) useDebugToken(debugToken)
  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaEnterpriseProvider(siteKey ?? 'debug-mode'),
    isTokenAutoRefreshEnabled: true,
  })
}

/** Cloud AI needs App Check, so an extension without a registered token never tries it. */
export const cloudAvailable = firebaseApp !== null && (!isExtension || extensionToken !== undefined)

/** An extension that can only use on-device AI: it explains why and links to the website. */
export const deviceOnly = isExtension && !cloudAvailable

/** The hosted web app, where cloud answers work on any device. */
export const WEB_APP_URL = 'https://knowme-passport.web.app'
