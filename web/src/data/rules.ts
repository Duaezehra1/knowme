import shared from '../../../shared/knowme.json'
import type { SectionId } from './types'

/** Sections, situations, emergency phrases, synonyms and prompts are shared with the Android app. */
export interface SectionExample {
  signal: string
  meaning: string
  whatToDo: string
}

export interface SectionInfo {
  id: SectionId
  title: string
  short: string
  icon: string
  question: string
  signalLabel: string
  meaningLabel: string
  whatToDoLabel: string
  examples: SectionExample[]
}

export interface Situation {
  id: string
  icon: string
  label: string
  /** The full question sent to the AI, with {name}. */
  question: string
  query: string
  sections: SectionId[]
  /** Which section colour the tile uses. */
  tone: SectionId
  emergency?: boolean
}

export const SECTIONS = shared.sections as SectionInfo[]
export const SECTION_IDS = SECTIONS.map((s) => s.id)
export const SITUATIONS = shared.situations as Situation[]
export const EMERGENCY_PHRASES: string[] = shared.emergencyPhrases
export const SYNONYM_GROUPS: string[][] = shared.synonyms
export const PROMPTS = shared.prompts

export function sectionInfo(id: SectionId): SectionInfo {
  return SECTIONS.find((s) => s.id === id) ?? SECTIONS[0]
}

export function isSectionId(value: unknown): value is SectionId {
  return typeof value === 'string' && (SECTION_IDS as string[]).includes(value)
}

/** Fills {placeholders} in shared text. */
export function fillPrompt(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match)
}

/** Section text with the child's name filled in. */
export function withName(text: string, name: string): string {
  return fillPrompt(text, { name })
}

/** Default emergency numbers by country, offered during setup (NF-15). */
export const EMERGENCY_NUMBERS: { country: string; label: string; number: string }[] = [
  { country: 'PK', label: 'Pakistan', number: '1122' },
  { country: 'IN', label: 'India', number: '112' },
  { country: 'GB', label: 'United Kingdom', number: '999' },
  { country: 'US', label: 'United States', number: '911' },
  { country: 'CA', label: 'Canada', number: '911' },
  { country: 'AU', label: 'Australia', number: '000' },
  { country: 'AE', label: 'United Arab Emirates', number: '999' },
  { country: 'SA', label: 'Saudi Arabia', number: '997' },
  { country: 'EU', label: 'European Union', number: '112' },
  { country: 'OTHER', label: 'Other (type your number)', number: '112' },
]
