/** Mirrors the passport schema in the SRS (section 10). The Android app uses the same shape. */

export type SectionId = 'communication' | 'calming' | 'upsets' | 'likes' | 'pain' | 'medical' | 'routine' | 'safety'

export type EntrySource = 'owner' | 'ai-approved' | 'carer-suggested'

export interface Entry {
  id: string
  section: SectionId
  /** What a carer sees or hears, or the fact itself. */
  signal: string
  /** What it usually means (communication and pain). */
  meaning: string
  /** What helps. */
  whatToDo: string
  source: EntrySource
  /** The owner's original words an AI-made entry came from. */
  quote?: string
  updatedAt: string
}

export interface Contact {
  id: string
  name: string
  relation: string
  phone: string
  primary: boolean
}

export interface Settings {
  /** Devices without on-device AI may send de-identified entries to cloud Gemini (FR-26). Off by default. */
  cloudHelp: boolean
  emergencyNumber: string
  country: string
}

export interface EmergencyCard {
  text: string
}

export interface Passport {
  id: string
  schemaVersion: 1
  version: number
  updatedAt: string
  child: {
    firstName: string
    age?: number
    aboutMe?: string
    /** Picture and colour ("bus:gold"), used when there is no photo. */
    avatar?: string
    /** Small JPEG data URL, stored on this device only. Helps a carer recognise the child. */
    photo?: string
  }
  entries: Entry[]
  contacts: Contact[]
  emergencyCard: EmergencyCard
  settings: Settings
  /** The ready-made fictional child from "Try a demo child". */
  demo?: boolean
}

/** An AI suggestion waiting for the owner's approval (FR-06). */
export interface Proposal {
  key: string
  section: SectionId
  signal: string
  meaning: string
  whatToDo: string
  quote: string
}

/** Where an answer came from, shown on every answer (FR-13). */
export type AnswerSource = 'on_device' | 'in_cloud' | 'offline_search'
