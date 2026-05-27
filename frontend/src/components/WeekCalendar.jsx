import { useMemo, useState } from 'react'
import { parseISO, format, startOfWeek, addDays, isToday } from 'date-fns'

const HOUR_START = 8   // 8 AM
const HOUR_END   = 20  // 8 PM
const HOURS      = HOUR_END - HOUR_START  // 12 visible hours
const PX_PER_HOUR = 52  // height of 1 hour row in px

function getWeekDays() {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

function eventPosition(ev) {
  const startStr = ev.start?.dateTime
  const endStr   = ev.end?.dateTime
  if (!startStr || !endStr) return null
  try {
    const start = parseISO(startStr)
    const end   = parseISO(endStr)
    const startH = start.getHours() + start.getMinutes() / 60
    const endH   = end.getHours()   + end.getMinutes()   / 60
    const top    = (startH - HOUR_START) * PX_PER_HOUR
    const height = Math.max((endH - startH) * PX_PER_HOUR, 18)
    return { top, height }
  } catch { return null }
}

function eventColor(ev, goals) {
  if (!goals?.length) return '#ffffff22'
  const title = ev.summary?.toLowerCase() ?? ''
  for (const g of goals) {
    if (title.includes(g.keyword?.toLowerCase())) {
      return g.color
    }
  }
  return '#ffffff22'
}

export default function WeekCalendar({ events, goals }) {
  const [tooltip, setTooltip] = useState(null)
  const days = useMemo(() => getWeekDays(), [])

  // Group events by day (YYYY-MM-DD)
  const byDay = useMemo(() => {
    const map = {}
    for (const ev of events) {
      const key = ev.start?.dateTime?.slice(0, 10) ?? ev.start?.date
      if (key) {
        if (!map[key]) map[key] = []
        map[key].push(ev)
      }
    }
    return map
  }, [events])

  const hourLabels = Array.from({ length: HOURS }, (_, i) => {
    const h = HOUR_START + i
    return h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`
  })

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-neutral-800">
        <div />
        {days.map(day => (
          <div
            key={day.toISOString()}
            className={`py-2.5 text-center border-l border-neutral-800 ${
              isToday(day) ? 'bg-white/5' : ''
            }`}
          >
            <div className={`text-[10px] uppercase tracking-widest font-medium ${
              isToday(day) ? 'text-white' : 'text-neutral-600'
            }`}>
              {format(day, 'EEE')}
            </div>
            <div className={`text-sm font-bold mt-0.5 ${
              isToday(day)
                ? 'flex size-6 mx-auto items-center justify-center rounded-full bg-white text-black'
                : 'text-neutral-400'
            }`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: 320 }}>
        <div className="grid grid-cols-[48px_repeat(7,1fr)]">
          {/* Hour labels column */}
          <div>
            {hourLabels.map(label => (
              <div
                key={label}
                className="flex items-start justify-end pr-2 pt-1 text-[9px] text-neutral-700"
                style={{ height: PX_PER_HOUR }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map(day => {
            const key  = format(day, 'yyyy-MM-dd')
            const dayEvs = byDay[key] ?? []
            return (
              <div
                key={key}
                className={`relative border-l border-neutral-800/60 ${
                  isToday(day) ? 'bg-white/[0.02]' : ''
                }`}
                style={{ height: HOURS * PX_PER_HOUR }}
              >
                {/* Hour lines */}
                {hourLabels.map((_, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 border-t border-neutral-800/40"
                    style={{ top: i * PX_PER_HOUR }}
                  />
                ))}

                {/* Events */}
                {dayEvs.map(ev => {
                  const pos   = eventPosition(ev)
                  const color = eventColor(ev, goals)
                  if (!pos) return null
                  return (
                    <div
                      key={ev.id}
                      className="absolute left-0.5 right-0.5 rounded px-1 overflow-hidden cursor-pointer
                                 flex items-start"
                      style={{
                        top: pos.top,
                        height: pos.height,
                        backgroundColor: color + '30',
                        borderLeft: `2px solid ${color}`,
                      }}
                      onMouseEnter={e => setTooltip({ ev, x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <span className="text-[9px] leading-tight font-medium text-white/80 pt-0.5 line-clamp-2">
                        {ev.summary}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2
                     text-xs shadow-xl pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <div className="font-semibold text-white">{tooltip.ev.summary}</div>
          <div className="text-neutral-400 mt-0.5">
            {tooltip.ev.start?.dateTime
              ? `${format(parseISO(tooltip.ev.start.dateTime), 'h:mm a')} → ${format(parseISO(tooltip.ev.end.dateTime), 'h:mm a')}`
              : 'All day'}
          </div>
        </div>
      )}
    </div>
  )
}
