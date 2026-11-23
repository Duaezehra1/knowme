import type { Passport } from '../data/types'

/**
 * Removes names and phone numbers before anything goes to the cloud (SRS PR-03).
 * Reliable because names and contacts are stored as separate fields, not guessed from text.
 */
export interface Redactor {
  redact: (text: string) => string
  restore: (text: string) => string
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function makeRedactor(passport: Passport): Redactor {
  const childName = passport.child.firstName.trim()
  const contactNames = passport.contacts.map((c) => c.name.trim()).filter((n) => n.length > 1)
  const phone = /\+?\d[\d\s().-]{6,}\d/g

  return {
    redact(text) {
      let out = text.replace(phone, '[PHONE]')
      if (childName) out = out.replace(new RegExp(`\\b${escape(childName)}\\b`, 'gi'), '[CHILD]')
      contactNames.forEach((name, i) => {
        out = out.replace(new RegExp(`\\b${escape(name)}\\b`, 'gi'), `[CARER${i + 1}]`)
      })
      return out
    },
    restore(text) {
      let out = text.replace(/\[CHILD\]/g, childName || 'the child')
      contactNames.forEach((name, i) => {
        out = out.replace(new RegExp(`\\[CARER${i + 1}\\]`, 'g'), name)
      })
      return out
    },
  }
}
