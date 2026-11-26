import { Schema } from 'firebase/ai'
import { fillPrompt, PROMPTS, sectionInfo } from '../data/rules'
import type { AnswerSource, Entry, Passport } from '../data/types'
import { cloudAllowed, generateJson, type Route } from './model'
import { makeRedactor } from './redact'
import type { ScoredEntry } from './search'

/** Answers a carer's question using ONLY the matching passport entries (FR-10, FR-11). */

export const answerSchema = Schema.object({
  properties: {
    found: Schema.enumString({ enum: ['found', 'partial', 'none'] }),
    answer: Schema.string(),
    usedIds: Schema.array({ items: Schema.string() }),
  },
})

export interface Answer {
  found: 'found' | 'partial' | 'none'
  text: string
  used: Entry[]
  source: AnswerSource
}

function factLine(id: string, e: Entry): string {
  const parts = [`[${id}] (${sectionInfo(e.section).title}) ${e.signal}`]
  if (e.meaning) parts.push(`means: ${e.meaning}`)
  if (e.whatToDo) parts.push(`what helps: ${e.whatToDo}`)
  return parts.join(' | ')
}

export async function answerQuestion(
  passport: Passport,
  question: string,
  matches: ScoredEntry[],
  route: Route,
): Promise<Answer> {
  // The Medical section never goes to the cloud on the free tier (PR-03).
  const usable = matches.map((m) => m.entry).filter((e) => route === 'device' || e.section !== 'medical')
  if (usable.length === 0) return { found: 'none', text: '', used: [], source: route === 'device' ? 'on_device' : 'in_cloud' }

  const redactor = route === 'cloud' ? makeRedactor(passport) : null
  const clean = (s: string) => (redactor ? redactor.redact(s) : s)
  const ids = usable.map((_, i) => `e${i + 1}`)
  const facts = usable.map((e, i) => clean(factLine(ids[i], e))).join('\n')
  const parent = passport.contacts.find((c) => c.primary)?.name || passport.contacts[0]?.name || 'the parent'
  const prompt = fillPrompt(PROMPTS.answer, {
    name: redactor ? '[CHILD]' : passport.child.firstName,
    parent: redactor ? redactor.redact(parent) : parent,
    question: clean(question.trim().slice(0, 300)),
    facts,
  })

  const { data, source } = await generateJson<{ found?: string; answer?: string; usedIds?: string[] }>(
    route,
    answerSchema,
    'answer',
    prompt,
    '{"found": "found" | "partial" | "none", "answer": string, "usedIds": [string]}',
  )
  // Guardrail: keep only ids we actually gave; no cited entry means no AI text is shown (NF-16).
  const used = (data.usedIds ?? []).map((id) => usable[ids.indexOf(id.replace(/[[\]\s]/g, ''))]).filter(Boolean)
  // A reply that cites facts but forgot the "found" field still counts; an explicit "none" never does.
  const found = data.found === 'found' || data.found === 'partial' ? data.found : data.found === undefined && used.length > 0 ? 'partial' : 'none'
  // The model sometimes cites ids inline ("[e1]"); the entries are shown under the answer instead.
  const raw = (data.answer ?? '').replace(/\s*\[e\d+\]/gi, '').replace(/\s+([.,;:!?])/g, '$1')
  const text = (redactor ? redactor.restore(raw) : raw).trim()
  if (found === 'none' || used.length === 0 || !text) return { found: 'none', text: '', used: [], source }
  return { found, text, used, source }
}

/** How long Gemini Nano gets before the cloud is asked too. Laptops without a graphics card can take a minute. */
export const CLOUD_BACKUP_AFTER_MS = 8_000

/**
 * Smart hybrid: answers on the device first. If Gemini Nano fails, or is still working after
 * CLOUD_BACKUP_AFTER_MS, and the parent allowed cloud help, the cloud (names removed) is asked
 * too and the first useful answer wins. `onBackup` runs when the cloud is brought in.
 */
export async function answerHybrid(
  passport: Passport,
  question: string,
  matches: ScoredEntry[],
  route: Route,
  onBackup?: () => void,
): Promise<Answer> {
  const primary = answerQuestion(passport, question, matches, route)
  if (route !== 'device' || !cloudAllowed(passport)) return primary

  let timer: number | undefined
  const slow = new Promise<'slow'>((resolve) => {
    timer = window.setTimeout(() => resolve('slow'), CLOUD_BACKUP_AFTER_MS)
  })
  const first = await Promise.race([primary.then((answer) => ({ answer }), () => 'failed' as const), slow])
  window.clearTimeout(timer)
  if (typeof first === 'object') return first.answer

  onBackup?.()
  const cloud = answerQuestion(passport, question, matches, 'cloud')
  return first === 'failed' ? cloud : firstUseful([primary, cloud])
}

/** The first answer that found something; otherwise a "none" answer, or the last error if both failed. */
function firstUseful(tasks: Promise<Answer>[]): Promise<Answer> {
  return new Promise((resolve, reject) => {
    let pending = tasks.length
    let none: Answer | null = null
    let error: unknown
    for (const task of tasks) {
      task
        .then(
          (answer) => (answer.found !== 'none' ? resolve(answer) : (none ??= answer)),
          (e: unknown) => (error = e),
        )
        .finally(() => {
          if (--pending === 0) {
            if (none) resolve(none)
            else reject(error)
          }
        })
    }
  })
}
