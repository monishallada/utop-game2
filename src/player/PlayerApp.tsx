import { useEffect, useMemo, useState } from 'react'
import { useRoom } from '../useRoom'
import { TEAMS, teamById } from '../teams'
import FlappyGame from './FlappyGame'
import { TeamLeaderboard, MvpList } from '../Leaderboard'
import { teamRows } from '../scores'

const PID_KEY = 'utop_pid'
const MAX_ATTEMPTS = 5

export default function PlayerApp() {
  const { store, state, loaded } = useRoom()
  const [pid, setPid] = useState<string | null>(() => localStorage.getItem(PID_KEY))

  const me = pid ? state.players[pid] : undefined

  // If the host reset the game, our old id is gone — back to the join form.
  useEffect(() => {
    if (loaded && pid && !state.players[pid]) {
      localStorage.removeItem(PID_KEY)
      setPid(null)
    }
  }, [loaded, pid, state.players])

  if (!loaded || !store) {
    return (
      <div className="player field-bg center-screen">
        <div className="big-emoji wait-bounce">🏈</div>
        <p className="muted">Loading the stadium…</p>
      </div>
    )
  }

  if (state.phase === 'finished') {
    return <FinalScreen players={state.players} myTeam={me?.team} myBest={me?.best ?? 0} />
  }

  if (!me) {
    return (
      <JoinScreen
        onJoin={async (name, team) => {
          const id = await store.join(name, team)
          localStorage.setItem(PID_KEY, id)
          setPid(id)
        }}
      />
    )
  }

  if (state.phase === 'lobby') {
    return <LobbyScreen me={me} players={state.players} />
  }

  // phase === 'playing'
  if (me.attempts >= MAX_ATTEMPTS) {
    return (
      <div className="player field-bg center-screen">
        <div className="big-emoji">🏁</div>
        <h2 className="hype-title">ALL 5 DOWNS PLAYED!</h2>
        <div className="score-huge">{me.best}</div>
        <div className="score-label">YOUR BEST — LOCKED IN FOR {teamById(me.team).name.toUpperCase()}</div>
        <p className="muted">Watch the big screen for the final leaderboard… 👀</p>
      </div>
    )
  }

  return (
    <GameFlow
      key={pid}
      me={me}
      onReport={(best, attempts) => store.report(me.id, best, attempts)}
    />
  )
}

// ------------------------------------------------------------------ screens

function JoinScreen({ onJoin }: { onJoin: (name: string, team: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [team, setTeam] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const ready = name.trim().length > 0 && team !== null

  return (
    <div className="player field-bg join-screen">
      <h1 className="join-title">
        <span className="title-utop">UTOP</span> <span className="title-flappy">FLAPPYBIRD</span> 🏈
      </h1>
      <div className="join-card">
        <label className="join-label">YOUR NAME</label>
        <input
          className="input"
          maxLength={18}
          placeholder="e.g. Lightning Larry"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="join-label">PICK YOUR SQUAD</label>
        <div className="pick-grid">
          {TEAMS.map((t) => (
            <button
              key={t.id}
              className={`pick-card ${team === t.id ? 'pick-selected' : ''}`}
              style={{ borderColor: team === t.id ? t.color : undefined, color: t.color }}
              onClick={() => setTeam(t.id)}
            >
              <span className="pick-emoji">{t.emoji}</span>
              <span className="pick-name">{t.name}</span>
            </button>
          ))}
        </div>
        <button
          className="btn-mega btn-full"
          disabled={!ready || busy}
          onClick={async () => {
            if (!ready) return
            setBusy(true)
            try {
              await onJoin(name.trim(), team!)
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? 'SUITING UP…' : '🏟️ JOIN THE LOBBY'}
        </button>
      </div>
    </div>
  )
}

function LobbyScreen({
  me,
  players,
}: {
  me: { name: string; team: string }
  players: Record<string, { team: string }>
}) {
  const team = teamById(me.team)
  const teammates = useMemo(
    () => Object.values(players).filter((p) => p.team === me.team).length,
    [players, me.team],
  )
  const total = Object.keys(players).length
  return (
    <div className="player field-bg center-screen">
      <div className="big-emoji wait-bounce">{team.emoji}</div>
      <h2 className="hype-title">YOU'RE ON {team.name.toUpperCase()}!</h2>
      <div className="lobby-chip" style={{ borderColor: team.color, color: team.color }}>
        {me.name}
      </div>
      <p className="lobby-stats">
        {teammates} on your squad · {total} in the stadium
      </p>
      <div className="waiting-pill">
        <span className="live-dot" /> Waiting for kickoff — eyes on the big screen!
      </div>
      <p className="muted tip">
        🏈 How to play: tap to keep the football flying through the goalposts. Every gate = 10
        yards. You get 5 downs — your best run counts for your squad!
      </p>
    </div>
  )
}

function GameFlow({
  me,
  onReport,
}: {
  me: { id: string; name: string; team: string; best: number; attempts: number }
  onReport: (best: number, attempts: number) => void
}) {
  const [result, setResult] = useState<number | null>(null)
  const team = teamById(me.team)
  const attemptNo = me.attempts + 1

  return (
    <div className="player game-wrap">
      <div className="game-canvas-wrap">
        <FlappyGame
          key={me.attempts}
          attemptNo={attemptNo}
          totalAttempts={MAX_ATTEMPTS}
          best={me.best}
          onGameOver={(yards) => {
            setResult(yards)
            onReport(Math.max(me.best, yards), me.attempts + 1)
          }}
        />
        {result !== null && (
          <div className="overlay">
            <div className="overlay-card">
              <div className="overlay-flag">🚩 TACKLED!</div>
              <div className="score-huge">{result}</div>
              <div className="score-label">YARDS THIS DOWN</div>
              <div className="overlay-best">
                BEST: <b>{Math.max(me.best, result)}</b> · squad {team.emoji}
              </div>
              {me.attempts + 1 < MAX_ATTEMPTS ? (
                <button className="btn-mega btn-full" onClick={() => setResult(null)}>
                  🏈 NEXT DOWN ({MAX_ATTEMPTS - me.attempts - 1} left)
                </button>
              ) : (
                <button className="btn-mega btn-full" onClick={() => setResult(null)}>
                  🏁 LOCK IN MY SCORE
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FinalScreen({
  players,
  myTeam,
  myBest,
}: {
  players: Record<string, any>
  myTeam?: string
  myBest: number
}) {
  const rank = myTeam ? teamRows(players).findIndex((r) => r.team.id === myTeam) + 1 : 0
  const team = myTeam ? teamById(myTeam) : null
  return (
    <div className="player field-bg final-player">
      <h2 className="final-title">🏆 FINAL RESULTS 🏆</h2>
      {team && (
        <p className="lobby-stats">
          {team.emoji} {team.name} finished <b>#{rank}</b> — you put up <b>{myBest} yds</b>
        </p>
      )}
      <TeamLeaderboard players={players} final />
      <MvpList players={players} n={5} />
    </div>
  )
}
