import { useState, useEffect, useRef, useCallback } from 'react'
import CalendarSidebar from '../components/CalendarSidebar'
import ChatBubble from '../components/ChatBubble'
import TypingIndicator from '../components/TypingIndicator'
import api from '../api/client'
import { format } from 'date-fns'

const EXAMPLE_PROMPTS = [
  { emoji: '📚', text: 'Schedule a DSA study block today 3-4pm' },
  { emoji: '🗑️', text: 'Cancel the last event I created' },
  { emoji: '📊', text: 'How many hours have I studied DSA this week?' },
  { emoji: '📅', text: "What's on my schedule tomorrow?" },
]

const QUICK_PROMPTS = [
  "What's today's schedule?",
  "Book a meeting tomorrow 2-3pm",
  "Study hours this week",
  "Free slots today",
]

export default function ChatPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [sidebarRefresh, setSidebarRefresh] = useState(0)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const sidebarRef = useRef(null)

  // Load chat history on mount
  useEffect(() => {
    api.get('/chat/history?limit=50')
      .then(res => {
        const history = res.data.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }))
        setMessages(history)
      })
      .catch(() => {})
      .finally(() => setHistoryLoaded(true))
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim()
    if (!msg || isTyping) return

    const userMessage = {
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = '52px'
    }

    try {
      const res = await api.post('/chat', { message: msg })
      const aiMessage = {
        role: 'model',
        content: res.data.response,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, aiMessage])
      // Refresh sidebar events after any calendar operation
      setSidebarRefresh(n => n + 1)
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Something went wrong. Please try again.'
      setMessages(prev => [...prev, {
        role: 'model',
        content: `❌ ${errMsg}`,
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setIsTyping(false)
    }
  }, [input, isTyping])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleTextareaChange = (e) => {
    setInput(e.target.value)
    // Auto-resize
    e.target.style.height = '52px'
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
  }

  const clearHistory = async () => {
    if (!window.confirm('Clear all chat history?')) return
    await api.delete('/chat/history')
    setMessages([])
  }

  return (
    <div className="chat-layout">
      {/* Sidebar */}
      <CalendarSidebar
        ref={sidebarRef}
        key={sidebarRefresh}
        onSendPrompt={(prompt) => sendMessage(prompt)}
      />

      {/* Main chat area */}
      <main className="chat-main">
        {/* Top bar */}
        <header className="chat-topbar">
          <div className="chat-topbar-icon">🤖</div>
          <div>
            <div className="chat-topbar-title">AI Calendar Assistant</div>
            <div className="chat-topbar-sub">Powered by Gemini 2.0 Flash</div>
          </div>
          <div className="online-dot" title="Connected" />
          <button
            onClick={clearHistory}
            style={{
              marginLeft: '8px',
              padding: '6px 12px',
              background: 'var(--bg-glass)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              transition: 'all 0.2s',
            }}
            title="Clear history"
          >
            Clear
          </button>
        </header>

        {/* Messages */}
        <div className="messages-container">
          {historyLoaded && messages.length === 0 && (
            <div className="welcome-state">
              <div className="welcome-icon">🗓️</div>
              <h2 className="welcome-title">Ready to Plan Your Day?</h2>
              <p className="welcome-sub">
                I can create, update, delete, and query your Google Calendar events.
                Just tell me what you need in plain English!
              </p>
              <div className="example-prompts">
                {EXAMPLE_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    className="example-card"
                    onClick={() => sendMessage(p.text)}
                  >
                    <div className="example-emoji">{p.emoji}</div>
                    <div className="example-text">"{p.text}"</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatBubble
              key={i}
              role={msg.role}
              content={msg.content}
              timestamp={msg.timestamp}
            />
          ))}

          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="chat-input-area">
          {/* Quick prompts */}
          <div className="quick-prompts">
            {QUICK_PROMPTS.map((p, i) => (
              <button
                key={i}
                className="quick-prompt-btn"
                onClick={() => sendMessage(p)}
                disabled={isTyping}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="input-row">
            <textarea
              ref={textareaRef}
              className="chat-textarea"
              placeholder="Ask me anything... e.g. 'Schedule a gym session tomorrow 7-8am'"
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              rows={1}
              id="chat-input"
            />
            <button
              className="btn-send"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping}
              id="btn-send"
              title="Send (Enter)"
            >
              {isTyping
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              }
            </button>
          </div>
          <div className="input-hint">
            Press <kbd style={{ padding: '1px 5px', background: 'var(--bg-glass)', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.7rem' }}>Enter</kbd> to send &nbsp;·&nbsp;
            <kbd style={{ padding: '1px 5px', background: 'var(--bg-glass)', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.7rem' }}>Shift+Enter</kbd> for newline
          </div>
        </div>
      </main>
    </div>
  )
}
