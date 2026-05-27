import { useMemo } from 'react'
import { motion } from 'motion/react'
import { parseISO } from 'date-fns'

const WORK_START = 9   // 9 AM
const WORK_END   = 18  // 6 PM
const WORK_HOURS_PER_DAY = WORK_END - WORK_START  // 9 hours
const WORK_DAYS = 5   // Mon–Fri

/**
 * Calculates productivity score:
 * (hours of events within 9am–6pm Mon–Fri) / (total possible 45h per week) * 100
 */
function calcScore(events) {
  let scheduledMinutes = 0
  for (const ev of events) {
    const startStr = ev.start?.dateTime
    const endStr = ev.end?.dateTime
    if (!startStr || !endStr) continue
    try {
      const start = parseISO(startStr)
      const end   = parseISO(endStr)
      // Only count Mon–Fri
      const dow = start.getDay() // 0=Sun,6=Sat
      if (dow === 0 || dow === 6) continue
      // Clamp to 9am–6pm window
      const dayStart = new Date(start)
      dayStart.setHours(WORK_START, 0, 0, 0)
      const dayEnd = new Date(start)
      dayEnd.setHours(WORK_END, 0, 0, 0)
      const clampedStart = start < dayStart ? dayStart : start
      const clampedEnd   = end > dayEnd ? dayEnd : end
      if (clampedEnd > clampedStart) {
        scheduledMinutes += (clampedEnd - clampedStart) / 60000
      }
    } catch { /* skip */ }
  }
  const totalAvailable = WORK_HOURS_PER_DAY * WORK_DAYS * 60
  return Math.min(Math.round((scheduledMinutes / totalAvailable) * 100), 100)
}

function grade(score) {
  if (score >= 90) return { letter: 'A+', label: 'Packed week!' }
  if (score >= 75) return { letter: 'A',  label: 'Very productive' }
  if (score >= 60) return { letter: 'B+', label: 'On track' }
  if (score >= 45) return { letter: 'B',  label: 'Good pace' }
  if (score >= 30) return { letter: 'C',  label: 'Getting there' }
  return { letter: 'C-', label: 'Light week' }
}

export default function ProductivityScore({ events, loading }) {
  const score = useMemo(() => calcScore(events), [events])
  const { letter, label } = grade(score)

  const SIZE = 120
  const STROKE = 10
  const R = (SIZE - STROKE) / 2
  const CIRC = 2 * Math.PI * R
  const dash = (score / 100) * CIRC

  // Color transitions: red → yellow → green
  const color = score >= 70 ? '#30D158' : score >= 40 ? '#FF9F0A' : '#FF453A'

  return (
    <div className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-neutral-800 bg-neutral-950 min-w-[128px]">
      {loading ? (
        <div className="size-[120px] rounded-full bg-neutral-900 animate-pulse" />
      ) : (
        <div className="relative">
          <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx={SIZE / 2} cy={SIZE / 2} r={R}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={STROKE}
            />
            <motion.circle
              cx={SIZE / 2} cy={SIZE / 2} r={R}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              initial={{ strokeDashoffset: CIRC }}
              animate={{ strokeDashoffset: CIRC - dash }}
              transition={{ duration: 1.4, delay: 0.3, ease: 'easeOut' }}
              style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
            />
          </svg>
          {/* Center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-black" style={{ color }}>{score}</span>
            <span className="text-[9px] text-neutral-500 font-medium">/ 100</span>
          </div>
        </div>
      )}

      <div className="text-center">
        <div className="text-xs font-semibold text-white">
          Productivity
        </div>
        {!loading && (
          <>
            <div className="text-[10px] font-bold mt-0.5" style={{ color }}>
              {letter}
            </div>
            <div className="text-[10px] text-neutral-500">{label}</div>
          </>
        )}
      </div>
    </div>
  )
}
