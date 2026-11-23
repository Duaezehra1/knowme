import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { sectionInfo } from '../data/rules'
import type { Entry } from '../data/types'
import { Icon, IconBadge } from './Icon'

/**
 * "Get to know {name}" flashcards: front = what you'll see, back = what it means and
 * what helps. Tap to flip, swipe or use the arrows to move. Works offline, no AI.
 */
export function Flashcards({ entries, name }: { entries: Entry[]; name: string }) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const startX = useRef<number | null>(null)
  if (entries.length === 0) return null

  const entry = entries[Math.min(index, entries.length - 1)]
  const info = sectionInfo(entry.section)
  const hasBack = Boolean(entry.meaning || entry.whatToDo)

  function go(delta: number) {
    setFlipped(false)
    setIndex((i) => (i + delta + entries.length) % entries.length)
  }

  function onPointerDown(e: PointerEvent) {
    startX.current = e.clientX
  }
  function onPointerUp(e: PointerEvent) {
    if (startX.current === null) return
    const dx = e.clientX - startX.current
    startX.current = null
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
    else if (hasBack) setFlipped((f) => !f)
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') go(1)
    else if (e.key === 'ArrowLeft') go(-1)
    else if ((e.key === 'Enter' || e.key === ' ') && hasBack) {
      e.preventDefault()
      setFlipped((f) => !f)
    }
  }

  return (
    <section className="deck" aria-roledescription="flashcards" aria-label={`Get to know ${name}`}>
      <div className="deck-head">
        <span className="eyebrow">
          Card {index + 1} of {entries.length}
        </span>
        <div className="deck-dots" aria-hidden="true">
          {entries.map((e, i) => (
            <span key={e.id} className={i === index ? 'on' : ''} />
          ))}
        </div>
      </div>

      <div
        className={`flashcard tone-${entry.section} ${flipped ? 'flipped' : ''}`}
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={flipped ? `${entry.meaning} ${entry.whatToDo}` : `${entry.signal}. ${hasBack ? 'Tap to flip.' : ''}`}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onKeyDown={onKey}
      >
        <div className="fc-inner" key={entry.id}>
          <div className="fc-face fc-front">
            <div className="fc-top">
              <IconBadge name={info.icon} tone={entry.section} size={40} />
              <span>{info.title}</span>
            </div>
            <p className="fc-signal">{entry.signal}</p>
            {hasBack && (
              <span className="fc-hint">
                <Icon name="rotate-ccw" size={16} /> Tap to see what it means
              </span>
            )}
          </div>
          {hasBack && (
            <div className="fc-face fc-back">
              <div className="fc-top">
                <IconBadge name={info.icon} tone={entry.section} size={40} />
                <span>{entry.signal}</span>
              </div>
              {entry.meaning && (
                <div className="fc-block">
                  <span className="k">It means</span>
                  <p>{entry.meaning}</p>
                </div>
              )}
              {entry.whatToDo && (
                <div className="fc-block">
                  <span className="k">What helps</span>
                  <p>{entry.whatToDo}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="deck-controls">
        <button type="button" className="icon-button" onClick={() => go(-1)} aria-label="Previous card">
          <Icon name="chevron-left" size={22} />
        </button>
        <button type="button" className="secondary" onClick={() => setFlipped((f) => !f)} disabled={!hasBack}>
          <Icon name="rotate-ccw" size={18} /> Flip
        </button>
        <button type="button" className="icon-button" onClick={() => go(1)} aria-label="Next card">
          <Icon name="chevron-right" size={22} />
        </button>
      </div>
    </section>
  )
}
