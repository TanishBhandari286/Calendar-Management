import { useEffect, useState, useCallback } from 'react'
import { format, parseISO, isToday, isTomorrow } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

function formatEventTime(isoStr) {
  if (!isoStr) return ''
  try {
    // Check if it's a date-only string
    if (isoStr.length === 10) return 'All day'
    return format(parseISO(isoStr), 'h:mm a')
  } catch { return '' }
}

function groupEventsByDay(events) {
  const groups = {}
  events.forEach(ev => {
    const dateStr = ev.start?.slice(0, 10)
    if (!groups[dateStr]) groups[dateStr] = []
    groups[dateStr].push(ev)
  })
  return groups
}

function dayLabel(dateStr) {
  try {
    const d = parseISO(dateStr + 'T00:00:00')
    if (isToday(d)) return 'Today'
    if (isTomorrow(d)) return 'Tomorrow'
    return format(d, 'EEE, MMM d')
  } catch { return dateStr }
}

export default function CalendarSidebar({ onSendPrompt }) {
  const { user, logout } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/calendar/events?days=7')
      setEvents(res.data.events || [])
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const grouped = groupEventsByDay(events)
  const dayKeys = Object.keys(grouped).sort()

  return (
    <aside className="sidebar">
      {/* Brand + user header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo">🗓️</div>
          <div>
            <div className="sidebar-brand-name">AI Planner</div>
            <div className="sidebar-brand-sub">Personal Calendar Assistant</div>
          </div>
        </div>

        <div className="user-profile">
          {user?.picture
            ? <img src={user.picture} alt={user.name} className="user-avatar" />
            : <div className="user-avatar-placeholder">{user?.name?.[0] ?? 'U'}</div>}
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-email">{user?.email}</div>
          </div>
          <button className="btn-logout" onClick={logout} title="Sign out">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar events */}
      <div className="sidebar-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div className="sidebar-section-title">Upcoming Events</div>
          <button
            onClick={fetchEvents}
            style={{ color: 'var(--text-muted)', padding: '4px', borderRadius: '6px', transition: 'color 0.2s' }}
            title="Refresh"
            onMouseOver={e => e.target.style.color = 'var(--accent-3)'}
            onMouseOut={e => e.target.style.color = 'var(--text-muted)'}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="no-events">
            <div className="no-events-icon">📭</div>
            <div>No upcoming events</div>
            <div style={{ fontSize: '0.72rem', marginTop: '4px' }}>Your next 7 days are free!</div>
          </div>
        )}

        {!loading && dayKeys.map(day => (
          <div key={day} style={{ marginBottom: '16px' }}>
            <div style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'var(--accent-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '6px',
            }}>
              {dayLabel(day)}
            </div>
            {grouped[day].map(ev => (
              <div key={ev.id} className="event-card">
                <div className="event-time">
                  {formatEventTime(ev.start)} {ev.end && '→ ' + formatEventTime(ev.end)}
                </div>
                <div className="event-title">{ev.summary}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="sidebar-actions">
        <button
          className="btn-sidebar-action"
          onClick={() => onSendPrompt("What's on my schedule today?")}
        >
          <span>📅</span> Today's schedule
        </button>
        <button
          className="btn-sidebar-action"
          onClick={() => onSendPrompt("How many hours have I studied this week?")}
        >
          <span>📊</span> Weekly study hours
        </button>
        <button
          className="btn-sidebar-action"
          onClick={() => onSendPrompt("What's on my agenda this week?")}
        >
          <span>🗓️</span> This week's agenda
        </button>
      </div>
    </aside>
  )
}
