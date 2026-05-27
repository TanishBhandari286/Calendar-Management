import { useState } from 'react'
import { motion } from 'motion/react'
import GoalSetupModal from './GoalSetupModal'

/**
 * Apple Watch–style circular progress ring for a single goal.
 * Uses SVG stroke-dashoffset animation.
 */
function GoalRing({ goal, onEdit, delay = 0 }) {
  const SIZE = 120
  const STROKE = 10
  const R = (SIZE - STROKE) / 2
  const CIRC = 2 * Math.PI * R
  const pct = Math.min(goal.percentage / 100, 1)
  const dash = pct * CIRC

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', damping: 20, stiffness: 200 }}
      onClick={() => onEdit(goal)}
      className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-neutral-800
                 bg-neutral-950 hover:bg-neutral-900 transition-all group cursor-pointer"
    >
      {/* SVG Ring */}
      <div className="relative">
        <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={STROKE}
          />
          {/* Progress arc */}
          <motion.circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            fill="none"
            stroke={goal.color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            initial={{ strokeDashoffset: CIRC }}
            animate={{ strokeDashoffset: CIRC - dash }}
            transition={{ duration: 1.2, delay: delay + 0.2, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 6px ${goal.color}88)` }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl leading-none">{goal.emoji}</span>
          <span className="text-sm font-bold mt-0.5" style={{ color: goal.color }}>
            {goal.percentage.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Label */}
      <div className="text-center">
        <div className="text-xs font-semibold text-white group-hover:text-neutral-200 truncate max-w-[100px]">
          {goal.name}
        </div>
        <div className="text-[10px] text-neutral-500 mt-0.5">
          {goal.current_hours}h / {goal.target_hours}h
        </div>
        <div className="text-[10px] text-neutral-600">
          {goal.events_count} session{goal.events_count !== 1 ? 's' : ''}
        </div>
      </div>
    </motion.button>
  )
}

/** Dashed add-goal button */
function AddGoalButton({ onClick, delay }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', damping: 20, stiffness: 200 }}
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl
                 border border-dashed border-neutral-800 text-neutral-600
                 hover:border-neutral-600 hover:text-neutral-400 transition-all
                 min-w-[128px] min-h-[192px]"
    >
      <div className="flex size-10 items-center justify-center rounded-full border border-dashed border-neutral-700 text-xl">
        +
      </div>
      <span className="text-xs">Add goal</span>
    </motion.button>
  )
}

export default function GoalRings({ goals, loading, onRefresh }) {
  const [editGoal, setEditGoal] = useState(null)   // null = closed, false = new, or goal obj
  const [showNew, setShowNew]   = useState(false)

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {loading && [0,1,2].map(i => (
          <div key={i} className="w-[128px] h-[192px] rounded-2xl bg-neutral-900 animate-pulse" />
        ))}

        {!loading && goals.map((g, i) => (
          <GoalRing
            key={g.id}
            goal={g}
            delay={i * 0.1}
            onEdit={g => setEditGoal(g)}
          />
        ))}

        {!loading && goals.length < 5 && (
          <AddGoalButton
            delay={goals.length * 0.1}
            onClick={() => setShowNew(true)}
          />
        )}
      </div>

      {/* Edit modal */}
      {editGoal && (
        <GoalSetupModal
          goal={editGoal}
          onClose={() => setEditGoal(null)}
          onSaved={() => { setEditGoal(null); onRefresh() }}
        />
      )}

      {/* New goal modal */}
      {showNew && (
        <GoalSetupModal
          goal={null}
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); onRefresh() }}
        />
      )}
    </>
  )
}
