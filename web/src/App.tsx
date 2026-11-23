import { useCallback, useEffect, useRef, useState } from 'react'
import { loadActivePassport, savePassport } from './data/store'
import type { Passport } from './data/types'
import { isSectionId } from './data/rules'
import { useDeviceStatus, useOnline, useRoute } from './hooks'
import { Toast } from './components/ui'
import { Welcome } from './screens/Welcome'
import { Home } from './screens/Home'
import { Interview } from './screens/Interview'
import { Build } from './screens/Build'
import { SectionView } from './screens/SectionView'
import { Ask } from './screens/Ask'
import { Emergency } from './screens/Emergency'
import { Card } from './screens/Card'
import { Settings } from './screens/Settings'
import { CarerHome } from './screens/CarerHome'
import type { AppContext } from './context'
import { watchPendingNotes, type PendingNotes } from './extension/bridge'

const CARER_KEY = 'knowme.carerMode'

function readCarerMode(): boolean {
  try {
    return sessionStorage.getItem(CARER_KEY) === '1'
  } catch {
    return false
  }
}

export function App() {
  const [passport, setPassport] = useState<Passport | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [route, navigate] = useRoute()
  const online = useOnline()
  const [status, refreshStatus] = useDeviceStatus()
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [carerMode, setCarerModeState] = useState(readCarerMode)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    loadActivePassport()
      .then(setPassport)
      .finally(() => setLoaded(true))
  }, [])

  // Extension only: text sent from "Add to KnowMe passport" opens the Paste screen, filled in.
  const [incoming, setIncoming] = useState<PendingNotes | null>(null)
  useEffect(
    () =>
      watchPendingNotes((p) => {
        setIncoming(p)
        navigate('/paste')
      }),
    [navigate],
  )

  // The latest saved passport, and a queue so quick edits are saved one after another.
  const current = useRef<Passport | null>(null)
  current.current = passport
  const queue = useRef<Promise<void>>(Promise.resolve())

  /** Every change is saved on the device before the screen shows it (NF-12). */
  const update = useCallback((change: (p: Passport) => Passport) => {
    const run = queue.current.then(async () => {
      if (!current.current) return
      const stored = await savePassport(change(current.current))
      current.current = stored
      setPassport(stored)
    })
    queue.current = run.catch(() => {})
    return run
  }, [])

  const toast = useCallback((message: string) => {
    setToastMessage(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastMessage(null), 2200)
  }, [])

  const setCarerMode = useCallback(
    (on: boolean) => {
      try {
        if (on) sessionStorage.setItem(CARER_KEY, '1')
        else sessionStorage.removeItem(CARER_KEY)
      } catch {
        // Private windows may block storage; carer mode then lasts until a reload.
      }
      setCarerModeState(on)
      navigate('/')
    },
    [navigate],
  )

  if (!loaded) return <main className="page" aria-busy="true" />

  if (!passport) {
    return (
      <Welcome
        onCreate={async (p, startInterview) => {
          setPassport(await savePassport(p))
          navigate(startInterview ? '/guide' : '/')
        }}
      />
    )
  }

  const ctx: AppContext = {
    passport,
    update,
    navigate,
    route,
    online,
    status,
    refreshStatus,
    replacePassport: setPassport,
    toast,
    carerMode,
    setCarerMode,
  }
  const [path, query] = route.split('?')
  const params = new URLSearchParams(query ?? '')
  const parts = path.split('/').filter(Boolean)

  // Carer mode is read-and-ask only: editing screens fall back to the carer home.
  const section = carerMode && ['guide', 'paste', 'card', 'settings'].includes(parts[0]) ? '' : parts[0]

  let screen
  switch (section) {
    case 'guide':
      screen = <Interview ctx={ctx} start={isSectionId(parts[1]) ? parts[1] : undefined} />
      break
    case 'paste':
      screen = <Build key={incoming?.at ?? 0} ctx={ctx} initialNotes={incoming?.text} source={incoming?.source} />
      break
    case 'section':
      screen = isSectionId(parts[1]) ? <SectionView ctx={ctx} section={parts[1]} /> : <Home ctx={ctx} />
      break
    case 'ask':
      // Keyed by the link, so a new ?q= or ?s= starts fresh.
      screen = <Ask key={route} ctx={ctx} initial={params.get('q') ?? ''} situationId={params.get('s') ?? ''} />
      break
    case 'emergency':
      screen = <Emergency ctx={ctx} said={params.get('q') ?? ''} />
      break
    case 'card':
      screen = <Card ctx={ctx} />
      break
    case 'settings':
      screen = <Settings ctx={ctx} />
      break
    default:
      screen = carerMode ? <CarerHome ctx={ctx} /> : <Home ctx={ctx} />
  }

  return (
    <>
      {screen}
      <Toast message={toastMessage} />
    </>
  )
}
