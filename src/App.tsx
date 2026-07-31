import HostApp from './host/HostApp'
import PlayerApp from './player/PlayerApp'

export default function App() {
  const isPlayer = window.location.pathname.startsWith('/play')
  return isPlayer ? <PlayerApp /> : <HostApp />
}
