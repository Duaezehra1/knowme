import type { Passport } from './types'

export const CARD_MAX = 300

function firstSentence(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ')
  return t.endsWith('.') ? t : `${t}.`
}

/**
 * Drafts the emergency card from the passport (FR-20). Plain code, no AI: the owner
 * edits it anyway, and it must work offline on any device. Leaves out surname,
 * address and diagnosis by default (PR-05).
 */
export function draftCard(passport: Passport): string {
  const { child, entries, contacts } = passport
  const contact = contacts.find((c) => c.primary) ?? contacts[0]
  const calming = entries.find((e) => e.section === 'calming')
  const allergy = entries.find((e) => e.section === 'medical' && /allerg/i.test(`${e.signal} ${e.whatToDo}`))
  const safety = entries.find((e) => e.section === 'safety')

  const required = [
    `KnowMe card: ${child.firstName}${child.age ? `, ${child.age}` : ''}.`,
    'I may not speak or answer you. Please stay with me, speak softly and do not grab me.',
  ]
  const optional = [
    calming ? `What calms me: ${firstSentence(calming.signal)}` : '',
    allergy ? `Medical: ${firstSentence(allergy.signal)}` : '',
    safety ? `Safety: ${firstSentence(safety.whatToDo || safety.signal)}` : '',
  ].filter(Boolean)
  const call = contact?.phone ? `Please call ${contact.name}: ${contact.phone}` : ''

  const lines = [...required, ...optional]
  // Drop optional lines from the end until it fits with the phone number.
  while (lines.length > required.length && [...lines, call].join('\n').length > CARD_MAX) lines.pop()
  return [...lines, call].filter(Boolean).join('\n').slice(0, CARD_MAX)
}
