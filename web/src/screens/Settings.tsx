import { useState } from 'react'
import { AVATAR_COLOURS, AVATAR_ICONS, avatarParts, Icon } from '../components/Icon'
import { AiStatus, Avatar, Page } from '../components/ui'
import type { AppContext } from '../context'
import { photoToDataUrl } from '../data/photo'
import { deleteEverything, exportPassport, importPassport, newId, savePassport } from '../data/store'
import type { Contact } from '../data/types'
import { isExtension } from '../firebase'

/** Child details, who to call, cloud help, backup and delete everything (FR-08, FR-26 to FR-28). */
export function Settings({ ctx }: { ctx: AppContext }) {
  const { passport } = ctx
  const name = passport.child.firstName
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [message, setMessage] = useState('')
  const [pickingAvatar, setPickingAvatar] = useState(false)

  // Functional updates, so quick edits never overwrite each other. Text fields save on blur.
  const changeContacts = (change: (contacts: Contact[]) => Contact[]) => ctx.update((p) => ({ ...p, contacts: change(p.contacts) }))
  const editContact = (id: string, patch: Partial<Contact>) => changeContacts((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const saved = () => ctx.toast('Saved')
  const current = avatarParts(passport.child.avatar, name)
  const setAvatar = async (icon: string, colour: string) => {
    await ctx.update((p) => ({ ...p, child: { ...p.child, avatar: `${icon}:${colour}`, photo: undefined } }))
    saved()
  }

  function exportFile() {
    const blob = new Blob([exportPassport(passport)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${name}-knowme-backup.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function importFile(file: File) {
    try {
      const restored = await savePassport(importPassport(await file.text()))
      ctx.replacePassport(restored)
      setMessage('Backup restored.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e))
    }
  }

  async function wipe() {
    await deleteEverything()
    ctx.replacePassport(null)
    ctx.navigate('/')
  }

  async function setPhoto(file: File) {
    try {
      const photo = await photoToDataUrl(file)
      await ctx.update((p) => ({ ...p, child: { ...p.child, photo } }))
      saved()
    } catch {
      ctx.toast("That photo couldn't be read")
    }
  }

  return (
    <Page ctx={ctx} title="Settings">
      <section className="card">
        <div className="row">
          <Avatar passport={passport} size={72} />
          <div style={{ flex: 1 }}>
            <h2>{name}</h2>
            <div className="row">
              <label className="link inline-icon" style={{ cursor: 'pointer' }}>
                <Icon name="camera" size={18} /> {passport.child.photo ? 'Change photo' : 'Add a photo'}
                <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && setPhoto(e.target.files[0])} />
              </label>
              <button type="button" className="link" onClick={() => setPickingAvatar(!pickingAvatar)}>
                <Icon name="smile" size={18} /> Pick a picture
              </button>
            </div>
          </div>
        </div>
        {pickingAvatar && (
          <div className="pop" style={{ display: 'grid', gap: 10 }}>
            <div className="avatar-picker" role="group" aria-label="Pick a picture">
              {AVATAR_ICONS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`av-${current.colour}`}
                  aria-label={a}
                  aria-pressed={!passport.child.photo && current.icon === a}
                  onClick={() => setAvatar(a, current.colour)}
                >
                  <Icon name={a} size={24} strokeWidth={2.2} />
                </button>
              ))}
            </div>
            <div className="colour-picker" role="group" aria-label="Pick a colour">
              {AVATAR_COLOURS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`av-${c}`}
                  aria-label={c}
                  aria-pressed={current.colour === c}
                  onClick={() => setAvatar(current.icon ?? 'smile', c)}
                />
              ))}
            </div>
          </div>
        )}
        <label className="field">
          One line about {name}
          <input
            defaultValue={passport.child.aboutMe ?? ''}
            maxLength={120}
            onBlur={async (e) => {
              const aboutMe = e.target.value.trim()
              if (aboutMe === (passport.child.aboutMe ?? '')) return
              await ctx.update((p) => ({ ...p, child: { ...p.child, aboutMe } }))
              saved()
            }}
            placeholder="e.g. Loves buses and humming"
          />
        </label>
      </section>

      <section className="card">
        <h2>Who carers call</h2>
        {passport.contacts.map((c) => (
          <div key={c.id} className="two">
            <label className="field">
              Name
              <input defaultValue={c.name} onBlur={(e) => e.target.value.trim() !== c.name && editContact(c.id, { name: e.target.value.trim() }).then(saved)} />
            </label>
            <label className="field">
              Phone
              <input
                defaultValue={c.phone}
                inputMode="tel"
                onBlur={(e) => e.target.value.trim() !== c.phone && editContact(c.id, { phone: e.target.value.trim() }).then(saved)}
              />
            </label>
            <div className="row" style={{ gridColumn: '1 / -1' }}>
              <label className="toggle">
                <input type="radio" name="primary" checked={c.primary} onChange={() => changeContacts((list) => list.map((x) => ({ ...x, primary: x.id === c.id }))).then(saved)} />
                <span>Call first</span>
              </label>
              {passport.contacts.length > 1 && (
                <button type="button" className="link danger-text" onClick={() => changeContacts((list) => list.filter((x) => x.id !== c.id))}>
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
        <button
          type="button"
          className="secondary"
          onClick={() => changeContacts((list) => [...list, { id: newId('c'), name: '', relation: 'carer', phone: '', primary: false }])}
        >
          + Add someone else to call
        </button>
        <label className="field">
          Emergency number
          <input
            defaultValue={passport.settings.emergencyNumber}
            inputMode="tel"
            onBlur={(e) => {
              const n = e.target.value.trim()
              if (!n || n === passport.settings.emergencyNumber) return
              ctx.update((p) => ({ ...p, settings: { ...p.settings, emergencyNumber: n } })).then(saved)
            }}
          />
        </label>
      </section>

      <section className="card">
        <h2>AI and privacy</h2>
        <AiStatus ctx={ctx} />
        {isExtension ? (
          <p className="muted small">Cloud help is not part of the extension: here, AI runs only on this laptop.</p>
        ) : (
          <label className="toggle">
            <input
              type="checkbox"
              checked={passport.settings.cloudHelp}
              onChange={(e) => {
                // Read the value now: by the time the queued save runs, React has reset the controlled box.
                const on = e.target.checked
                ctx.update((p) => ({ ...p, settings: { ...p.settings, cloudHelp: on } })).then(saved)
              }}
            />
            <span>
              <strong>Cloud help</strong>
              <span className="muted small">
                Off by default. When on, devices without private AI can ask Google's cloud AI while online. KnowMe sends only the question and matching entries, with names and phone
                numbers removed, and never the Medical section.
              </span>
            </span>
          </label>
        )}
      </section>

      <section className="card">
        <h2>Hand the phone to a carer</h2>
        <p className="muted">Carer view shows {name}'s passport, the situation buttons and Call buttons, with nothing to edit.</p>
        <button type="button" className="soft big" onClick={() => ctx.setCarerMode(true)}>
          <Icon name="heart-handshake" size={20} /> Switch to carer view
        </button>
      </section>

      <section className="card">
        <h2>Backup</h2>
        <p className="muted">Everything lives on this device. Save a backup file to move it to a new phone.</p>
        <div className="row">
          <button type="button" className="secondary" onClick={exportFile}>
            <Icon name="download" size={18} /> Save a backup
          </button>
          <label className="button secondary">
            <Icon name="upload" size={18} /> Restore
            <input type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
          </label>
        </div>
        {message && <p className="muted">{message}</p>}
      </section>

      <section className="card danger-zone">
        <h2>Delete everything</h2>
        <p className="muted">Removes {name}'s passport from this device. It can't be undone unless you saved a backup.</p>
        {confirmDelete ? (
          <div className="row">
            <button type="button" className="danger" onClick={wipe}>
              Yes, delete everything
            </button>
            <button type="button" className="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className="secondary danger-text" onClick={() => setConfirmDelete(true)}>
            Delete everything
          </button>
        )}
      </section>
    </Page>
  )
}
