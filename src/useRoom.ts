import { useEffect, useState } from 'react'
import { getStore, RoomState, Store } from './store'

export function useRoom() {
  const [store, setStore] = useState<Store | null>(null)
  const [state, setState] = useState<RoomState>({ phase: 'lobby', players: {} })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let unsub: (() => void) | undefined
    let cancelled = false
    getStore().then((s) => {
      if (cancelled) return
      setStore(s)
      unsub = s.onState((st) => {
        setState(st)
        setLoaded(true)
      })
    })
    return () => {
      cancelled = true
      unsub?.()
    }
  }, [])

  return { store, state, loaded }
}
