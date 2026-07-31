export interface Team {
  id: string
  name: string
  emoji: string
  color: string
}

export const TEAMS: Team[] = [
  { id: 'dynasty', name: 'Dynasty', emoji: '👑', color: '#f6c445' },
  { id: 'no-fly-zone', name: 'No Fly Zone', emoji: '✈️', color: '#5bc8ff' },
  { id: 'primetime', name: 'Primetime', emoji: '🌟', color: '#ffb02e' },
  { id: 'the-franchise', name: 'The Franchise', emoji: '🏟️', color: '#c084fc' },
  { id: 'pressure-unit', name: 'Pressure Unit', emoji: '💥', color: '#ff7847' },
  { id: 'team-lockdown', name: 'Team Lockdown', emoji: '🔒', color: '#9fb4c7' },
  { id: 'the-playbook', name: 'The Playbook', emoji: '📖', color: '#6ee787' },
  { id: 'underdogs', name: 'Underdogs', emoji: '🐶', color: '#d2a679' },
  { id: 'x-factor', name: 'X-Factor', emoji: '⚡', color: '#fff06b' },
  { id: 'redzone', name: 'Redzone', emoji: '🔴', color: '#ff5d5d' },
  { id: 'the-blueprint', name: 'The Blueprint', emoji: '📐', color: '#7f9cf5' },
  { id: 'blitz-squad', name: 'Blitz Squad', emoji: '🌪️', color: '#4dd6d0' },
]

export const teamById = (id: string): Team =>
  TEAMS.find((t) => t.id === id) ?? { id, name: id, emoji: '🏈', color: '#888' }
