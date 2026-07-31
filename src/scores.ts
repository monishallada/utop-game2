import { Player } from './store'
import { TEAMS, Team } from './teams'

export interface TeamRow {
  team: Team
  total: number
  count: number
  finished: number
  topPlayer?: Player
}

export function teamRows(players: Record<string, Player>): TeamRow[] {
  const list = Object.values(players)
  const rows = TEAMS.map((team) => {
    const members = list.filter((p) => p.team === team.id)
    const total = members.reduce((sum, p) => sum + (p.best || 0), 0)
    const finished = members.filter((p) => p.attempts >= 5).length
    const topPlayer = members.slice().sort((a, b) => b.best - a.best)[0]
    return { team, total, count: members.length, finished, topPlayer }
  })
  return rows.sort((a, b) => b.total - a.total || b.count - a.count)
}

export function topPlayers(players: Record<string, Player>, n: number): Player[] {
  return Object.values(players)
    .filter((p) => p.best > 0)
    .sort((a, b) => b.best - a.best)
    .slice(0, n)
}
