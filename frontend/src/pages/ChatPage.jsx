import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import CalendarSidebar from '../components/CalendarSidebar'
import ChatBubble from '../components/ChatBubble'
import TypingIndicator from '../components/TypingIndicator'
import api from '../api/client'

const EXAMPLE_PROMPTS = [
  { emoji: '📚', text: 'Schedule a DSA study block today 3–4 pm' },
  { emoji: '🗑️', text: 'Cancel the last event I created' },
  { emoji: '📊', text: 'How many hours have I studied DSA this week?' },
  { emoji: '📅', text: "What's on my calendar tomorrow?" },
]

const QUICK_PROMPTS = [
  "Today's schedule",
  "Book a meeting tomorrow 2–3 pm",
  "Study hours this week",
  "Free slots today",
]

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  )
}

export default function ChatPage() {
  const [messages, setMessages]       = useState([])
  const [input, setInput]             = useState('')
  const [isTyping, setIsTyping]       = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [sidebarRefresh, setSidebarRefresh] = useState(0)
  const messagesEndRef = useRef(null)
  const textareaRef    = useRef(null)

  // Load history on mount
  useEffect(() => {
    api.get('/chat/history?limit=50')
      .then(res => setMessages(res.data.map(m => ({
        role: m.role, content: m.content, timestamp: m.timestamp,
      }))))
      .catch(() => {})
      .finally(() => setHistoryLoaded(true))
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const sendMessage = useCallback(async (text) => {
    const msg = (text ?? input).trim()
    if (!msg || isTyping) return

    setMessages(prev => [...prev, { role: 'user', content: msg, timestamp: new Date().toISOString() }])
    setInput('')
    setIsTyping(true)
    if (textareaRef.current) textareaRef.current.style.height = '48px'

    try {
      const res = await api.post('/chat', { message: msg })
      setMessages(prev => [...prev, { role: 'model', content: res.data.response, timestamp: new Date().toISOString() }])
      setSidebarRefresh(n => n + 1)
    } catch (err) {
      const detail = err.response?.data?.detail || 'Something went wrong.'
      setMessages(prev => [...prev, { role: 'model', content: `❌ ${detail}`, timestamp: new Date().toISOString() }])
    } finally {
      setIsTyping(false)
    }
  }, [input, isTyping])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleChange = (e) => {
    setInput(e.target.value)
    e.target.style.height = '48px'
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
  }

  const clearHistory = async () => {
    if (!window.confirm('Clear all chat history?')) return
    await api.delete('/chat/history')
    setMessages([])
  }

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">

      {/* ── Sidebar ── */}
      <CalendarSidebar
        refreshKey={sidebarRefresh}
        onSendPrompt={(p) => sendMessage(p)}
      />

      {/* ── Main chat area ── */}
      <main className="flex flex-1 flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center gap-3 border-b border-neutral-800 bg-black px-6 py-3.5 shrink-0">
          <div className="flex size-8 items-center justify-center rounded-lg bg-white text-sm shrink-0">✦</div>
          <div className="flex-1">
            <div className="text-sm font-bold font-display">AI Calendar Assistant</div>
            <div className="text-[10px] text-neutral-500">Gemini 2.0 Flash · Google Calendar</div>
          </div>
          {/* Online dot */}
          <div className="flex items-center gap-2 text-[10px] text-neutral-600">
            <div className="size-1.5 rounded-full bg-green-400 animate-pulse-glow" />
            Online
          </div>
          <button
            onClick={clearHistory}
            className="ml-2 rounded-lg border border-neutral-800 px-3 py-1.5 text-[11px] text-neutral-500
                       transition-colors hover:border-neutral-700 hover:text-neutral-300"
          >
            Clear
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6">

          {/* Welcome state */}
          <AnimatePresence>
            {historyLoaded && messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full flex-col items-center justify-center text-center px-4"
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-white text-black text-3xl shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                >
                  🗓️
                </motion.div>
                <h2 className="mb-2 text-xl font-bold font-display">Ready to plan your day?</h2>
                <p className="mb-8 max-w-md text-sm text-neutral-500 leading-relaxed">
                  Tell me what to schedule, cancel, or query. I remember everything we discuss.
                </p>
                <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                  {EXAMPLE_PROMPTS.map((p, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      onClick={() => sendMessage(p.text)}
                      className="flex flex-col gap-1.5 rounded-xl border border-neutral-800 bg-neutral-950
                                 p-4 text-left text-sm transition-all hover:border-neutral-700
                                 hover:bg-neutral-900 hover:-translate-y-0.5"
                    >
                      <span className="text-xl">{p.emoji}</span>
                      <span className="text-xs text-neutral-400 leading-snug">"{p.text}"</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat messages */}
          {messages.length > 0 && (
            <div className="space-y-4 max-w-3xl mx-auto w-full">
              {messages.map((msg, i) => (
                <ChatBubble
                  key={i}
                  role={msg.role}
                  content={msg.content}
                  timestamp={msg.timestamp}
                />
              ))}
              {isTyping && <TypingIndicator />}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-neutral-800 bg-black px-6 py-4 shrink-0">
          {/* Quick prompt chips */}
          <div className="mb-3 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => sendMessage(p)}
                disabled={isTyping}
                className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-[11px]
                           text-neutral-500 transition-all hover:border-neutral-700 hover:text-neutral-300
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Text input row */}
          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              id="chat-input"
              rows={1}
              value={input}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything… e.g. 'Schedule gym tomorrow 7–8 am'"
              className="flex-1 resize-none rounded-xl border border-neutral-800 bg-neutral-950
                         px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none
                         transition-colors focus:border-neutral-600 min-h-[48px] max-h-[140px]
                         scrollbar-thin"
            />
            <button
              id="btn-send"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping}
              className="flex size-12 items-center justify-center rounded-xl bg-white text-black
                         transition-all hover:-translate-y-0.5 hover:bg-neutral-200
                         hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]
                         disabled:opacity-30 disabled:cursor-not-allowed disabled:translate-y-0 shrink-0"
            >
              <SendIcon />
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-neutral-700">
            <kbd className="rounded border border-neutral-800 px-1 py-0.5">Enter</kbd> to send ·{' '}
            <kbd className="rounded border border-neutral-800 px-1 py-0.5">Shift+Enter</kbd> for newline
          </p>
        </div>
      </main>
    </div>
  )
}
