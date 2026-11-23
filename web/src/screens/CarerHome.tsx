import { useState } from 'react'
import { Flashcards } from '../components/Flashcards'
import { Icon, IconBadge } from '../components/Icon'
import { Avatar, CallButtons, Page } from '../components/ui'
import type { AppContext } from '../context'
import { atAGlance } from '../data/glance'
import { SECTIONS, SITUATIONS } from '../data/rules'

/**
 * Carer mode: what a babysitter, teacher or grandparent sees when the parent hands
 * them the phone. Read and ask only; no editing, no settings.
 */
export function CarerHome({ ctx }: { ctx: AppContext }) {
  const { passport, navigate } = ctx
  const { child } = passport
  const name = child.firstName
  const glance = atAGlance(passport)
  const [question, setQuestion] = useState('')
  const [confirmExit, setConfirmExit] = useState(false)

  return (
    <Page
      ctx={ctx}
      title="Carer view"
      nav={false}
      actions={
        confirmExit ? (
          <span className="row">
            <button type="button" className="secondary" onClick={() => setConfirmExit(false)}>
              Stay
            </button>
            <button type="button" className="primary" onClick={() => ctx.setCarerMode(false)}>
              Exit
            </button>
          </span>
        ) : (
          <button type="button" className="link" onClick={() => setConfirmExit(true)}>
            I'm the parent
          </button>
        )
      }
    >
      <section className="carer-hero rise">
        <Avatar passport={passport} size={92} />
        <div>
          <p className="eyebrow">You're looking after</p>
          <h1>{name}</h1>
          <p className="muted">{[child.age ? `${child.age} years old` : '', child.aboutMe].filter(Boolean).join(' · ')}</p>
        </div>
      </section>

      <CallButtons passport={passport} />

      {glance.length > 0 && (
        <section className="card" aria-labelledby="first">
          <div>
            <h2 id="first">Get to know {name} in a minute</h2>
            <p className="muted small">Tap a card to flip it. Swipe for the next one.</p>
          </div>
          <Flashcards entries={glance} name={name} />
        </section>
      )}

      <section style={{ display: 'grid', gap: 10 }} aria-labelledby="happening">
        <h2 id="happening">What's happening?</h2>
        <div className="situations">
          {SITUATIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`situation tone-${s.tone} ${s.emergency ? 'urgent' : ''}`}
              onClick={() => navigate(s.emergency ? '/emergency' : `/ask?s=${s.id}`)}
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
          if (question.trim()) navigate(`/ask?q=${encodeURIComponent(question.trim())}`)
        }}
      >
        <label htmlFor="carer-q" className="sr-only">
          Describe what {name} is doing
        </label>
        <input id="carer-q" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={`Type what ${name} is doing…`} maxLength={300} />
        <button type="submit" className="primary" disabled={!question.trim()}>
          Ask
        </button>
      </form>

      <section className="card" aria-labelledby="all">
        <h2 id="all">Everything about {name}</h2>
        <ul className="tiles">
          {SECTIONS.filter((s) => passport.entries.some((e) => e.section === s.id)).map((s) => (
            <li key={s.id}>
              <a href={`#/section/${s.id}`} className={`tile tint-${s.id} tone-${s.id}`}>
                <IconBadge name={s.icon} tone={s.id} size={40} />
                <span className="t-title">{s.title}</span>
                <span className="t-count">{passport.entries.filter((e) => e.section === s.id).length} things</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <button type="button" className="danger big" onClick={() => navigate('/emergency')}>
        <Icon name="siren" size={22} /> Emergency
      </button>
    </Page>
  )
}
