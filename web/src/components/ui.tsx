import { useState, type ReactNode } from 'react'
import { downloadDeviceModel } from '../ai/model'
import { organizeSchema } from '../ai/organize'
import type { AppContext } from '../context'
import { sectionInfo } from '../data/rules'
import type { AnswerSource, Contact, Entry, Passport } from '../data/types'
import { avatarParts, Icon } from './Icon'

/** A screen: sticky top bar, content, and the bottom navigation (hidden in carer mode). */
export function Page({
  ctx,
  title,
  back,
  actions,
  children,
  nav = true,
}: {
  ctx: AppContext
  title?: string
  back?: string
  actions?: ReactNode
  children: ReactNode
  nav?: boolean
}) {
  const showNav = nav && !ctx.carerMode
  return (
    <>
      <main className={`page ${showNav ? '' : 'no-nav'}`}>
        {(title || back) && (
          <header className="topbar">
            {back && (
              <a className="icon-button" href={`#${back}`} aria-label="Back">
                <Icon name="arrow-left" size={22} />
              </a>
            )}
            {title && <h1>{title}</h1>}
            {!ctx.online && <span className="chip offline">Offline</span>}
            {actions}
          </header>
        )}
        {children}
      </main>
      {showNav && <BottomNav ctx={ctx} />}
    </>
  )
}

const NAV = [
  { path: '/', icon: 'house', label: 'Passport' },
  { path: '/ask', icon: 'message-circle', label: 'Ask' },
  { path: '/card', icon: 'qr-code', label: 'QR card' },
  { path: '/settings', icon: 'settings', label: 'Settings' },
]

function BottomNav({ ctx }: { ctx: AppContext }) {
  const base = '/' + (ctx.route.split('?')[0].split('/').filter(Boolean)[0] ?? '')
  return (
    <nav className="bottom-nav" aria-label="Main">
      <ul>
        {NAV.map((n) => (
          <li key={n.path}>
            <a href={`#${n.path}`} aria-current={base === n.path ? 'page' : undefined}>
              <span className="nav-icon">
                <Icon name={n.icon} size={22} strokeWidth={base === n.path ? 2.4 : 2} />
              </span>
              {n.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** The child's photo, an illustrated avatar, or their initial on a colour. */
export function Avatar({ passport, size = 72 }: { passport: Passport; size?: number }) {
  const { photo, avatar, firstName } = passport.child
  const { icon, colour } = avatarParts(avatar, firstName)
  return (
    <span className={`avatar av-${colour}`} style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {photo ? <img src={photo} alt="" /> : icon ? <Icon name={icon} size={Math.round(size * 0.5)} strokeWidth={2.2} /> : firstName.slice(0, 1).toUpperCase()}
    </span>
  )
}

export function primaryContact(passport: Passport): Contact | undefined {
  return passport.contacts.find((c) => c.primary) ?? passport.contacts[0]
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

export function CallButtons({ passport, variant = 'normal' }: { passport: Passport; variant?: 'normal' | 'alert' }) {
  const contact = primaryContact(passport)
  const alert = variant === 'alert'
  return (
    <div className="call-row">
      {contact?.phone && (
        <a className={`button ${alert ? 'light' : 'primary'}`} href={telHref(contact.phone)}>
          <Icon name="phone" size={20} /> Call {contact.name}
        </a>
      )}
      <a className={`button ${alert ? 'dark' : 'danger'}`} href={telHref(passport.settings.emergencyNumber)}>
        <Icon name="siren" size={20} /> Call {passport.settings.emergencyNumber}
      </a>
    </div>
  )
}

const SOURCE: Record<AnswerSource, { label: string; icon: string; className: string }> = {
  on_device: { label: 'Answered on this device', icon: 'lock', className: '' },
  in_cloud: { label: 'Answered in the cloud, names removed', icon: 'cloud', className: 'cloud' },
  offline_search: { label: 'Straight from the passport', icon: 'book-open', className: 'search' },
}

/** Shows where every answer came from (FR-13). */
export function SourceChip({ source }: { source: AnswerSource }) {
  const s = SOURCE[source]
  return (
    <span className={`chip ${s.className}`}>
      <Icon name={s.icon} size={14} strokeWidth={2.4} /> {s.label}
    </span>
  )
}

export function EntryCard({ entry, actions, showSection = true }: { entry: Entry; actions?: ReactNode; showSection?: boolean }) {
  const info = sectionInfo(entry.section)
  return (
    <article className={`entry tint-${entry.section} tone-${entry.section}`}>
      {showSection && (
        <p className="entry-section inline-icon" style={{ color: 'var(--tone-fg)' }}>
          <Icon name={info.icon} size={15} strokeWidth={2.4} /> {info.title}
        </p>
      )}
      <p className="entry-signal">{entry.signal}</p>
      {entry.meaning && (
        <p className="entry-line">
          <span className="k">Means</span>
          <span>{entry.meaning}</span>
        </p>
      )}
      {entry.whatToDo && (
        <p className="entry-line">
          <span className="k">What helps</span>
          <span>{entry.whatToDo}</span>
        </p>
      )}
      {actions && <div className="entry-actions">{actions}</div>}
    </article>
  )
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="toast inline-icon" role="status">
      <Icon name="check" size={18} strokeWidth={3} /> {message}
    </div>
  )
}

/** On-device AI status with a download button (FR-03, OF-07). */
export function AiStatus({ ctx }: { ctx: AppContext }) {
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState('')
  const { status, passport } = ctx

  function download() {
    // Must run inside the click: Chrome only starts the model download on a user gesture.
    setError('')
    setProgress(0)
    downloadDeviceModel(organizeSchema, (p) => setProgress(p))
      .then(() => {
        ctx.refreshStatus()
        ctx.toast('Private AI is ready')
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setProgress(null))
  }

  if (status === 'checking') return null
  if (status === 'available') {
    return (
      <div className="notice">
        <strong className="inline-icon">
          <Icon name="lock" size={18} /> Private AI is ready
        </strong>
        <span className="muted">Gemini Nano runs inside Chrome on this device, so answers work offline and nothing is uploaded.</span>
      </div>
    )
  }
  if (progress !== null || status === 'downloading') {
    return (
      <div className="notice" role="status">
        <strong>Downloading private AI…</strong>
        <progress max={1} value={progress ?? undefined} />
        <span className="muted">{progress !== null ? `${Math.round(progress * 100)}%` : 'In progress'}. You can keep using KnowMe.</span>
      </div>
    )
  }
  if (status === 'downloadable') {
    return (
      <div className="notice warm">
        <strong className="inline-icon">
          <Icon name="sparkles" size={18} /> Get private, offline AI
        </strong>
        <span className="muted">One download (2 to 4 GB) lets KnowMe answer questions on this device, even with no internet.</span>
        <button type="button" className="primary" onClick={download} disabled={!ctx.online}>
          <Icon name="download" size={18} /> Download private AI
        </button>
        {!ctx.online && <span className="muted small">Connect to the internet once to download it.</span>}
        {error && <span className="error">{error}</span>}
      </div>
    )
  }
  return (
    <div className="notice">
      <strong>KnowMe works without AI here</strong>
      <span className="muted">
        This device can't run private AI, so KnowMe shows answers straight from the passport.
        {passport.settings.cloudHelp ? ' Cloud help adds a short AI answer when online.' : ''}
      </span>
      {!passport.settings.cloudHelp && !ctx.carerMode && ctx.route !== '/settings' && (
        <a className="link" href="#/settings">
          Want short AI answers? Turn on Cloud help in Settings
        </a>
      )}
    </div>
  )
}
