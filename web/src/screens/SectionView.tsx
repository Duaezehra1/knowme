import { useState } from 'react'
import { Icon, IconBadge } from '../components/Icon'
import { EntryCard, Page } from '../components/ui'
import type { AppContext } from '../context'
import { sectionInfo, withName } from '../data/rules'
import { makeEntry, nowIso } from '../data/store'
import type { Entry, SectionId } from '../data/types'

interface Draft {
  signal: string
  meaning: string
  whatToDo: string
}

const EMPTY: Draft = { signal: '', meaning: '', whatToDo: '' }

/** One section of the passport: read it, or add, edit, delete and reorder by hand (FR-07). */
export function SectionView({ ctx, section }: { ctx: AppContext; section: SectionId }) {
  const info = sectionInfo(section)
  const name = ctx.passport.child.firstName
  const readOnly = ctx.carerMode
  const entries = ctx.passport.entries.filter((e) => e.section === section)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)

  function startEdit(entry: Entry | null) {
    setEditing(entry?.id ?? 'new')
    setDraft(entry ? { signal: entry.signal, meaning: entry.meaning, whatToDo: entry.whatToDo } : EMPTY)
  }

  async function save() {
    const clean = { signal: draft.signal.trim(), meaning: draft.meaning.trim(), whatToDo: draft.whatToDo.trim() }
    if (!clean.signal) return
    await ctx.update((p) => ({
      ...p,
      entries:
        editing === 'new'
          ? [...p.entries, makeEntry({ section, ...clean, source: 'owner' })]
          : p.entries.map((e) => (e.id === editing ? { ...e, ...clean, updatedAt: nowIso() } : e)),
    }))
    setEditing(null)
    ctx.toast('Saved')
  }

  async function remove(id: string) {
    await ctx.update((p) => ({ ...p, entries: p.entries.filter((e) => e.id !== id) }))
    ctx.toast('Deleted')
  }

  async function move(id: string, delta: -1 | 1) {
    await ctx.update((p) => {
      const list = [...p.entries]
      const inSection = list.filter((e) => e.section === section)
      const at = inSection.findIndex((e) => e.id === id)
      const other = inSection[at + delta]
      if (!other) return p
      const i = list.findIndex((e) => e.id === id)
      const j = list.findIndex((e) => e.id === other.id)
      ;[list[i], list[j]] = [list[j], list[i]]
      return { ...p, entries: list }
    })
  }

  const form = (
    <div className="card pop">
      <label className="field">
        {withName(info.signalLabel, name)}
        <input value={draft.signal} onChange={(e) => setDraft({ ...draft, signal: e.target.value })} maxLength={200} autoFocus />
      </label>
      {info.meaningLabel && (
        <label className="field">
          {info.meaningLabel}
          <input value={draft.meaning} onChange={(e) => setDraft({ ...draft, meaning: e.target.value })} maxLength={200} />
        </label>
      )}
      <label className="field">
        {info.whatToDoLabel}
        <input value={draft.whatToDo} onChange={(e) => setDraft({ ...draft, whatToDo: e.target.value })} maxLength={300} />
      </label>
      <div className="row end">
        <button type="button" className="link" onClick={() => setEditing(null)}>
          Cancel
        </button>
        <button type="button" className="primary" onClick={save} disabled={!draft.signal.trim()}>
          Save
        </button>
      </div>
    </div>
  )

  return (
    <Page ctx={ctx} title={info.title} back="/">
      <section className={`card tint-${section} tone-${section}`} style={{ border: 'none' }}>
        <IconBadge name={info.icon} tone={section} size={52} />
        <p className="interview-q" style={{ fontSize: '1.1rem' }}>
          {withName(info.question, name)}
        </p>
      </section>

      {entries.length === 0 && editing === null && (
        <p className="notice warm">{readOnly ? `Nothing here yet. If you're unsure, call the parent.` : `Nothing here yet. Add the first one below.`}</p>
      )}

      {entries.map((entry, i) =>
        editing === entry.id ? (
          <div key={entry.id}>{form}</div>
        ) : (
          <EntryCard
            key={entry.id}
            entry={entry}
            showSection={false}
            actions={
              readOnly ? undefined : (
                <>
                  <button type="button" className="link" onClick={() => startEdit(entry)}>
                    <Icon name="pencil" size={16} /> Edit
                  </button>
                  <button type="button" className="link" onClick={() => move(entry.id, -1)} disabled={i === 0} aria-label="Move up">
                    <Icon name="arrow-up" size={18} />
                  </button>
                  <button type="button" className="link" onClick={() => move(entry.id, 1)} disabled={i === entries.length - 1} aria-label="Move down">
                    <Icon name="arrow-down" size={18} />
                  </button>
                  <button type="button" className="link danger-text" onClick={() => remove(entry.id)}>
                    <Icon name="trash" size={16} /> Delete
                  </button>
                </>
              )
            }
          />
        ),
      )}

      {!readOnly &&
        (editing === 'new' ? (
          form
        ) : (
          <div className="row">
            <button type="button" className="primary big" onClick={() => startEdit(null)}>
              <Icon name="plus" size={20} /> Add to {info.title.toLowerCase()}
            </button>
            <button type="button" className="link" onClick={() => ctx.navigate(`/guide/${section}`)}>
              Use the guided questions instead
            </button>
          </div>
        ))}
    </Page>
  )
}
