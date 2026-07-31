import { useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useRoom } from '../useRoom'
import { TEAMS } from '../teams'
import { Player } from '../store'
import { TeamLeaderboard, MvpList } from '../Leaderboard'

const TARGET = 180

export default function HostApp() {
  const { store, state, loaded } = useRoom()
  const players = state.players
  const count = Object.keys(players).length
  const playUrl = `${window.location.origin}/play`

  if (!loaded || !store) {
    return (
      <div className="host stadium">
        <Title />
        <p className="muted center">Warming up the stadium…</p>
      </div>
    )
  }

  return (
    <div className="host stadium">
      {!store.live && (
        <div className="banner">
          ⚠️ Practice mode — Firebase isn’t configured yet, so phones can’t connect. See the
          README to go live (2 min setup).
        </div>
      )}
      <Title />
      {state.phase === 'lobby' && (
        <LobbyView playUrl={playUrl} players={players} count={count} onStart={() => {
          if (window.confirm(`Kick off with ${count} players?`)) store.setPhase('playing')
        }} />
      )}
      {state.phase === 'playing' && (
        <LiveView players={players} count={count} onFinish={() => {
          if (window.confirm('End the game and reveal the final leaderboard?')) store.setPhase('finished')
        }} />
      )}
      {state.phase === 'finished' && (
        <FinalView players={players} onReset={() => {
          if (window.confirm('Reset EVERYTHING? All players and scores will be wiped.')) store.reset()
        }} />
      )}
    </div>
  )
}

function Title() {
  return (
    <header className="title-wrap">
      <div className="title-line">
        <span className="title-ball spin-l">🏈</span>
        <h1 className="mega-title">
          <span className="title-utop">UTOP</span> <span className="title-flappy">FLAPPYBIRD</span>
        </h1>
        <span className="title-ball spin-r">🏈</span>
      </div>
      <div className="title-sub">🏟️ FRIDAY NIGHT LIGHTS EDITION 🏟️</div>
    </header>
  )
}

function LobbyView({
  playUrl,
  players,
  count,
  onStart,
}: {
  playUrl: string
  players: Record<string, Player>
  count: number
  onStart: () => void
}) {
  const recent = useMemo(
    () =>
      Object.values(players)
        .sort((a, b) => b.joinedAt - a.joinedAt)
        .slice(0, 6),
    [players],
  )

  return (
    <div className="lobby-grid">
      <div className="qr-col">
        <div className="qr-card pulse-border">
          <div className="qr-label">📱 SCAN TO SUIT UP</div>
          <div className="qr-box">
            <QRCodeSVG value={playUrl} size={240} marginSize={2} />
          </div>
          <div className="qr-url">{playUrl.replace(/^https?:\/\//, '')}</div>
        </div>
        <div className="count-card">
          <div className="count-big">{count}</div>
          <div className="count-sub">PLAYERS IN THE STADIUM</div>
          <div className="count-target">target: 160–{TARGET}</div>
          <div className="count-track">
            <div className="count-fill" style={{ width: `${Math.min(100, (count / TARGET) * 100)}%` }} />
          </div>
        </div>
        <button className="btn-mega" onClick={onStart}>
          🏈 KICKOFF!
        </button>
        {recent.length > 0 && (
          <div className="ticker">
            {recent.map((p) => (
              <div className="ticker-row" key={p.id}>
                <b>{p.name}</b> joined {TEAMS.find((t) => t.id === p.team)?.name ?? p.team}{' '}
                {TEAMS.find((t) => t.id === p.team)?.emoji}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="teams-col">
        <h3 className="section-label">DEPTH CHART — PICK YOUR SQUAD</h3>
        <div className="team-grid">
          {TEAMS.map((t) => {
            const members = Object.values(players).filter((p) => p.team === t.id)
            return (
              <div className="team-card" key={t.id} style={{ borderColor: t.color }}>
                <div className="team-emoji">{t.emoji}</div>
                <div className="team-name" style={{ color: t.color }}>
                  {t.name}
                </div>
                <div className="team-count">{members.length}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function LiveView({
  players,
  count,
  onFinish,
}: {
  players: Record<string, Player>
  count: number
  onFinish: () => void
}) {
  const finished = Object.values(players).filter((p) => p.attempts >= 5).length
  return (
    <div className="live-wrap">
      <div className="live-status">
        <span className="live-dot" /> GAME LIVE — {finished}/{count} players finished all 5 downs
      </div>
      <div className="live-grid">
        <div>
          <h3 className="section-label">🔥 LIVE SCOREBOARD</h3>
          <TeamLeaderboard players={players} />
        </div>
        <div className="live-side">
          <MvpList players={players} n={8} />
          <button className="btn-mega btn-red" onClick={onFinish}>
            🏁 FINAL WHISTLE
          </button>
        </div>
      </div>
    </div>
  )
}

function FinalView({ players, onReset }: { players: Record<string, Player>; onReset: () => void }) {
  return (
    <div className="final-wrap">
      <Confetti />
      <h2 className="final-title">🏆 FINAL LEADERBOARD 🏆</h2>
      <div className="live-grid">
        <TeamLeaderboard players={players} final />
        <MvpList players={players} n={10} />
      </div>
      <button className="btn-ghost" onClick={onReset}>
        ↺ reset game
      </button>
    </div>
  )
}

function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    let raf = 0
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    const colors = ['#f6c445', '#ff5d5d', '#5bc8ff', '#6ee787', '#c084fc', '#ffffff']
    const bits = Array.from({ length: 160 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      vy: 60 + Math.random() * 120,
      vx: -30 + Math.random() * 60,
      rot: Math.random() * Math.PI,
      vr: -3 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
    }))
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const b of bits) {
        b.y += b.vy * dt
        b.x += b.vx * dt + Math.sin(now / 400 + b.rot) * 0.6
        b.rot += b.vr * dt
        if (b.y > canvas.height + 20) {
          b.y = -20
          b.x = Math.random() * canvas.width
        }
        ctx.save()
        ctx.translate(b.x, b.y)
        ctx.rotate(b.rot)
        ctx.fillStyle = b.color
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h)
        ctx.restore()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])
  return <canvas ref={ref} className="confetti" />
}
