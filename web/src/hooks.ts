import { useCallback, useEffect, useState } from 'react'
import { deviceStatus, type DeviceStatus } from './ai/model'

/** Hash routes keep the app a single offline file set (no server routing needed). */
export function useRoute(): [string, (path: string) => void] {
  const read = () => location.hash.replace(/^#/, '') || '/'
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const onChange = () => {
      setRoute(read())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  const navigate = useCallback((path: string) => {
    location.hash = path
  }, [])
  return [route, navigate]
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}

/** On-device AI status, re-checked on demand (after a download finishes). */
export function useDeviceStatus(): [DeviceStatus, () => void] {
  const [status, setStatus] = useState<DeviceStatus>('checking')
  const refresh = useCallback(() => {
    deviceStatus().then(setStatus)
  }, [])
  useEffect(refresh, [refresh])
  return [status, refresh]
}

/** Seconds since `running` became true, for slow on-device work (never looks frozen). */
export function useElapsed(running: boolean): number {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!running) return
    const started = Date.now()
    setSeconds(0)
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [running])
  return seconds
}
