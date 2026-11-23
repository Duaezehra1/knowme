import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Icon } from '../components/Icon'
import { Page } from '../components/ui'
import type { AppContext } from '../context'
import { CARD_MAX, draftCard } from '../data/card'

/**
 * The card's plain text lives INSIDE the QR code, so any phone camera shows it with
 * no app and no internet (FR-20 to FR-22, OF-04).
 */
export function Card({ ctx }: { ctx: AppContext }) {
  const { passport } = ctx
  const name = passport.child.firstName
  const [text, setText] = useState(passport.emergencyCard.text || draftCard(passport))
  const [qr, setQr] = useState('')
  const [saved, setSaved] = useState(Boolean(passport.emergencyCard.text))

  useEffect(() => {
    if (!text.trim()) {
      setQr('')
      return
    }
    QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 2, width: 640 })
      .then(setQr)
      .catch(() => setQr(''))
  }, [text])

  async function save() {
    await ctx.update((p) => ({ ...p, emergencyCard: { text: text.trim() } }))
    setSaved(true)
    ctx.toast('Card saved')
  }

  function download() {
    if (!qr) return
    const a = document.createElement('a')
    a.href = qr
    a.download = `${name}-knowme-card.png`
    a.click()
  }

  return (
    <Page ctx={ctx} title="QR card">
      <section className="notice warm no-print">
        <strong className="inline-icon">
          <Icon name="id-card" size={20} /> A card for {name}'s bag, wristband or ID
        </strong>
        <span>If {name} is ever lost, anyone can point a normal phone camera at it and read what to do. No app, no internet.</span>
      </section>

      {qr && (
        <section className="print-card pop" aria-label="Card preview">
          <img src={qr} alt={`QR code that reads: ${text}`} />
          <div>
            <p className="print-title">Scan me with your phone camera</p>
            <pre>{text}</pre>
          </div>
        </section>
      )}

      <div className="row no-print">
        <button type="button" className="primary" onClick={() => window.print()} disabled={!qr}>
          <Icon name="printer" size={18} /> Print
        </button>
        <button type="button" className="secondary" onClick={download} disabled={!qr}>
          <Icon name="download" size={18} /> Save image
        </button>
      </div>

      <section className="card no-print">
        <label className="field" htmlFor="card-text">
          What the card says
          <span className="hint">Anyone who scans it can read it. Only include what a stranger needs: no surname, address or diagnosis.</span>
        </label>
        <textarea
          id="card-text"
          rows={7}
          value={text}
          maxLength={CARD_MAX}
          onChange={(e) => {
            setText(e.target.value)
            setSaved(false)
          }}
        />
        <div className="row between">
          <span className={`small ${text.length > CARD_MAX - 20 ? 'warn' : 'muted'}`}>
            {text.length} / {CARD_MAX}
          </span>
          <button type="button" className="link" onClick={() => setText(draftCard(passport))}>
            <Icon name="refresh" size={16} /> Redraft from the passport
          </button>
        </div>
        <button type="button" className="soft big" onClick={save} disabled={saved || !text.trim()}>
          {saved ? (
            <>
              <Icon name="check" size={18} strokeWidth={3} /> Saved
            </>
          ) : (
            'Save card'
          )}
        </button>
      </section>
    </Page>
  )
}
