import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import GoalRings from '../components/GoalRings'
import ProductivityScore from '../components/ProductivityScore'
import WeekCalendar from '../components/WeekCalendar'
import PomodoroTimer from '../components/PomodoroTimer'
import api from '../api/client'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const [goals, setGoals]     = useState([])
  const [events, setEvents]   = useState([])
  const [goalsLoading, setGoalsLoading] = useState(true)
  const [eventsLoading, setEventsLoading] = useState(true)
  const [calRefresh, setCalRefresh] = useState(0)

  const fetchGoals = useCallback(async () => {
    setGoalsLoading(true)
    try {
      const res = await api.get('/goals/progress')
      setGoals(res.data)
    } catch { setGoals([]) }
    finally { setGoalsLoading(false) }
  }, [])

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true)
    try {
      const res = await api.get('/calendar/events?days=7')
      setEvents(res.data.events || [])
    } catch { setEvents([]) }
    finally { setEventsLoading(false) }
  }, [])

  useEffect(() => {
    fetchGoals()
    fetchEvents()
  }, [fetchGoals, fetchEvents, calRefresh])

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">

      {/* ── Top navigation ── */}
      <nav className="shrink-0 border-b border-neutral-800 bg-black/90 backdrop-blur-sm sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-4">
            <div className="flex size-7 items-center justify-center rounded-lg bg-white text-sm text-black">🗓️</div>
            <span className="font-bold font-display text-sm">AI Planner</span>
          </div>

          {/* Nav links */}
          <Link
            to="/dashboard"
            className="text-sm font-medium text-white border-b border-white pb-0.5"
          >
            Dashboard
          </Link>
          <Link
            to="/chat"
            className="text-sm font-medium text-neutral-500 hover:text-white transition-colors"
          >
            AI Chat
          </Link>

          <div className="flex-1" />

          {/* User */}
          <div className="flex items-center gap-3">
            {user?.picture
              ? <img src={user.picture} alt="" className="size-7 rounded-full ring-1 ring-neutral-700" />
              : <div className="size-7 rounded-full bg-white text-black flex items-center justify-center text-xs font-bold">
                  {user?.name?.[0]}
                </div>}
            <span className="text-xs text-neutral-400 hidden sm:block">{user?.email}</span>
            <button
              onClick={logout}
              className="text-xs text-neutral-600 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* ── Main content ── */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-8 space-y-8">

        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold font-display">
            {greeting()}, {user?.name?.split(' ')[0]} ✦
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </p>
        </motion.div>

        {/* ── Goal rings row ── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Weekly Goals</h2>
              <p className="text-xs text-neutral-600 mt-0.5">Click any ring to edit · Progress resets Monday</p>
            </div>
          </div>
          <div className="flex flex-wrap items-start gap-4">
            <GoalRings
              goals={goals}
              loading={goalsLoading}
              onRefresh={fetchGoals}
            />
            <ProductivityScore events={events} loading={eventsLoading} />
          </div>
        </motion.section>

        {/* ── Calendar + Pomodoro row ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6"
        >
          {/* Week calendar */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white">This Week</h2>
              <div className="flex items-center gap-3 text-[10px] text-neutral-600">
                {goals.slice(0, 4).map(g => (
                  <span key={g.id} className="flex items-center gap-1">
                    <span className="size-2 rounded-full" style={{ backgroundColor: g.color }} />
                    {g.name}
                  </span>
                ))}
              </div>
            </div>
            {eventsLoading ? (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 h-64 animate-pulse" />
            ) : (
              <WeekCalendar events={events} goals={goals} />
            )}
          </section>

          {/* Pomodoro */}
          <section>
            <h2 className="text-sm font-semibold text-white mb-3">Focus Timer</h2>
            <PomodoroTimer
              onEventCreated={() => {
                setCalRefresh(n => n + 1)
              }}
            />
          </section>
        </motion.div>

        {/* ── Quick actions ── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <h2 className="text-sm font-semibold text-white mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { emoji: '🤖', label: 'Plan with AI', sub: 'Chat with your assistant', to: '/chat' },
              { emoji: '📅', label: "Today's Schedule", sub: 'See what\'s happening', to: '/chat?q=today' },
              { emoji: '📊', label: 'Analytics', sub: 'Time spent this week', to: '/chat?q=summary' },
              { emoji: '🎯', label: 'Add a Goal', sub: 'Track weekly progress', action: 'goal' },
            ].map((item, i) => (
              item.to
                ? <Link
                    key={i}
                    to={item.to}
                    className="flex flex-col gap-1.5 rounded-2xl border border-neutral-800 bg-neutral-950
                               p-4 transition-all hover:border-neutral-700 hover:bg-neutral-900 hover:-translate-y-0.5"
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    <div>
                      <div className="text-sm font-semibold text-white">{item.label}</div>
                      <div className="text-xs text-neutral-500">{item.sub}</div>
                    </div>
                  </Link>
                : <button
                    key={i}
                    onClick={() => {
                      // Trigger goal add — find the + button in GoalRings
                      document.querySelector('[data-add-goal]')?.click()
                    }}
                    className="flex flex-col gap-1.5 rounded-2xl border border-neutral-800 bg-neutral-950
                               p-4 text-left transition-all hover:border-neutral-700 hover:bg-neutral-900 hover:-translate-y-0.5"
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    <div>
                      <div className="text-sm font-semibold text-white">{item.label}</div>
                      <div className="text-xs text-neutral-500">{item.sub}</div>
                    </div>
                  </button>
            ))}
          </div>
        </motion.section>
      </main>
    </div>
  )
}
