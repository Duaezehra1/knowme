/// <reference types="chrome" />
/**
 * KnowMe extension background worker: opens the side panel from the toolbar, and
 * "Add to KnowMe passport" on selected text hands it to the side panel's Paste screen.
 */
import { PENDING_NOTES_KEY, type PendingNotes } from './bridge'

const MENU_ID = 'knowme-add'

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})
  chrome.contextMenus.create({
    id: MENU_ID,
    title: 'Add to KnowMe passport',
    contexts: ['selection'],
  })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.windowId) return
  // Open the panel inside the click (Chrome requires a user gesture), then hand over the text.
  chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {})
  const pending: PendingNotes = {
    text: (info.selectionText ?? '').trim().slice(0, 20000),
    source: tab.title ?? '',
    at: Date.now(),
  }
  if (pending.text) void chrome.storage.session.set({ [PENDING_NOTES_KEY]: pending })
})
