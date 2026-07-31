import { useEffect, useRef } from 'react'

// Football-themed flappy engine. One instance = one attempt ("down").
// Draws everything (world + HUD) on canvas; calls onGameOver(yards) once dead.

interface Props {
  attemptNo: number // 1-based
  totalAttempts: number
  best: number
  onGameOver: (yards: number) => void
}

interface Post {
  x: number
  gapY: number
  scored: boolean
}

export default function FlappyGame({ attemptNo, totalAttempts, best, onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overRef = useRef(onGameOver)
  overRef.current = onGameOver

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const parent = canvas.parentElement!

    let W = 0
    let H = 0
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      W = parent.clientWidth
      H = parent.clientHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    // ---- audio (tiny arcade blips) ----
    let ac: AudioContext | null = null
    const beep = (freq: number, dur: number, type: OscillatorType = 'square', vol = 0.04) => {
      try {
        ac ??= new AudioContext()
        const o = ac.createOscillator()
        const g = ac.createGain()
        o.type = type
        o.frequency.value = freq
        g.gain.value = vol
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur)
        o.connect(g).connect(ac.destination)
        o.start()
        o.stop(ac.currentTime + dur)
      } catch {}
    }

    // ---- world ----
    const GROUND = 84
    const BALL_X = () => W * 0.28
    const R = 15
    const GRAVITY = 1500
    const FLAP = -450
    const POST_W = 62
    const GAP = () => Math.max(160, Math.min(210, H * 0.26))
    const SPACING = () => Math.max(240, W * 0.62)

    let mode: 'ready' | 'run' | 'dead' = 'ready'
    let y = 0
    let vy = 0
    let yards = 0
    let posts: Post[] = []
    let scroll = 0
    let deadAt = 0
    let flashUntil = 0
    let reported = false

    const fieldH = () => H - GROUND
    const speed = () => Math.min(280, 165 + yards * 0.55)

    const reset = () => {
      y = fieldH() / 2
      vy = 0
      yards = 0
      posts = []
      scroll = 0
    }
    reset()

    const spawn = () => {
      const margin = 70
      const gapY = margin + GAP() / 2 + Math.random() * (fieldH() - 2 * margin - GAP())
      posts.push({ x: W + POST_W, gapY, scored: false })
    }

    const flap = () => {
      vy = FLAP
      beep(320, 0.08)
    }

    const onPress = (e: Event) => {
      e.preventDefault()
      if (mode === 'ready') {
        mode = 'run'
        flap()
      } else if (mode === 'run') {
        flap()
      }
    }
    canvas.addEventListener('pointerdown', onPress)
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') onPress(e)
    }
    window.addEventListener('keydown', onKey)

    const die = () => {
      mode = 'dead'
      deadAt = performance.now()
      beep(160, 0.3, 'sawtooth', 0.06)
      setTimeout(() => beep(110, 0.4, 'sawtooth', 0.06), 120)
    }

    // ---- update ----
    const update = (dt: number, now: number) => {
      if (mode === 'ready') {
        y = fieldH() / 2 + Math.sin(now / 350) * 12
        scroll += 60 * dt
        return
      }
      if (mode === 'dead') {
        // ball drops to the turf
        vy += GRAVITY * dt
        y = Math.min(fieldH() - R, y + vy * dt)
        if (!reported && now - deadAt > 500) {
          reported = true
          overRef.current(yards)
        }
        return
      }
      vy = Math.min(760, vy + GRAVITY * dt)
      y += vy * dt
      scroll += speed() * dt

      const last = posts[posts.length - 1]
      if (!last || last.x < W - SPACING()) spawn()

      for (const p of posts) {
        p.x -= speed() * dt
        if (!p.scored && p.x + POST_W < BALL_X() - R) {
          p.scored = true
          yards += 10
          beep(620, 0.07)
          beep(830, 0.09, 'square', 0.05)
          if (yards % 40 === 0) {
            flashUntil = now + 900
            beep(990, 0.15, 'triangle', 0.06)
          }
        }
      }
      posts = posts.filter((p) => p.x > -POST_W - 10)

      // collisions
      if (y - R < 0) {
        y = R
        vy = 0
      }
      if (y + R >= fieldH()) {
        y = fieldH() - R
        die()
        return
      }
      const bx = BALL_X()
      for (const p of posts) {
        if (bx + R > p.x && bx - R < p.x + POST_W) {
          const gapTop = p.gapY - GAP() / 2
          const gapBot = p.gapY + GAP() / 2
          if (y - R < gapTop || y + R > gapBot) {
            die()
            return
          }
        }
      }
    }

    // ---- draw ----
    const draw = (now: number) => {
      // night sky
      const sky = ctx.createLinearGradient(0, 0, 0, H)
      sky.addColorStop(0, '#061027')
      sky.addColorStop(0.55, '#0d2145')
      sky.addColorStop(1, '#123c69')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, W, H)

      // stadium crowd + floodlights
      ctx.fillStyle = 'rgba(255,255,255,0.06)'
      ctx.fillRect(0, H * 0.16, W, H * 0.1)
      for (let i = 0; i < 40; i++) {
        const cx = ((i * 97 - scroll * 0.15) % (W + 40) + W + 40) % (W + 40) - 20
        const cy = H * 0.17 + ((i * 37) % Math.max(1, H * 0.08))
        ctx.fillStyle = i % 3 ? 'rgba(255,255,255,0.16)' : 'rgba(246,196,69,0.35)'
        ctx.beginPath()
        ctx.arc(cx, cy, 2.1, 0, Math.PI * 2)
        ctx.fill()
      }

      // turf
      const gy = fieldH()
      const grass = ctx.createLinearGradient(0, gy, 0, H)
      grass.addColorStop(0, '#1c7c3c')
      grass.addColorStop(1, '#0e5527')
      ctx.fillStyle = grass
      ctx.fillRect(0, gy, W, GROUND)
      // alternating mow stripes + yard lines every 70px
      const stripe = 70
      const off = scroll % (stripe * 2)
      for (let x = -off; x < W + stripe; x += stripe) {
        const idx = Math.floor((x + off) / stripe)
        if (idx % 2 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.05)'
          ctx.fillRect(x, gy, stripe, GROUND)
        }
        ctx.fillStyle = 'rgba(255,255,255,0.75)'
        ctx.fillRect(x, gy + 4, 3, GROUND - 8)
        ctx.save()
        ctx.fillStyle = 'rgba(255,255,255,0.55)'
        ctx.font = 'bold 13px Rubik, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(String(((idx * 10) % 50 + 50) % 50 || 50), x + 1.5, gy + GROUND / 2 + 5)
        ctx.restore()
      }
      ctx.fillStyle = '#f6c445'
      ctx.fillRect(0, gy, W, 3)

      // goalpost gates
      for (const p of posts) {
        drawPosts(ctx, p, GAP(), POST_W, gy)
      }

      // football
      drawBall(ctx, BALL_X(), y, vy, mode, now)

      // HUD
      ctx.textAlign = 'center'
      ctx.fillStyle = '#fff'
      ctx.font = '52px "Bebas Neue", sans-serif'
      ctx.shadowColor = 'rgba(0,0,0,0.6)'
      ctx.shadowBlur = 8
      ctx.fillText(`${yards}`, W / 2, 64)
      ctx.font = '18px "Bebas Neue", sans-serif'
      ctx.fillStyle = '#f6c445'
      ctx.fillText('YARDS', W / 2, 84)
      ctx.textAlign = 'left'
      ctx.font = '16px "Bebas Neue", sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.fillText(`DOWN ${attemptNo}/${totalAttempts}`, 12, 26)
      ctx.textAlign = 'right'
      ctx.fillText(`BEST ${Math.max(best, yards)}`, W - 12, 26)
      ctx.shadowBlur = 0

      if (now < flashUntil) {
        const t = (flashUntil - now) / 900
        ctx.save()
        ctx.globalAlpha = Math.min(1, t * 2)
        ctx.textAlign = 'center'
        ctx.fillStyle = '#ffe66b'
        ctx.font = '34px "Russo One", sans-serif'
        ctx.shadowColor = '#b45309'
        ctx.shadowBlur = 14
        ctx.fillText('FIRST DOWN!', W / 2, H * 0.32)
        ctx.restore()
      }

      if (mode === 'ready') {
        ctx.save()
        ctx.textAlign = 'center'
        const bob = Math.sin(now / 300) * 4
        ctx.fillStyle = '#fff'
        ctx.font = '30px "Russo One", sans-serif'
        ctx.shadowColor = 'rgba(0,0,0,0.7)'
        ctx.shadowBlur = 10
        ctx.fillText('TAP TO SNAP!', W / 2, H * 0.42 + bob)
        ctx.font = '15px Rubik, sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.75)'
        ctx.fillText('tap / space to keep the ball flying', W / 2, H * 0.42 + 30 + bob)
        ctx.restore()
      }
    }

    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000)
      last = now
      update(dt, now)
      draw(now)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', onKey)
      canvas.removeEventListener('pointerdown', onPress)
      ac?.close().catch(() => {})
    }
  }, [attemptNo, totalAttempts, best])

  return <canvas ref={canvasRef} className="game-canvas" />
}

