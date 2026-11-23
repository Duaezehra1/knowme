import { useState } from 'react'
import { AVATAR_COLOURS, AVATAR_ICONS, Icon, IconBadge } from '../components/Icon'
import { WelcomeScene } from '../components/Illustrations'
import { EMERGENCY_NUMBERS } from '../data/rules'
import { createPassport, importPassport } from '../data/store'
import { photoToDataUrl } from '../data/photo'
import { demoPassport } from '../data/sample'
import type { Passport } from '../data/types'

const PROMISES = [
  { icon: 'book-open', tone: 'routine', title: 'Build a passport in minutes.', text: 'Answer simple questions about how your child communicates, what calms them and what to watch for.' },
  { icon: 'message-circle', tone: 'communication', title: 'Anyone can ask it.', text: 'A babysitter, teacher or nurse taps "Crying" or types what they see, and gets your advice in seconds.' },
  { icon: 'lock', tone: 'safety', title: 'Private and offline.', text: 'Everything stays on this device. Where the device can, the AI runs on it too, so it works with no internet.' },
  { icon: 'qr-code', tone: 'upsets', title: 'A QR card for their bag.', text: 'If your child is ever lost, any phone camera can read it, with no app needed.' },
]

/** First run in four short steps: promise, child, who to call, ready (FR-01, FR-02, NF-15). */
export function Welcome({ onCreate }: { onCreate: (p: Passport, startInterview: boolean) => Promise<void> }) {
  const [step, setStep] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [age, setAge] = useState('')
  const [avatarIcon, setAvatarIcon] = useState('smile')
  const [avatarColour, setAvatarColour] = useState('teal')
  const [photo, setPhoto] = useState<string | undefined>()
  const [contactName, setContactName] = useState('')
  const [relation, setRelation] = useState('mother')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('PK')
  const [emergencyNumber, setEmergencyNumber] = useState('1122')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const name = firstName.trim() || 'your child'

  async function finish(startInterview: boolean) {
    setBusy(true)
    await onCreate(
      createPassport({
        firstName,
        age: age ? Number(age) : undefined,
        avatar: `${avatarIcon}:${avatarColour}`,
        photo,
        contactName,
        contactRelation: relation,
        phone,
        country,
        emergencyNumber: emergencyNumber.trim() || '112',
      }),
      startInterview,
    )
  }

  async function tryDemo() {
    setBusy(true)
    await onCreate(demoPassport(), false)
  }

  async function importFile(file: File) {
    try {
      setError('')
      await onCreate(importPassport(await file.text()), false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function pickPhoto(file: File) {
    try {
      setPhoto(await photoToDataUrl(file))
    } catch {
      setError("That photo couldn't be read. Try another one, or pick a picture below.")
    }
  }

  const dots = (
    <div className="steps-dots" aria-label={`Step ${step} of 3`}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={step >= n ? 'on' : ''} />
      ))}
    </div>
  )

  const preview = (size: number) => (
    <span className={`avatar av-${avatarColour}`} style={{ width: size, height: size }} aria-hidden="true">
      {photo ? <img src={photo} alt="" /> : <Icon name={avatarIcon} size={Math.round(size * 0.5)} strokeWidth={2.2} />}
    </span>
  )

  return (
    <main className="page no-nav onboard">
      {step === 0 && (
        <div className="rise" style={{ display: 'grid', gap: 18 }}>
          <header className="welcome-hero">
            <WelcomeScene className="scene" />
            <h1>KnowMe</h1>
            <p className="tagline">Help everyone understand your child, even when they can't explain themselves.</p>
          </header>
          <button type="button" className="primary big" onClick={() => setStep(1)}>
            Make a passport for my child <Icon name="arrow-right" size={20} />
          </button>
          <button type="button" className="secondary big" disabled={busy} onClick={tryDemo}>
            <Icon name="play" size={20} /> Just looking? Try a demo child
          </button>
          <ul className="promise">
            {PROMISES.map((p) => (
              <li key={p.title}>
                <IconBadge name={p.icon} tone={p.tone} size={42} />
                <span>
                  <strong>{p.title}</strong> {p.text}
                </span>
              </li>
            ))}
          </ul>
          <label className="link center" style={{ cursor: 'pointer' }}>
            I have a backup file
            <input type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
          </label>
          {error && <p className="error center">{error}</p>}
        </div>
      )}

      {step === 1 && (
        <div className="card rise">
          {dots}
          <h1>Who is this passport for?</h1>
          <label className="field">
            Their first name
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Sam" autoFocus autoComplete="off" />
          </label>
          <label className="field">
            Age <span className="hint">optional</span>
            <input value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" placeholder="e.g. 7" />
          </label>
          <div className="field">
            A picture so carers recognise {name}
            <span className="hint">A photo stays on this device only. Or choose a picture and a colour.</span>
            <div className="row">
              {preview(72)}
              <label className="button secondary">
                <Icon name="camera" size={18} /> {photo ? 'Change photo' : 'Add a photo'}
                <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && pickPhoto(e.target.files[0])} />
              </label>
              {photo && (
                <button type="button" className="link" onClick={() => setPhoto(undefined)}>
                  Remove photo
                </button>
              )}
            </div>
            {!photo && (
              <>
                <div className="avatar-picker" role="group" aria-label="Pick a picture">
                  {AVATAR_ICONS.map((a) => (
                    <button key={a} type="button" className={`av-${avatarColour}`} aria-pressed={avatarIcon === a} aria-label={a} onClick={() => setAvatarIcon(a)}>
                      <Icon name={a} size={24} strokeWidth={2.2} />
                    </button>
                  ))}
                </div>
                <div className="colour-picker" role="group" aria-label="Pick a colour">
                  {AVATAR_COLOURS.map((c) => (
                    <button key={c} type="button" className={`av-${c}`} aria-pressed={avatarColour === c} aria-label={c} onClick={() => setAvatarColour(c)} />
                  ))}
                </div>
              </>
            )}
          </div>
          {error && <p className="error">{error}</p>}
          <div className="row between">
            <button type="button" className="link" onClick={() => setStep(0)}>
              Back
            </button>
            <button type="button" className="primary" disabled={!firstName.trim()} onClick={() => setStep(2)}>
              Next <Icon name="arrow-right" size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card rise">
          {dots}
          <h1>Who should carers call?</h1>
          <p className="muted">This is the Call button carers see on every screen.</p>
          <div className="two">
            <label className="field">
              Your name, as {name} knows you
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. Mum, Ammi, Papa" autoFocus />
            </label>
            <label className="field">
              You are their
              <select value={relation} onChange={(e) => setRelation(e.target.value)}>
                {['mother', 'father', 'guardian', 'grandparent', 'carer'].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            Your phone number
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="+92 300 0000000" />
          </label>
          <div className="two">
            <label className="field">
              Country
              <select
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value)
                  const match = EMERGENCY_NUMBERS.find((c) => c.country === e.target.value)
                  if (match) setEmergencyNumber(match.number)
                }}
              >
                {EMERGENCY_NUMBERS.map((c) => (
                  <option key={c.country} value={c.country}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Emergency number
              <input value={emergencyNumber} onChange={(e) => setEmergencyNumber(e.target.value)} inputMode="tel" />
            </label>
          </div>
          <div className="row between">
            <button type="button" className="link" onClick={() => setStep(1)}>
              Back
            </button>
            <button type="button" className="primary" disabled={!contactName.trim()} onClick={() => setStep(3)}>
              Next <Icon name="arrow-right" size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card rise center" style={{ justifyItems: 'center' }}>
          {dots}
          <span className="pop">{preview(104)}</span>
          <h1>Let's get to know {name}</h1>
          <p className="muted">
            A few simple questions, one at a time. Tap an example or write your own. Every answer is saved straight away, and you can stop at any time.
          </p>
          <button type="button" className="primary big" disabled={busy} onClick={() => finish(true)}>
            Start (about 5 minutes)
          </button>
          <button type="button" className="link" disabled={busy} onClick={() => finish(false)}>
            I'll do it later
          </button>
        </div>
      )}
    </main>
  )
}
