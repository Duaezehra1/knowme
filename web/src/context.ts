import type { DeviceStatus } from './ai/model'
import type { Passport } from './data/types'

/** What every screen gets from the app shell. */
export interface AppContext {
  passport: Passport
  /** Applies a change and saves it on the device before the screen updates. */
  update: (change: (p: Passport) => Passport) => Promise<void>
  /** Swaps the whole passport (import, delete). */
  replacePassport: (p: Passport | null) => void
  navigate: (path: string) => void
  route: string
  online: boolean
  status: DeviceStatus
  refreshStatus: () => void
  /** A short confirmation such as "Saved". */
  toast: (message: string) => void
  /** Carer mode: a simple read-and-ask view to hand the phone to someone else. */
  carerMode: boolean
  setCarerMode: (on: boolean) => void
}
