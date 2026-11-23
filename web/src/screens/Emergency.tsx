import { Avatar, CallButtons, EntryCard, Page } from '../components/ui'
import type { AppContext } from '../context'
import type { SectionId } from '../data/types'

const ORDER: SectionId[] = ['safety', 'medical', 'calming']

/** No AI here: instant, offline, and the same every time (FR-12, NF-01). Kept short on purpose. */
export function Emergency({ ctx, said }: { ctx: AppContext; said: string }) {
  const { passport } = ctx
  const name = passport.child.firstName
  const entries = [
    ...ORDER.flatMap((s) => passport.entries.filter((e) => e.section === s)),
    // Only the first two ways of communicating; the rest are a tap away in Ask.
    ...passport.entries.filter((e) => e.section === 'communication').slice(0, 2),
  ]

  return (
    <Page ctx={ctx} title="Emergency" back="/">
      <section className="alert pop" role="alert">
        <div className="row">
          <Avatar passport={passport} size={56} />
          <h2>If {name} is in danger, call {passport.settings.emergencyNumber} now.</h2>
        </div>
        {said && <p>You said: “{said}”</p>}
        <CallButtons passport={passport} variant="alert" />
      </section>

      <h2>What {name}'s family wants you to know</h2>
      {entries.length === 0 ? (
        <p className="notice warm">There are no safety or medical notes yet. Call the parent.</p>
      ) : (
        entries.map((e) => <EntryCard key={e.id} entry={e} />)
      )}
      <p className="muted small center">KnowMe doesn't give medical advice. Follow the emergency operator's instructions.</p>
    </Page>
  )
}
