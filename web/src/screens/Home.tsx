import { Flashcards } from '../components/Flashcards'
import { Icon, IconBadge } from '../components/Icon'
import { AiStatus, Avatar, Page } from '../components/ui'
import type { AppContext } from '../context'
import { atAGlance, completeness } from '../data/glance'
import { SECTIONS, sectionInfo, withName } from '../data/rules'
import { deleteEverything } from '../data/store'

/** The parent's passport: who the child is, what carers will see, and what's left to add. */
export function Home({ ctx }: { ctx: AppContext }) {
  const { passport, navigate } = ctx
  const { child } = passport
  const name = child.firstName
  const { filled, total, next } = completeness(passport)
  const glance = atAGlance(passport)
  const empty = passport.entries.length === 0
  const count = passport.entries.length

  async function startOwn() {
    await deleteEverything()
    ctx.replacePassport(null)
    navigate('/')
  }

  return (
    <Page ctx={ctx}>
      {passport.demo && (
        <section className="notice warm demo-banner" aria-label="Demo">
          <strong className="inline-icon">
            <Icon name="play" size={18} /> You're trying KnowMe with {name}, a made-up child
          </strong>
          <span className="muted">Tap "Ask about {name}" or "Hand to a carer" to see what a babysitter sees.</span>
          <button type="button" className="link" onClick={startOwn}>
            Make a passport for my own child instead
          </button>
        </section>
      )}

      <section className="hero-card rise" aria-label={`${name}'s passport`}>
        <div className="hero-top">
          <Avatar passport={passport} size={84} />
          <div>
            <p className="hero-label">KnowMe passport</p>
            <h1>{name}</h1>
            {child.age || child.aboutMe ? (
              <p>{[child.age ? `${child.age} years old` : '', child.aboutMe].filter(Boolean).join(' · ')}</p>
            ) : (
              <a className="hero-add" href="#/settings">
                + Add a line about {name}
              </a>
            )}
          </div>
        </div>
        <div className="progress">
          <div className="progress-text">
            <span>{filled === total ? 'Passport complete' : `${filled} of ${total} sections done`}</span>
            <span>
              {count} {count === 1 ? 'note' : 'notes'}
            </span>
          </div>
          <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={filled}>
            <span style={{ width: `${Math.max(4, (filled / total) * 100)}%` }} />
          </div>
        </div>
      </section>

      <div className="action-grid">
        <button type="button" className="action ask" onClick={() => navigate('/ask')} disabled={empty}>
          <Icon name="message-circle" size={30} />
          Ask about {name}
          <span className="a-sub">Tap a situation or type</span>
        </button>
        <button type="button" className="action emergency" onClick={() => navigate('/emergency')}>
          <Icon name="siren" size={30} />
          Emergency
          <span className="a-sub">Calls and safety notes</span>
        </button>
        <button type="button" className="action carer" onClick={() => ctx.setCarerMode(true)} disabled={empty}>
          <Icon name="heart-handshake" size={30} />
          Hand to a carer
          <span className="a-sub">Simple view for a babysitter</span>
        </button>
        <button type="button" className="action add" onClick={() => navigate('/guide')}>
          <Icon name="pen-line" size={30} />
          Add more
          <span className="a-sub">Quick questions</span>
        </button>
      </div>

      {next && (
        <section className={`next-card rise tone-${next}`} aria-label="Next question">
          <p className="eyebrow inline-icon">
            <IconBadge name={sectionInfo(next).icon} tone={next} size={32} /> Next: {sectionInfo(next).title}
          </p>
          <p className="q">{withName(sectionInfo(next).question, name)}</p>
          <div className="row">
            <button type="button" className="primary" onClick={() => navigate(`/guide/${next}`)}>
              Answer now <Icon name="arrow-right" size={18} />
            </button>
            {empty && (
              <button type="button" className="link" onClick={() => navigate('/paste')}>
                Or paste a long description
              </button>
            )}
          </div>
        </section>
      )}

      {glance.length > 0 && (
        <section className="card" aria-labelledby="deck-title">
          <div className="card-head">
            <div>
              <h2 id="deck-title">What carers will see first</h2>
              <p className="muted small">Flashcards of the most important things. Tap a card to flip it.</p>
            </div>
          </div>
          <Flashcards entries={glance} name={name} />
        </section>
      )}

      <section className="card" aria-labelledby="sections-title">
        <div className="card-head">
          <h2 id="sections-title">{name}'s passport</h2>
          <button type="button" className="link inline-icon" onClick={() => navigate('/paste')}>
            <Icon name="sparkles" size={16} /> Paste a description
          </button>
        </div>
        <ul className="tiles">
          {SECTIONS.map((s) => {
            const items = passport.entries.filter((e) => e.section === s.id)
            return (
              <li key={s.id}>
                <a href={`#/section/${s.id}`} className={`tile tint-${s.id} tone-${s.id} ${items.length ? '' : 'empty'}`}>
                  <IconBadge name={s.icon} tone={s.id} size={40} />
                  <span className="t-title">{s.title}</span>
                  {items.length > 0 && <span className="t-preview">{items.map((i) => i.signal).join(' · ')}</span>}
                  <span className="t-count">{items.length ? `${items.length} ${items.length === 1 ? 'thing' : 'things'}` : '+ Add'}</span>
                </a>
              </li>
            )
          })}
        </ul>
      </section>

      <AiStatus ctx={ctx} />
    </Page>
  )
}
