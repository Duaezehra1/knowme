import { Schema } from 'firebase/ai'
import { fillPrompt, isSectionId, PROMPTS, SECTION_IDS } from '../data/rules'
import type { Passport, Proposal } from '../data/types'
import { CLOUD_BACKUP_AFTER_MS, cloudAllowed, generateJson, type Route } from './model'
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
  /** Parts of the notes already read. */
  done: number
  chunks: number
  /** Where the notes are being read right now. */
  route: Route
  /** Set once the cloud took over because Gemini Nano was slow or failed. */
  backup?: 'slow' | 'failed'
}

export interface OrganizeResult {
  kept: number
  /** Suggestions left out because their quote was not in the owner's words. */
  dropped: number
  /** Suggestions left out because the passport already has them. */
  duplicates: number
}

/**
 * Cloud parts run side by side: each takes about 4 seconds, so a page of notes takes about
 * 4 seconds instead of 4 seconds per part. Small enough for the free tier's request limits.
 */
const CLOUD_PARALLEL = 4

interface ChunkReply {
  raw: RawEntry[]
  /** The text the model saw (names removed in the cloud), for the quote check. */
  text: string
  restore: (s?: string) => string
}

async function organizeChunk(passport: Passport, chunk: string, route: Route): Promise<ChunkReply> {
  const redactor = route === 'cloud' ? makeRedactor(passport) : null
  const text = redactor ? redactor.redact(chunk) : chunk
  const prompt = fillPrompt(PROMPTS.organize, { name: redactor ? '[CHILD]' : passport.child.firstName, notes: text })
  const { data } = await generateJson<{ entries?: RawEntry[] }>(
    route,
    organizeSchema,
    'organize',
    prompt,
    `{"entries": [{"section": one of ${SECTION_IDS.join(' | ')}, "signal": string, "meaning": string, "whatToDo": string, "quote": string}]}`,
  )
  return { raw: data.entries ?? [], text, restore: (s) => (redactor ? redactor.restore(s ?? '') : (s ?? '')).trim() }
}

/** A task's result, its error, or 'slow' if it is still running after `ms`. */
async function within<T>(task: Promise<T>, ms: number): Promise<{ ok: T } | { failed: unknown } | 'slow'> {
  let timer: number | undefined
  const slow = new Promise<'slow'>((resolve) => {
    timer = window.setTimeout(() => resolve('slow'), ms)
  })
  try {
    return await Promise.race([task.then((ok) => ({ ok }), (failed: unknown) => ({ failed })), slow])
  } finally {
    window.clearTimeout(timer)
  }
}

/**
 * Organises notes part by part and reports each valid proposal as soon as it is ready.
 * Smart hybrid, as for answers: Gemini Nano reads first. If it fails, or is still reading
 * CLOUD_BACKUP_AFTER_MS after the start, and the parent allowed cloud help, the parts it has not
 * finished go to the cloud (names removed), where they are read side by side.
 * Guardrail: a proposal whose quote is not in the owner's words is dropped.
 */
export async function organizeNotes(
  passport: Passport,
  notes: string,
  route: Route,
  onProposal: (p: Proposal) => void,
  onProgress: (p: OrganizeProgress) => void,
  isCancelled: () => boolean,
): Promise<OrganizeResult> {
  const seen = new Set(passport.entries.map((e) => normalize(e.signal)))
  const chunks = chunkNotes(notes)
  const result: OrganizeResult = { kept: 0, dropped: 0, duplicates: 0 }
  let done = 0
  let current = route
  let backup: OrganizeProgress['backup']
  const report = () => onProgress({ done, chunks: chunks.length, route: current, backup })

  const deliver = ({ raw, text, restore }: ChunkReply) => {
    for (const r of raw) {
      if (isCancelled()) return
      const signal = restore(r.signal)
      const quote = r.quote?.trim() ?? ''
      if (!isSectionId(r.section) || !signal || !quote || !quoteIsInNotes(quote, text)) {
        result.dropped++
        continue
      }
      const key = normalize(signal)
      if (seen.has(key)) {
        result.duplicates++
        continue
      }
      seen.add(key)
      result.kept++
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

  report()
  let next = 0
  if (route === 'device') {
    const canSwitch = cloudAllowed(passport)
    // One budget for the whole job, so several parts that are each a little slow still hand over.
    const deadline = Date.now() + CLOUD_BACKUP_AFTER_MS
    while (next < chunks.length && !isCancelled()) {
      if (canSwitch && Date.now() >= deadline) {
        backup = 'slow'
        current = 'cloud'
        break
      }
      const task = organizeChunk(passport, chunks[next], 'device')
      if (!canSwitch) {
        // On-device only: a bad part should not lose the rest; the owner can still add entries by hand.
        await task.then(deliver, (e: unknown) => console.warn('Organise failed for a part', e))
      } else {
        const outcome = await within(task, deadline - Date.now())
        if (outcome === 'slow' || 'failed' in outcome) {
          // Gemini Nano keeps running in the background; its late reply is ignored.
          task.catch(() => {})
          backup = outcome === 'slow' ? 'slow' : 'failed'
          current = 'cloud'
          break
        }
        deliver(outcome.ok)
      }
      next++
      done++
      report()
    }
  }
  if (current === 'cloud' && !isCancelled()) {
    report()
    const rest = chunks.slice(next)
    let i = 0
    const worker = async () => {
      while (i < rest.length && !isCancelled()) {
        const chunk = rest[i++]
        try {
          deliver(await organizeChunk(passport, chunk, 'cloud'))
        } catch (e) {
          console.warn('Organise failed for a part', e)
        }
        done++
        if (!isCancelled()) report()
      }
    }
    await Promise.all(Array.from({ length: Math.min(CLOUD_PARALLEL, rest.length) }, worker))
  }
  return result
}
