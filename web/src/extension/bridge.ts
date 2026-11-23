/// <reference types="chrome" />
/**
 * Hand-off between the extension's right-click menu and the side panel app.
 * On the website there is no `chrome.storage`, so all of this is a no-op there.
 */
export const PENDING_NOTES_KEY = 'knowme.pendingNotes'

export interface PendingNotes {
  text: string
  /** Title of the page the text came from. */
  source: string
  at: number
}

export const isExtension = typeof chrome !== 'undefined' && Boolean(chrome.storage?.session)

/** Calls `onNotes` with text sent from the right-click menu, now and whenever more arrives. */
export function watchPendingNotes(onNotes: (p: PendingNotes) => void): () => void {
  if (!isExtension) return () => {}
  const take = (p: PendingNotes | undefined) => {
    if (!p?.text || Date.now() - p.at > 5 * 60_000) return
    void chrome.storage.session.remove(PENDING_NOTES_KEY)
    onNotes(p)
  }
  chrome.storage.session.get(PENDING_NOTES_KEY).then((d) => take(d[PENDING_NOTES_KEY] as PendingNotes | undefined))
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'session' && changes[PENDING_NOTES_KEY]?.newValue) take(changes[PENDING_NOTES_KEY].newValue as PendingNotes)
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}
