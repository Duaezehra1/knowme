import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Entry, Passport } from './types'

/** The device copy is the source of truth (SRS OF-02). Nothing here touches the network. */
interface KnowMeDB extends DBSchema {
  passports: { key: string; value: Passport }
  meta: { key: string; value: string }
}

let dbPromise: Promise<IDBPDatabase<KnowMeDB>> | null = null

function db(): Promise<IDBPDatabase<KnowMeDB>> {
  dbPromise ??= openDB<KnowMeDB>('knowme', 1, {
    upgrade(database) {
      database.createObjectStore('passports', { keyPath: 'id' })
      database.createObjectStore('meta')
    },
  })
  return dbPromise
}

export function newId(prefix = ''): string {
  return prefix + crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

export function nowIso(): string {
  return new Date().toISOString()
}

export async function loadActivePassport(): Promise<Passport | null> {
  const database = await db()
  const id = await database.get('meta', 'activeId')
  if (!id) return null
  return (await database.get('passports', id)) ?? null
}

/** Saves a new version; the screen only confirms after this resolves (NF-12). */
export async function savePassport(passport: Passport): Promise<Passport> {
  const next: Passport = { ...passport, version: passport.version + 1, updatedAt: nowIso() }
  const database = await db()
  const tx = database.transaction(['passports', 'meta'], 'readwrite')
  await tx.objectStore('passports').put(next)
  await tx.objectStore('meta').put(next.id, 'activeId')
  await tx.done
  return next
}

/** Delete everything on this device (FR-27). */
export async function deleteEverything(): Promise<void> {
  const database = await db()
  const tx = database.transaction(['passports', 'meta'], 'readwrite')
  await tx.objectStore('passports').clear()
  await tx.objectStore('meta').clear()
  await tx.done
}

export function createPassport(input: {
  firstName: string
  age?: number
  avatar?: string
  photo?: string
  contactName: string
  contactRelation: string
  phone: string
  country: string
  emergencyNumber: string
}): Passport {
  return {
    id: newId('p'),
    schemaVersion: 1,
    version: 0,
    updatedAt: nowIso(),
    child: { firstName: input.firstName.trim(), age: input.age, avatar: input.avatar, photo: input.photo },
    entries: [],
    contacts: [
      {
        id: newId('c'),
        name: input.contactName.trim() || 'Parent',
        relation: input.contactRelation.trim() || 'parent',
        phone: input.phone.trim(),
        primary: true,
      },
    ],
    emergencyCard: { text: '' },
    settings: { cloudHelp: false, emergencyNumber: input.emergencyNumber, country: input.country },
  }
}

export function makeEntry(fields: Omit<Entry, 'id' | 'updatedAt'>): Entry {
  return { ...fields, id: newId('e'), updatedAt: nowIso() }
}

/** JSON backup (FR-28). */
export function exportPassport(passport: Passport): string {
  return JSON.stringify(passport, null, 2)
}

export function importPassport(json: string): Passport {
  const data = JSON.parse(json) as Partial<Passport>
  if (data.schemaVersion !== 1 || !data.id || !data.child?.firstName || !Array.isArray(data.entries)) {
    throw new Error("That file isn't a KnowMe passport backup.")
  }
  return data as Passport
}
