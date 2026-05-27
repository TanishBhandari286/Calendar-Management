import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import api from '../api/client'

const WORK_SECS  = 45 * 60   // 45 min
const BREAK_SECS = 10 * 60   // 10 min

/** Web Audio beep — no external file needed */
function beep(freq = 440, duration = 600, volume = 0.3) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration / 1000)
  } catch { /* Safari private mode may block */ }
}

function pad(n) { return String(n).padStart(2, '0') }

function formatTime(secs) {
  return `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`
}

/** Single SVG countdown ring */
function CountdownRing({ remaining, total, color, size = 180 }) {
  const STROKE = 10
  const R = (size - STROKE) / 2
  const CIRC = 2 * Math.PI * R
  const pct  = remaining / total
  const dash = pct * CIRC

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={R} fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth={STROKE} />
      <motion.circle
        cx={size/2} cy={size/2} r={R}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={CIRC}
        animate={{ strokeDashoffset: CIRC - dash }}
        transition={{ duration: 0.5, ease: 'linear' }}
        style={{ filter: `drop-shadow(0 0 8px ${color}66)` }}
      />
    </svg>
  )
}

export default function PomodoroTimer({ onEventCreated }) {
  // phase: 'idle' | 'work' | 'break'
  const [phase, setPhase]         = useState('idle')
  const [remaining, setRemaining] = useState(WORK_SECS)
  const [taskName, setTaskName]   = useState('')
  const [showModal, setShowModal] = useState(false)
  const [session, setSession]     = useState(0)   // # of work sessions completed
  const [creating, setCreating]   = useState(false)
  const [modalInput, setModalInput] = useState('')
  const intervalRef = useRef(null)

  const total = phase === 'break' ? BREAK_SECS : WORK_SECS
  const color = phase === 'break' ? '#30D158' : '#0A84FF'

  // Tick countdown
  useEffect(() => {
    if (phase === 'idle') return
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current)
          handlePhaseEnd()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [phase])   // eslint-disable-line

  function handlePhaseEnd() {
    if (phase === 'work') {
      beep(660, 800, 0.35)
      setPhase('break')
      setRemaining(BREAK_SECS)
      setSession(s => s + 1)
      if (Notification.permission === 'granted') {
        new Notification('🎉 Work session done!', { body: `Take a 10-minute break. Session #${session + 1} complete.` })
      }
    } else {
      beep(880, 400, 0.25)
      setPhase('idle')
      setRemaining(WORK_SECS)
      if (Notification.permission === 'granted') {
        new Notification('⏰ Break over!', { body: 'Ready for another session?' })
      }
    }
  }

  const requestStart = useCallback(() => {
    Notification.requestPermission()
    setModalInput('')
    setShowModal(true)
  }, [])

  const confirmStart = useCallback(async () => {
    const name = modalInput.trim() || 'Focus Session'
    setTaskName(name)
    setShowModal(false)
    setPhase('work')
    setRemaining(WORK_SECS)
    beep(440, 300, 0.2)

    // Create Google Calendar event
    setCreating(true)
    try {
      const now   = new Date()
      const end   = new Date(now.getTime() + WORK_SECS * 1000)
      const toISO = (d) => {
        const off = -d.getTimezoneOffset()
        const sign = off >= 0 ? '+' : '-'
        const abs  = Math.abs(off)
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${pad(Math.floor(abs/60))}:${pad(abs%60)}`
      }
      await api.post('/chat', {
        message: `Create a calendar event called "${name}" from ${toISO(now)} to ${toISO(end)} with description "Pomodoro focus session - 45 minutes". Skip conflict check for this one.`
      })
      onEventCreated?.()
    } catch { /* silently fail — timer still runs */ }
    finally { setCreating(false) }
  }, [modalInput, onEventCreated])

  const stop = useCallback(() => {
    clearInterval(intervalRef.current)
    setPhase('idle')
    setRemaining(WORK_SECS)
    setTaskName('')
  }, [])

  return (
    <>
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 flex flex-col items-center gap-4 h-full">
        {/* Session badge */}
        <div className="flex items-center gap-2 self-start">
          <span className="text-xs font-semibold text-white font-display">Pomodoro</span>
          {session > 0 && (
            <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-400">
              {session} done
            </span>
          )}
        </div>

        {/* Ring + time */}
        <div className="relative flex-1 flex items-center justify-center">
          <CountdownRing remaining={remaining} total={total} color={color} size={160} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-3xl font-black font-display tabular-nums" style={{ color }}>
              {formatTime(remaining)}
            </div>
            <div className="text-[10px] text-neutral-500 mt-1 capitalize">
              {phase === 'idle' ? 'Ready' : phase === 'work' ? 'Focus' : 'Break'}
            </div>
          </div>
        </div>

        {/* Task name */}
        {taskName && phase !== 'idle' && (
          <div className="text-center">
            <div className="text-xs text-neutral-500">Working on</div>
            <div className="text-sm font-semibold text-white truncate max-w-[180px]">"{taskName}"</div>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2 w-full">
          {phase === 'idle' ? (
            <button
              onClick={requestStart}
              className="flex-1 rounded-xl bg-white py-2.5 text-sm font-bold text-black
                         transition-all hover:bg-neutral-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]"
            >
              Start Focus
            </button>
          ) : (
            <>
              <button
                onClick={stop}
                className="flex-1 rounded-xl border border-neutral-700 py-2.5 text-sm font-medium
                           text-neutral-400 hover:border-neutral-500 hover:text-white transition-colors"
              >
                Stop
              </button>
              {phase === 'work' && (
                <button
                  onClick={() => { clearInterval(intervalRef.current); handlePhaseEnd() }}
                  className="flex-1 rounded-xl border border-neutral-700 py-2.5 text-sm font-medium
                             text-neutral-400 hover:border-neutral-500 hover:text-white transition-colors"
                >
                  Skip →
                </button>
              )}
            </>
          )}
        </div>

        {/* Phase info */}
        <p className="text-[10px] text-neutral-700 text-center">
          {phase === 'idle'
            ? '45 min work · 10 min break'
            : phase === 'work'
            ? 'Event created in your calendar ✓'
            : 'Stretch, hydrate, relax ☕'}
        </p>
      </div>

      {/* Task name modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div
              className="relative w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl"
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="mb-1 text-2xl text-center">⏱️</div>
              <h3 className="mb-1 text-center text-base font-bold font-display">Start Focus Session</h3>
              <p className="mb-5 text-center text-xs text-neutral-500">
                What are you working on? A 45-min event will be created in your calendar.
              </p>
              <input
                autoFocus
                value={modalInput}
                onChange={e => setModalInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmStart()}
                placeholder="e.g. DSA — Graph problems"
                className="w-full rounded-xl border border-neutral-800 bg-black px-4 py-3 text-sm
                           text-white placeholder-neutral-600 outline-none focus:border-neutral-600 mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-neutral-800 py-2.5 text-sm text-neutral-400
                             hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmStart}
                  className="flex-1 rounded-xl bg-white py-2.5 text-sm font-bold text-black
                             hover:bg-neutral-200 transition-colors"
                >
                  Start 🚀
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
