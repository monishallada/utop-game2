// Shared game state. Uses Firebase Realtime Database when VITE_FIREBASE_DB_URL
// is set; otherwise falls back to a local practice mode (BroadcastChannel +
// localStorage) so the app is fully playable on one device without setup.

export type GamePhase = 'lobby' | 'playing' | 'finished'

export interface Player {
  id: string
  name: string
  team: string
  best: number
  attempts: number
  joinedAt: number
}

export interface RoomState {
  phase: GamePhase
  players: Record<string, Player>
}

type Unsub = () => void

export interface Store {
  /** false = local practice mode (no Firebase configured) */
  live: boolean
  join(name: string, team: string): Promise<string>
  report(id: string, best: number, attempts: number): Promise<void>
  setPhase(phase: GamePhase): Promise<void>
  reset(): Promise<void>
  onState(cb: (state: RoomState) => void): Unsub
}

const DB_URL = (import.meta.env.VITE_FIREBASE_DB_URL as string | undefined)?.trim()

const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

// ---------------------------------------------------------------- Firebase --

async function createFirebaseStore(dbUrl: string): Promise<Store> {
  const { initializeApp } = await import('firebase/app')
  const { getDatabase, ref, onValue, set, update } = await import('firebase/database')
  const app = initializeApp({ databaseURL: dbUrl })
  const db = getDatabase(app)
  const room = ref(db, 'rooms/main')

  return {
    live: true,
    async join(name, team) {
      const id = newId()
      const player: Player = { id, name, team, best: 0, attempts: 0, joinedAt: Date.now() }
      await set(ref(db, `rooms/main/players/${id}`), player)
      return id
    },
    async report(id, best, attempts) {
      await update(ref(db, `rooms/main/players/${id}`), { best, attempts })
    },
    async setPhase(phase) {
      await set(ref(db, 'rooms/main/phase'), phase)
    },
    async reset() {
      await set(room, { phase: 'lobby', players: null })
    },
    onState(cb) {
      return onValue(room, (snap) => {
        const v = (snap.val() ?? {}) as Partial<RoomState>
        cb({ phase: v.phase ?? 'lobby', players: v.players ?? {} })
      })
    },
  }
}

// ------------------------------------------------------- Local (practice) --

function createLocalStore(): Store {
  const KEY = 'utop_room'
  const chan = 'BroadcastChannel' in window ? new BroadcastChannel('utop_room') : null
  const listeners = new Set<(s: RoomState) => void>()

  const load = (): RoomState => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const v = JSON.parse(raw) as Partial<RoomState>
        return { phase: v.phase ?? 'lobby', players: v.players ?? {} }
      }
    } catch {}
    return { phase: 'lobby', players: {} }
  }

  const emit = () => {
    const s = load()
    listeners.forEach((cb) => cb(s))
  }

  const save = (s: RoomState) => {
    localStorage.setItem(KEY, JSON.stringify(s))
    chan?.postMessage('sync')
    emit()
  }

  chan?.addEventListener('message', emit)
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) emit()
  })

  return {
    live: false,
    async join(name, team) {
      const s = load()
      const id = newId()
      s.players[id] = { id, name, team, best: 0, attempts: 0, joinedAt: Date.now() }
      save(s)
      return id
    },
    async report(id, best, attempts) {
      const s = load()
      const p = s.players[id]
      if (p) {
        p.best = best
        p.attempts = attempts
        save(s)
      }
    },
    async setPhase(phase) {
      const s = load()
      s.phase = phase
      save(s)
    },
    async reset() {
      save({ phase: 'lobby', players: {} })
    },
    onState(cb) {
      listeners.add(cb)
      cb(load())
      return () => listeners.delete(cb)
    },
  }
}

// -------------------------------------------------------------------- init --

let storePromise: Promise<Store> | null = null

export function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = DB_URL
      ? createFirebaseStore(DB_URL).catch((err) => {
          console.error('Firebase init failed, falling back to practice mode', err)
          return createLocalStore()
        })
      : Promise.resolve(createLocalStore())
  }
  return storePromise
}
