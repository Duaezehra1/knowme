import { Schema } from 'firebase/ai'
import { fillPrompt, isSectionId, PROMPTS, SECTION_IDS } from '../data/rules'
import type { Passport, Proposal } from '../data/types'
import { generateJson, type Route } from './model'
import { makeRedactor } from './redact'
import { normalize, quoteIsInNotes } from './search'

/** Turns the parent's own words into proposed entries (FR-05), each needing approval (FR-06). */

export const organizeSchema = Schema.object({
  properties: {
    entries: Schema.array({
      items: Schema.object({
        properties: {
          section: Schema.enumString({ enum: SECTION_IDS }),
          signal: Schema.string(),
          meaning: Schema.string(),
          whatToDo: Schema.string(),
          quote: Schema.string(),
        },
      }),
    }),
  },
})

interface RawEntry {
  section?: string
  signal?: string
  meaning?: string
  whatToDo?: string
  quote?: string
}

/** Gemini Nano has a small context and is slow on CPU laptops, so notes go in short chunks. */
// About 500 characters per call: on a CPU-only laptop the first suggestions arrive in about a minute
// instead of four, and a long reply can't run away.
export function chunkNotes(notes: string, maxChars = 500): string[] {
  const paragraphs = notes
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  const chunks: string[] = []
  let current = ''
  for (const p of paragraphs) {
    if (current && current.length + p.length > maxChars) {
      chunks.push(current)
      current = ''
    }
    // A single very long paragraph is split on sentence ends.
    if (p.length > maxChars) {
      for (const piece of p.match(new RegExp(`[^]{1,${maxChars}}(?=\\s|$)`, 'g')) ?? [p]) chunks.push(piece.trim())
      continue
    }
    current = current ? `${current}\n\n${p}` : p
  }
  if (current) chunks.push(current)
  return chunks
}

export interface OrganizeProgress {
  chunk: number
  chunks: number
}

/**
 * Organises notes chunk by chunk and reports each valid proposal as soon as it is ready.
 * Guardrail: a proposal whose quote is not in the owner's words is dropped.
 */
export async function organizeNotes(
  passport: Passport,
  notes: string,
  route: Route,
  onProposal: (p: Proposal) => void,
  onProgress: (p: OrganizeProgress) => void,
  isCancelled: () => boolean,
): Promise<{ kept: number; dropped: number }> {
  const redactor = route === 'cloud' ? makeRedactor(passport) : null
  const name = redactor ? '[CHILD]' : passport.child.firstName
  const seen = new Set(passport.entries.map((e) => normalize(e.signal)))
  const chunks = chunkNotes(notes)
  let kept = 0
  let dropped = 0

  for (let i = 0; i < chunks.length; i++) {
    if (isCancelled()) break
    onProgress({ chunk: i + 1, chunks: chunks.length })
    const text = redactor ? redactor.redact(chunks[i]) : chunks[i]
    const prompt = fillPrompt(PROMPTS.organize, { name, notes: text })
    let raw: RawEntry[] = []
    try {
      const { data } = await generateJson<{ entries?: RawEntry[] }>(route, organizeSchema, 'organize', prompt)
      raw = data.entries ?? []
    } catch (e) {
      // One bad chunk should not lose the rest; the owner can still add entries by hand.
      console.warn('Organise failed for a chunk', e)
      continue
    }
    for (const r of raw) {
      if (isCancelled()) break
      const restore = (s?: string) => (redactor ? redactor.restore(s ?? '') : (s ?? '')).trim()
      const signal = restore(r.signal)
      const quote = r.quote?.trim() ?? ''
      const key = normalize(signal)
      if (!isSectionId(r.section) || !signal || !quote || !quoteIsInNotes(quote, text) || seen.has(key)) {
        dropped++
        continue
      }
      seen.add(key)
      kept++
      onProposal({
        key: crypto.randomUUID(),
        section: r.section,
        signal,
        meaning: restore(r.meaning),
        whatToDo: restore(r.whatToDo),
        quote: restore(quote),
      })
    }
  }
  return { kept, dropped }
}
