import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'

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

// App Check (SE-01): localhost exchanges a registered debug token; the deployed site uses
// reCAPTCHA Enterprise. The debug token is read in dev builds only, so it never ships.
const siteKey: string | undefined = import.meta.env.VITE_RECAPTCHA_SITE_KEY || undefined
const debugToken: string | undefined = import.meta.env.DEV ? import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || undefined : undefined
const isLocalhost = ['localhost', '127.0.0.1'].includes(location.hostname)
// reCAPTCHA can't run inside a Chrome extension page, so the extension skips App Check and
// uses on-device AI only (cloud calls there would be rejected by App Check).
const isExtension = location.protocol === 'chrome-extension:'

if (firebaseApp && !isExtension && (siteKey || (isLocalhost && debugToken))) {
  if (isLocalhost && debugToken) {
    ;(self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken
  }
  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaEnterpriseProvider(siteKey ?? 'debug-mode'),
    isTokenAutoRefreshEnabled: true,
  })
}
