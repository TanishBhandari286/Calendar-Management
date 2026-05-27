import { useEffect, useState, useCallback } from 'react'
import { format, parseISO, isToday, isTomorrow } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

function formatEventTime(isoStr) {
  if (!isoStr) return ''
  try {
    if (isoStr.length === 10) return 'All day'
    return format(parseISO(isoStr), 'h:mm a')
  } catch { return '' }
}

function dayLabel(dateStr) {
  try {
    const d = parseISO(dateStr + 'T00:00:00')
    if (isToday(d)) return 'Today'
    if (isTomorrow(d)) return 'Tomorrow'
    return format(d, 'EEE, MMM d')
  } catch { return dateStr }
}

function groupByDay(events) {
  const groups = {}
  events.forEach(ev => {
    const day = ev.start?.slice(0, 10)
    if (!groups[day]) groups[day] = []
    groups[day].push(ev)
  })
  return groups
}

export default function CalendarSidebar({ onSendPrompt, refreshKey }) {
  const { user, logout } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/calendar/events?days=7')
      setEvents(res.data.events || [])
    } catch { setEvents([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents, refreshKey])

  const grouped = groupByDay(events)
  const dayKeys = Object.keys(grouped).sort()

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-neutral-800 bg-black overflow-hidden">

      {/* ── Header ── */}
      <div className="border-b border-neutral-800 px-4 py-4 space-y-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-white text-sm shrink-0">🗓️</div>
          <div>
            <div className="text-sm font-bold font-display text-white">AI Planner</div>
            <div className="text-[10px] text-neutral-500">Calendar Assistant</div>
          </div>
        </div>

        {/* User profile card */}
        <div className="flex items-center gap-2.5 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5">
          {user?.picture
            ? <img src={user.picture} alt="" className="size-7 rounded-full object-cover ring-1 ring-neutral-700" />
            : <div className="size-7 rounded-full bg-white text-black flex items-center justify-center text-xs font-bold">
                {user?.name?.[0] ?? 'U'}
              </div>}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">{user?.name}</div>
            <div className="text-[10px] text-neutral-500 truncate">{user?.email}</div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="shrink-0 p-1 rounded-md text-neutral-600 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Events list ── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
            Upcoming · 7 days
          </span>
          <button
            onClick={fetchEvents}
            className="text-neutral-600 hover:text-white transition-colors p-1 rounded"
            title="Refresh"
          >
            <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="size-4 border-2 border-neutral-700 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="py-10 text-center space-y-1">
            <p className="text-2xl">📭</p>
            <p className="text-xs text-neutral-500">No upcoming events</p>
            <p className="text-[10px] text-neutral-700">Your next 7 days are clear</p>
          </div>
        )}

        {!loading && dayKeys.map(day => (
          <div key={day} className="mb-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
              {dayLabel(day)}
            </p>
            <div className="space-y-1.5">
              {grouped[day].map(ev => (
                <div
                  key={ev.id}
                  className="group rounded-lg border-l-2 border-white/20 bg-neutral-950 border border-l-white/20
                             border-neutral-800/60 px-3 py-2 transition-colors hover:bg-neutral-900 cursor-default"
                >
                  <div className="text-[10px] text-neutral-500 mb-0.5">
                    {formatEventTime(ev.start)}
                    {ev.end && ` → ${formatEventTime(ev.end)}`}
                  </div>
                  <div className="text-xs text-neutral-200 font-medium truncate">{ev.summary}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick actions ── */}
      <div className="border-t border-neutral-800 px-4 py-3 space-y-1.5">
        {[
          { icon: '📅', label: "Today's schedule", prompt: "What's on my schedule today?" },
          { icon: '📊', label: 'Study hours this week', prompt: 'How many hours have I studied this week?' },
          { icon: '🗓️', label: "This week's agenda",  prompt: "What's on my agenda this week?" },
        ].map(({ icon, label, prompt }) => (
          <button
            key={label}
            onClick={() => onSendPrompt(prompt)}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-neutral-500
                       transition-colors hover:bg-neutral-900 hover:text-neutral-200"
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}
