import { findMatches } from '../ai/search'
import { SECTIONS, type Situation } from './rules'
import type { Entry, Passport, SectionId } from './types'

/** How many of the 8 sections have at least one entry. */
export function completeness(passport: Passport): { filled: number; total: number; next: SectionId | null } {
  const filledIds = new Set(passport.entries.map((e) => e.section))
  const next = SECTIONS.find((s) => !filledIds.has(s.id))?.id ?? null
  return { filled: filledIds.size, total: SECTIONS.length, next }
}

/** The handful of things every carer should know first. */
export function atAGlance(passport: Passport): Entry[] {
  const pick = (section: SectionId, n: number) => passport.entries.filter((e) => e.section === section).slice(0, n)
  return [...pick('medical', 2), ...pick('safety', 1), ...pick('communication', 2), ...pick('calming', 1), ...pick('upsets', 1)]
}

/**
 * Entries for a tapped situation ("Crying or upset"): every entry in its sections,
 * with keyword matches first. Instant and offline, no AI.
 */
export function situationEntries(passport: Passport, situation: Situation, limit = 6): Entry[] {
  const inSections = passport.entries.filter((e) => situation.sections.includes(e.section))
  const ranked = situation.query ? findMatches(situation.query, inSections, inSections.length).map((m) => m.entry) : []
  const rest = inSections
    .filter((e) => !ranked.includes(e))
    .sort((a, b) => situation.sections.indexOf(a.section) - situation.sections.indexOf(b.section))
  return [...ranked, ...rest].slice(0, limit)
}
