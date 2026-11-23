import { useEffect, useRef, useState } from 'react'
import { answerQuestion, type Answer } from '../ai/answer'
import { chooseRoute } from '../ai/model'
import { findMatches, isEmergency } from '../ai/search'
import { Icon, IconBadge } from '../components/Icon'
import { CallButtons, EntryCard, Page, SourceChip } from '../components/ui'
import type { AppContext } from '../context'
import { situationEntries } from '../data/glance'
import { SITUATIONS, type Situation } from '../data/rules'
import type { Entry } from '../data/types'
import { useElapsed } from '../hooks'

function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en'
  speechSynthesis.speak(u)
}

/**
 * Tap a situation or type what you see. Passport entries appear instantly (code, no AI);
 * a short AI answer follows when this device can make one (SRS section 6).
 */
export function Ask({ ctx, initial, situationId }: { ctx: AppContext; initial: string; situationId: string }) {
  const { passport, status, navigate } = ctx
  const name = passport.child.firstName
  const [question, setQuestion] = useState(initial)
  const [asked, setAsked] = useState<{ text: string; icon?: string } | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [thinking, setThinking] = useState(false)
  const [aiFailed, setAiFailed] = useState(false)
  const runId = useRef(0)
  const resultRef = useRef<HTMLElement>(null)
  const elapsed = useElapsed(thinking)
  const route = chooseRoute(passport, status)

  async function run(text: string, found: Entry[], icon?: string) {
    const id = ++runId.current
    setAsked({ text, icon })
    setEntries(found)
    setAnswer(null)
    setAiFailed(false)
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    if (!route || found.length === 0) return
    setThinking(true)
    try {
      const result = await answerQuestion(
        passport,
        text,
        found.map((entry) => ({ entry, score: 1 })),
        route,
      )
      if (id === runId.current) setAnswer(result)
    } catch {
      // Any AI error leaves the passport entries on screen (NF-13).
      if (id === runId.current) setAiFailed(true)
    } finally {
      if (id === runId.current) setThinking(false)
    }
  }

  function askText(text: string) {
    const q = text.trim().slice(0, 300)
    if (!q) return
    // Emergency words skip AI entirely (FR-12, NF-01).
    if (isEmergency(q)) {
      navigate(`/emergency?q=${encodeURIComponent(q)}`)
      return
    }
    void run(
      q,
      findMatches(q, passport.entries).map((m) => m.entry),
    )
  }

  function askSituation(s: Situation) {
    if (s.emergency) {
      navigate('/emergency')
      return
    }
    setQuestion('')
    void run(`${name}: ${s.label.toLowerCase()}`, situationEntries(passport, s), s.icon)
  }

  useEffect(() => {
    const s = SITUATIONS.find((x) => x.id === situationId)
    if (s) askSituation(s)
    else if (initial) askText(initial)
    // Only for a question passed in the link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Every related entry stays on screen; the ones the AI used come first.
  const used = answer && answer.found !== 'none' ? answer.used : []
  const shown = [...used, ...entries.filter((e) => !used.includes(e))]

  return (
    <Page ctx={ctx} title={`Ask about ${name}`} back={ctx.carerMode ? '/' : undefined}>
      <section aria-labelledby="situations-title" style={{ display: 'grid', gap: 10 }}>
        <h2 id="situations-title">What's happening?</h2>
        <div className="situations">
          {SITUATIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`situation tone-${s.tone} ${s.emergency ? 'urgent' : ''}`}
              aria-pressed={asked?.icon === s.icon && !s.emergency}
              onClick={() => askSituation(s)}
            >
              <IconBadge name={s.icon} tone={s.tone} size={42} />
              {s.label}
            </button>
          ))}
        </div>
      </section>

      <form
        className="ask-box"
        onSubmit={(e) => {
          e.preventDefault()
          askText(question)
        }}
      >
        <label htmlFor="q" className="sr-only">
          Describe what {name} is doing
        </label>
        <input
          id="q"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={300}
          placeholder={`Or type what ${name} is doing…`}
          autoComplete="off"
          enterKeyHint="send"
        />
        <button type="submit" className="primary" disabled={!question.trim()}>
          Ask
        </button>
      </form>

      {asked && (
        <section ref={resultRef} className="rise" aria-live="polite" style={{ display: 'grid', gap: 12, scrollMarginTop: 72 }}>
          <p className="bubble-q inline-icon">
            {asked.icon && <Icon name={asked.icon} size={18} strokeWidth={2.4} />}
            {asked.text}
          </p>

          {entries.length === 0 ? (
            <div className="bubble-a">
              <p className="answer-text">That isn't in {name}'s passport yet.</p>
              <p>Stay calm, keep {name} safe, and call for help if you're unsure.</p>
              <CallButtons passport={passport} />
            </div>
          ) : (
            <>
              {thinking && (
                <p className="thinking" role="status">
                  <span className="dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  {route === 'device' ? 'Writing a short answer on this device' : 'Asking the cloud, names removed'} · {elapsed}s
                </p>
              )}
              {answer && answer.found !== 'none' && (
                <div className="bubble-a pop">
                  <p className="answer-text">{answer.text}</p>
                  <div className="row between">
                    <SourceChip source={answer.source} />
                    <button type="button" className="link" onClick={() => speak(answer.text)}>
                      <Icon name="volume" size={18} /> Read aloud
                    </button>
                  </div>
                </div>
              )}
              <div className="row">
                <h2 style={{ fontSize: '1rem' }}>From {name}'s passport</h2>
                {(!answer || answer.found === 'none' || aiFailed) && !thinking && <SourceChip source="offline_search" />}
              </div>
              {shown.map((e) => (
                <EntryCard key={e.id} entry={e} />
              ))}
              <CallButtons passport={passport} />
            </>
          )}
        </section>
      )}

      <p className="muted small center">KnowMe shares what {name}'s family wrote. In an emergency, call {passport.settings.emergencyNumber}.</p>
    </Page>
  )
}
