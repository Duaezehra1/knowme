import { useRef, useState } from 'react'
import { chooseRoute } from '../ai/model'
import { organizeNotes, type OrganizeProgress } from '../ai/organize'
import { Icon } from '../components/Icon'
import { AiStatus, Page } from '../components/ui'
import type { AppContext } from '../context'
import { SECTIONS, sectionInfo } from '../data/rules'
import { SAMPLE_NOTES } from '../data/sample'
import { makeEntry } from '../data/store'
import type { Proposal, SectionId } from '../data/types'
import { deviceOnly } from '../firebase'
import { useElapsed } from '../hooks'

/**
 * Paste a long description (a therapist's report, notes you already wrote): AI proposes
 * entries in your own words, and you check every one (FR-04 to FR-06).
 */
export function Build({ ctx, initialNotes, source }: { ctx: AppContext; initialNotes?: string; source?: string }) {
  const { passport, status } = ctx
  const name = passport.child.firstName
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [progress, setProgress] = useState<OrganizeProgress | null>(null)
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')
  const runId = useRef(0)
  const busy = progress !== null
  const elapsed = useElapsed(busy)
  const route = chooseRoute(passport, status)

  async function organise() {
    if (!route) return
    const id = ++runId.current
    setError('')
    setSummary('')
    setProgress({ chunk: 0, chunks: 1 })
    try {
      const result = await organizeNotes(
        passport,
        notes,
        route,
        (p) => id === runId.current && setProposals((prev) => [...prev, p]),
        (p) => id === runId.current && setProgress(p),
        () => id !== runId.current,
      )
      if (id !== runId.current) return
      setSummary(
        result.kept === 0
          ? "No clear facts found. Try writing full sentences, or use the guided questions."
          : `Found ${result.kept} thing${result.kept === 1 ? '' : 's'} to check.${result.dropped ? ` ${result.dropped} unclear suggestion${result.dropped === 1 ? ' was' : 's were'} left out because ${result.dropped === 1 ? "it wasn't" : "they weren't"} in your own words.` : ''}`,
      )
    } catch (e) {
      if (id === runId.current) setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (id === runId.current) setProgress(null)
    }
  }

  function stop() {
    runId.current++
    setProgress(null)
  }

  const toEntry = (p: Proposal) =>
    makeEntry({ section: p.section, signal: p.signal, meaning: p.meaning, whatToDo: p.whatToDo, source: 'ai-approved', quote: p.quote })

  async function accept(p: Proposal) {
    await ctx.update((current) => ({ ...current, entries: [...current.entries, toEntry(p)] }))
    setProposals((prev) => prev.filter((x) => x.key !== p.key))
    ctx.toast('Added')
  }

  async function acceptAll() {
    const all = proposals
    await ctx.update((current) => ({ ...current, entries: [...current.entries, ...all.map(toEntry)] }))
    setProposals([])
    ctx.toast(`Added ${all.length}`)
  }

  const edit = (key: string, patch: Partial<Proposal>) => setProposals((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)))

  return (
    <Page ctx={ctx} title="Paste a description" back="/">
      {initialNotes && (
        <p className="notice inline-icon">
          <Icon name="check" size={18} strokeWidth={3} /> Text added from {source ? `"${source}"` : 'the page you selected'}. Tap Find the facts.
        </p>
      )}
      <section className="card">
        <p>
          Paste anything you've already written about {name}: notes for a new school, a therapist's report, a message to a babysitter. AI pulls out each fact in your own words, and you
          check every one.
        </p>
        <label className="sr-only" htmlFor="notes">
          Description of {name}
        </label>
        <textarea
          id="notes"
          rows={9}
          value={notes}
          maxLength={20000}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={`When ${name} says…, it means…\nWhat calms ${name}…\nWhat upsets ${name}…`}
        />
        <div className="row between">
          <button type="button" className="link" onClick={() => setNotes(SAMPLE_NOTES)} disabled={busy}>
            Try sample notes (fictional child)
          </button>
          <span className="muted small">{notes.trim().length.toLocaleString()} / 20,000</span>
        </div>

        {route ? (
          busy ? (
            <div className="row" role="status">
              <span className="spinner" aria-hidden="true" />
              <strong style={{ flex: 1 }}>
                {route === 'device' ? 'Reading on this device' : 'Reading in the cloud, names removed'}
                {progress && progress.chunks > 1 ? ` · part ${progress.chunk} of ${progress.chunks}` : ''} · {elapsed}s
              </strong>
              <button type="button" className="secondary" onClick={stop}>
                Stop
              </button>
            </div>
          ) : (
            <button type="button" className="primary big" onClick={organise} disabled={notes.trim().length < 40}>
              <Icon name="sparkles" size={20} /> Find the facts
            </button>
          )
        ) : (
          <p className="notice warm">
            AI isn't available on this device right now. The guided questions work everywhere
            {deviceOnly ? ', or you can add notes yourself in each section.' : ', and you can turn on cloud help in Settings.'}
          </p>
        )}
        {busy && route === 'device' && elapsed > 10 && (
          <p className="muted small">On laptops without a graphics card each part takes about a minute. Facts appear below as soon as they're ready, so you can start checking.</p>
        )}
        {summary && <p className="muted">{summary}</p>}
        {error && <p className="error">{error}</p>}
      </section>

      {!route && <AiStatus ctx={ctx} />}

      {proposals.length > 0 && (
        <section style={{ display: 'grid', gap: 12 }} aria-live="polite">
          <div className="row between">
            <h2>Check these ({proposals.length})</h2>
            <button type="button" className="soft" onClick={acceptAll}>
              <Icon name="check" size={18} strokeWidth={3} /> Accept all
            </button>
          </div>
          {proposals.map((p) => (
            <article key={p.key} className={`proposal pop tint-${p.section}`}>
              <label className="field">
                Section
                <select value={p.section} onChange={(e) => edit(p.key, { section: e.target.value as SectionId })}>
                  {SECTIONS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                What you see or hear
                <input value={p.signal} onChange={(e) => edit(p.key, { signal: e.target.value })} />
              </label>
              {(p.meaning || sectionInfo(p.section).meaningLabel) && (
                <label className="field">
                  What it means
                  <input value={p.meaning} onChange={(e) => edit(p.key, { meaning: e.target.value })} />
                </label>
              )}
              <label className="field">
                What helps
                <input value={p.whatToDo} onChange={(e) => edit(p.key, { whatToDo: e.target.value })} />
              </label>
              <p className="quote">From your words: “{p.quote}”</p>
              <div className="row end">
                <button type="button" className="link" onClick={() => setProposals((prev) => prev.filter((x) => x.key !== p.key))}>
                  Reject
                </button>
                <button type="button" className="primary" onClick={() => accept(p)} disabled={!p.signal.trim()}>
                  <Icon name="check" size={18} strokeWidth={3} /> Add
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </Page>
  )
}
