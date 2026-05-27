import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import api from '../api/client'

const PRESET_COLORS = ['#FF453A', '#30D158', '#0A84FF', '#BF5AF2', '#FF9F0A', '#64D2FF']
const PRESET_EMOJIS = ['📚', '💪', '💼', '🎯', '🏃', '🧘', '🎨', '⚡', '🔬', '🎵']

export default function GoalSetupModal({ goal, onClose, onSaved }) {
  const isEdit = !!goal
  const [form, setForm] = useState({
    name: goal?.name ?? '',
    keyword: goal?.keyword ?? '',
    target_hours: goal?.target_hours ?? 10,
    color: goal?.color ?? '#FF453A',
    emoji: goal?.emoji ?? '📚',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = useCallback(async () => {
    if (!form.name.trim() || !form.keyword.trim()) {
      setError('Name and keyword are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (isEdit) {
        await api.put(`/goals/${goal.id}`, form)
      } else {
        await api.post('/goals/', form)
      }
      onSaved()
    } catch (e) {
      setError(e.response?.data?.detail ?? 'Failed to save goal.')
    } finally {
      setSaving(false)
    }
  }, [form, isEdit, goal, onSaved])

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl"
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <h2 className="mb-5 text-lg font-bold font-display">
            {isEdit ? 'Edit Goal' : 'New Weekly Goal'}
          </h2>

          {/* Emoji + Color preview row */}
          <div className="mb-5 flex items-center gap-4">
            <div
              className="flex size-14 items-center justify-center rounded-2xl text-2xl"
              style={{ backgroundColor: form.color + '22', border: `2px solid ${form.color}` }}
            >
              {form.emoji}
            </div>
            <div className="flex-1">
              <p className="text-xs text-neutral-500 mb-1">Goal preview</p>
              <p className="text-sm font-semibold">{form.name || 'Untitled Goal'}</p>
              <p className="text-xs text-neutral-500">{form.target_hours}h / week · keyword: "{form.keyword}"</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block mb-1.5 text-xs font-medium text-neutral-400">Goal Name</label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. DSA Study"
                className="w-full rounded-lg border border-neutral-800 bg-black px-3 py-2.5 text-sm
                           text-white placeholder-neutral-600 outline-none focus:border-neutral-600"
              />
            </div>

            {/* Keyword */}
            <div>
              <label className="block mb-1.5 text-xs font-medium text-neutral-400">
                Event Keyword
                <span className="ml-2 text-neutral-600 font-normal">
                  — matched case-insensitively in event titles
                </span>
              </label>
              <input
                value={form.keyword}
                onChange={e => set('keyword', e.target.value)}
                placeholder='e.g. "DSA" matches "DSA Study Session"'
                className="w-full rounded-lg border border-neutral-800 bg-black px-3 py-2.5 text-sm
                           text-white placeholder-neutral-600 outline-none focus:border-neutral-600"
              />
            </div>

            {/* Target hours */}
            <div>
              <label className="block mb-1.5 text-xs font-medium text-neutral-400">
                Weekly Target — <span className="text-white font-semibold">{form.target_hours}h</span>
              </label>
              <input
                type="range" min="0.5" max="60" step="0.5"
                value={form.target_hours}
                onChange={e => set('target_hours', parseFloat(e.target.value))}
                className="w-full accent-white"
              />
              <div className="flex justify-between text-[10px] text-neutral-700 mt-0.5">
                <span>0.5h</span><span>60h</span>
              </div>
            </div>

            {/* Emoji picker */}
            <div>
              <label className="block mb-2 text-xs font-medium text-neutral-400">Emoji</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => set('emoji', e)}
                    className={`size-9 rounded-lg text-xl transition-all ${
                      form.emoji === e
                        ? 'bg-neutral-700 ring-2 ring-white'
                        : 'bg-neutral-900 hover:bg-neutral-800'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label className="block mb-2 text-xs font-medium text-neutral-400">Ring Color</label>
              <div className="flex gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => set('color', c)}
                    className={`size-8 rounded-full transition-all ${
                      form.color === c ? 'ring-2 ring-offset-2 ring-offset-neutral-950 ring-white' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {error && <p className="mt-4 text-xs text-red-400">{error}</p>}

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            {isEdit && (
              <button
                onClick={async () => {
                  await api.delete(`/goals/${goal.id}`)
                  onSaved()
                }}
                className="rounded-lg border border-red-900/50 px-4 py-2 text-sm text-red-400
                           hover:bg-red-950/30 transition-colors"
              >
                Delete
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg border border-neutral-800 px-4 py-2 text-sm text-neutral-400
                         hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-black
                         transition-all hover:bg-neutral-200 disabled:opacity-50"
            >
              {saving ? 'Saving…' : isEdit ? 'Update' : 'Create Goal'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
