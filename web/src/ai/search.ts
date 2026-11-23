import { EMERGENCY_PHRASES, SYNONYM_GROUPS, sectionInfo } from '../data/rules'
import type { Entry } from '../data/types'

/**
 * Retrieval and emergency detection in plain code: instant, offline and explainable
 * (SRS section 6). No AI is involved here.
 */

const STOPWORDS = new Set(
  'a an the and or but if then so to of in on at by for with from is are was were be been being it its this that these those he she they him her them his hers their i me my we our you your what why how when where who which do does did doing has have had not no yes very just can will would should could keeps keep get gets got going goes'.split(
    ' ',
  ),
)

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** "hitting" -> "hit", "running" -> "run": drop the doubled consonant left after the suffix. */
function undouble(word: string): string {
  return /([b-df-hj-np-tv-z])\1$/.test(word) ? word.slice(0, -1) : word
}

function stem(word: string): string {
  if (word.length > 5 && word.endsWith('ing')) return undouble(word.slice(0, -3))
  if (word.length > 4 && word.endsWith('ed')) return undouble(word.slice(0, -2))
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

export function tokens(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem)
}

const SYNONYMS: Map<string, Set<string>> = (() => {
  const map = new Map<string, Set<string>>()
  for (const group of SYNONYM_GROUPS) {
    const stems = group.flatMap((phrase) => tokens(phrase))
    for (const s of stems) {
      const set = map.get(s) ?? new Set<string>()
      stems.forEach((x) => set.add(x))
      map.set(s, set)
    }
  }
  return map
})()

function expand(words: string[]): Set<string> {
  const out = new Set<string>()
  for (const w of words) {
    out.add(w)
    SYNONYMS.get(w)?.forEach((s) => out.add(s))
  }
  return out
}

/** True when the carer's words describe an emergency (FR-12). Checked before any AI. */
export function isEmergency(question: string): boolean {
  const text = ` ${normalize(question)} `
  return EMERGENCY_PHRASES.some((phrase) => text.includes(` ${normalize(phrase)} `) || text.includes(` ${normalize(phrase)}`))
}

export interface ScoredEntry {
  entry: Entry
  score: number
}

/** Scores every entry against the question; signal words count most. */
export function findMatches(question: string, entries: Entry[], limit = 5): ScoredEntry[] {
  const asked = tokens(question)
  if (asked.length === 0) return []
  const wanted = expand(asked)
  const direct = new Set(asked)
  const scored = entries.map((entry) => {
    let score = 0
    const fields: [string, number][] = [
      [entry.signal, 3],
      [entry.meaning, 2],
      [entry.whatToDo, 1],
      [sectionInfo(entry.section).title, 1],
    ]
    for (const [text, weight] of fields) {
      for (const word of new Set(tokens(text))) {
        if (direct.has(word)) score += weight * 1.5
        else if (wanted.has(word)) score += weight
      }
    }
    // A short exact phrase from the question (e.g. "ba ba") is a strong signal.
    const q = normalize(question)
    if (entry.signal && q.length > 3 && normalize(entry.signal).includes(q)) score += 6
    return { entry, score }
  })
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** True when a quote the AI gave really comes from the owner's notes (organise guardrail). */
export function quoteIsInNotes(quote: string, notes: string): boolean {
  const q = normalize(quote)
  if (q.length < 6) return false
  const n = normalize(notes)
  if (n.includes(q)) return true
  // Allow small differences (punctuation, a dropped word): 80% of the quote's words in order.
  const qWords = q.split(' ')
  const nWords = n.split(' ')
  let i = 0
  for (const w of nWords) {
    if (w === qWords[i]) i++
    if (i === qWords.length) break
  }
  return i / qWords.length >= 0.8
}
