import { useMemo, useRef, useState } from 'react'
import { Icon, IconBadge } from '../components/Icon'
import { CelebrateScene } from '../components/Illustrations'
import { Avatar, Page } from '../components/ui'
import type { AppContext } from '../context'
import { SECTIONS, sectionInfo, withName, type SectionExample } from '../data/rules'
import { makeEntry } from '../data/store'
import type { SectionId } from '../data/types'

const EMPTY = { signal: '', meaning: '', whatToDo: '' }

/**
 * The guided interview: one friendly question per section, tap-to-fill examples,
 * and every answer saved instantly. No waiting for AI (FR-07, FR-09).
 */
export function Interview({ ctx, start }: { ctx: AppContext; start?: SectionId }) {
  const { passport, navigate } = ctx
  const name = passport.child.firstName
  const firstEmpty = SECTIONS.findIndex((s) => !passport.entries.some((e) => e.section === s.id))
  const [index, setIndex] = useState(() => {
    if (start) return SECTIONS.findIndex((s) => s.id === start)
    return firstEmpty >= 0 ? firstEmpty : 0
  })
  const [draft, setDraft] = useState(EMPTY)
  const [done, setDone] = useState(false)
  const firstField = useRef<HTMLInputElement>(null)

  const section = SECTIONS[index]
  const info = sectionInfo(section.id)
  const saved = useMemo(() => passport.entries.filter((e) => e.section === section.id), [passport.entries, section.id])
  const hasMeaning = Boolean(info.meaningLabel)

  async function save() {
    const clean = { signal: draft.signal.trim(), meaning: draft.meaning.trim(), whatToDo: draft.whatToDo.trim() }
    if (!clean.signal) return
    await ctx.update((p) => ({ ...p, entries: [...p.entries, makeEntry({ section: section.id, ...clean, source: 'owner' })] }))
    setDraft(EMPTY)
    ctx.toast('Saved')
    firstField.current?.focus()
  }

  function applyExample(ex: SectionExample) {
    setDraft({ signal: ex.signal, meaning: ex.meaning, whatToDo: ex.whatToDo })
    firstField.current?.focus()
  }

  async function next() {
    if (draft.signal.trim()) await save()
    setDraft(EMPTY)
    if (index < SECTIONS.length - 1) setIndex(index + 1)
    else setDone(true)
    window.scrollTo(0, 0)
  }

  if (done) {
    return (
      <Page ctx={ctx} title="All done" back="/">
        <section className="card center rise" style={{ justifyItems: 'center' }}>
          <CelebrateScene className="scene small" />
          <div className="row" style={{ justifyContent: 'center' }}>
            <Avatar passport={passport} size={56} />
            <h1>
              {name}'s passport has {passport.entries.length} things to know
            </h1>
          </div>
          <p className="muted">Carers can now ask about {name}. Next, make the QR card for {name}'s bag.</p>
          <button type="button" className="primary big" onClick={() => navigate('/card')}>
            <Icon name="qr-code" size={20} /> Make the QR card
          </button>
          <button type="button" className="secondary big" onClick={() => navigate('/ask')}>
            <Icon name="message-circle" size={20} /> Try asking a question
          </button>
          <button type="button" className="link" onClick={() => navigate('/')}>
            Back to the passport
          </button>
        </section>
      </Page>
    )
  }

  return (
    <Page ctx={ctx} title={`About ${name}`} back="/">
      <div className="steps-dots" aria-label={`Question ${index + 1} of ${SECTIONS.length}`}>
        {SECTIONS.map((s, i) => (
          <span key={s.id} className={i <= index ? 'on' : ''} style={i === index ? undefined : { width: 10 }} />
        ))}
      </div>

      <section key={section.id} className={`card rise tint-${section.id} tone-${section.id}`} style={{ border: 'none' }}>
        <p className="eyebrow inline-icon">
          <IconBadge name={info.icon} tone={section.id} size={36} /> {info.title} · {index + 1} of {SECTIONS.length}
        </p>
        <p className="interview-q">{withName(info.question, name)}</p>

        <div className="example-chips" aria-label="Examples">
          <span className="muted small">Tap an example to start from it:</span>
          {info.examples.map((ex) => (
            <button key={ex.signal} type="button" className="example-chip" onClick={() => applyExample(ex)}>
              <span>
                {ex.signal}
                {ex.meaning && <small> · means {ex.meaning.toLowerCase()}</small>}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <label className="field">
          {withName(info.signalLabel, name)}
          <input
            ref={firstField}
            value={draft.signal}
            onChange={(e) => setDraft({ ...draft, signal: e.target.value })}
            maxLength={200}
            onKeyDown={(e) => e.key === 'Enter' && !hasMeaning && save()}
          />
        </label>
        {hasMeaning && (
          <label className="field">
            {info.meaningLabel}
            <input value={draft.meaning} onChange={(e) => setDraft({ ...draft, meaning: e.target.value })} maxLength={200} />
          </label>
        )}
        <label className="field">
          {info.whatToDoLabel}
          <input
            value={draft.whatToDo}
            onChange={(e) => setDraft({ ...draft, whatToDo: e.target.value })}
            maxLength={300}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        </label>
        <button type="button" className="soft big" onClick={save} disabled={!draft.signal.trim()}>
          <Icon name="plus" size={20} /> Save and add another
        </button>

        {saved.length > 0 && (
          <div className="saved-list" aria-live="polite">
            <span className="muted small">Saved in {info.title.toLowerCase()}:</span>
            {saved.map((e) => (
              <div key={e.id} className="saved-item pop">
                <span>
                  <strong>{e.signal}</strong>
                  {e.meaning && <span className="muted"> · {e.meaning}</span>}
                </span>
                <Icon name="check" size={18} strokeWidth={3} className="ok-icon" />
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="row between">
        <button type="button" className="link" onClick={() => (index > 0 ? setIndex(index - 1) : navigate('/'))}>
          <Icon name="arrow-left" size={18} /> Back
        </button>
        <button type="button" className="primary" onClick={next}>
          {index < SECTIONS.length - 1 ? (saved.length || draft.signal.trim() ? 'Next question' : 'Skip for now') : 'Finish'}
          <Icon name={index < SECTIONS.length - 1 ? 'arrow-right' : 'check'} size={18} />
        </button>
      </div>
    </Page>
  )
}