function drawPosts(
  ctx: CanvasRenderingContext2D,
  p: Post,
  gap: number,
  w: number,
  groundY: number,
) {
  const gapTop = p.gapY - gap / 2
  const gapBot = p.gapY + gap / 2
  const post = (x: number, y: number, h: number) => {
    const grad = ctx.createLinearGradient(x, 0, x + w, 0)
    grad.addColorStop(0, '#e8b429')
    grad.addColorStop(0.5, '#ffdf6b')
    grad.addColorStop(1, '#c8921a')
    ctx.fillStyle = grad
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillRect(x + w - 8, y, 8, h)
  }
  // top post + cap
  post(p.x, 0, gapTop)
  ctx.fillStyle = '#fff'
  ctx.fillRect(p.x - 5, gapTop - 12, w + 10, 12)
  // bottom post + cap
  post(p.x, gapBot, groundY - gapBot)
  ctx.fillStyle = '#fff'
  ctx.fillRect(p.x - 5, gapBot, w + 10, 12)
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  vy: number,
  mode: string,
  now: number,
) {
  ctx.save()
  ctx.translate(x, y)
  const tilt = mode === 'run' || mode === 'dead' ? Math.max(-0.6, Math.min(0.9, vy / 650)) : Math.sin(now / 350) * 0.12
  ctx.rotate(tilt)
  // shadow-ish glow
  ctx.shadowColor = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetY = 3
  // body
  const grad = ctx.createLinearGradient(0, -14, 0, 14)
  grad.addColorStop(0, '#a45a2a')
  grad.addColorStop(0.5, '#7c3f14')
  grad.addColorStop(1, '#5e2f0d')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.ellipse(0, 0, 21, 14, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  // stripes
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(-13, -9)
  ctx.quadraticCurveTo(-15, 0, -13, 9)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(13, -9)
  ctx.quadraticCurveTo(15, 0, 13, 9)
  ctx.stroke()
  // laces
  ctx.beginPath()
  ctx.moveTo(-7, 0)
  ctx.lineTo(7, 0)
  ctx.stroke()
  ctx.lineWidth = 1.8
  for (let i = -5; i <= 5; i += 2.5) {
    ctx.beginPath()
    ctx.moveTo(i, -3)
    ctx.lineTo(i, 3)
    ctx.stroke()
  }
  ctx.restore()
}
