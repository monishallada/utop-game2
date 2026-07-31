import { Player } from './store'
import { teamRows, topPlayers } from './scores'

const MEDALS = ['🥇', '🥈', '🥉']

export function TeamLeaderboard({
  players,
  final = false,
}: {
  players: Record<string, Player>
  final?: boolean
}) {
  const rows = teamRows(players).filter((r) => r.count > 0 || !final)
  const max = Math.max(1, ...rows.map((r) => r.total))
  return (
    <div className="board">
      {rows.map((r, i) => (
        <div className={`board-row ${final && i < 3 ? `podium podium-${i}` : ''}`} key={r.team.id}>
          <span className="board-rank">{MEDALS[i] ?? `#${i + 1}`}</span>
          <span className="board-emoji">{r.team.emoji}</span>
          <div className="board-mid">
            <div className="board-name-line">
              <span className="board-name">{r.team.name}</span>
              <span className="board-count">{r.count} 🧑‍🤝‍🧑</span>
            </div>
            <div className="board-bar-track">
              <div
                className="board-bar"
                style={{ width: `${(r.total / max) * 100}%`, background: r.team.color }}
              />
            </div>
          </div>
          <span className="board-total" style={{ color: r.team.color }}>
            {r.total}
            <small> yds</small>
          </span>
        </div>
      ))}
    </div>
  )
}

export function MvpList({ players, n = 5 }: { players: Record<string, Player>; n?: number }) {
  const top = topPlayers(players, n)
  if (top.length === 0) return null
  return (
    <div className="mvp-list">
      <h3 className="section-label">🏆 MVP Board</h3>
      {top.map((p, i) => (
        <div className="mvp-row" key={p.id}>
          <span className="board-rank">{MEDALS[i] ?? `#${i + 1}`}</span>
          <span className="mvp-name">{p.name}</span>
          <span className="mvp-yds">{p.best} yds</span>
        </div>
      ))}
    </div>
  )
}
