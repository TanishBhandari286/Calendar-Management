import { motion } from 'motion/react'

const API_URL = import.meta.env.VITE_API_URL || ''

const HERO_WORDS = "Your personal AI calendar assistant".split(' ')

const FEATURES = [
  { icon: '✨', label: 'Natural language' },
  { icon: '🧠', label: 'Conversation memory' },
  { icon: '📊', label: 'Time analytics' },
  { icon: '🔄', label: 'Full CRUD' },
]

const PREVIEW_MESSAGES = [
  { role: 'user', text: 'Schedule DSA study today 3–4 pm' },
  { role: 'ai',   text: '✅ Created "DSA Study Session" today · 3:00 PM → 4:00 PM' },
  { role: 'user', text: 'How many hours have I studied this week?' },
  { role: 'ai',   text: '📊 You\'ve clocked 6.5 hours of DSA this week across 7 sessions. Great streak!' },
]

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function ChatPreviewMock() {
  return (
    <div className="w-full rounded-xl border border-neutral-800 bg-black overflow-hidden text-left">
      {/* Mock browser chrome */}
      <div className="flex items-center gap-3 border-b border-neutral-800 bg-neutral-950 px-4 py-3">
        <div className="flex gap-1.5">
          <div className="size-2.5 rounded-full bg-neutral-700" />
          <div className="size-2.5 rounded-full bg-neutral-700" />
          <div className="size-2.5 rounded-full bg-neutral-700" />
        </div>
        <div className="flex-1 flex items-center justify-center gap-2">
          <div className="size-1.5 rounded-full bg-green-400 animate-pulse-glow" />
          <span className="text-xs text-neutral-500 font-medium">AI Calendar Assistant</span>
        </div>
      </div>
      {/* Mock messages */}
      <div className="p-4 space-y-3">
        {PREVIEW_MESSAGES.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 1.5 + i * 0.3 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'bg-white text-black font-medium rounded-br-sm'
                : 'bg-neutral-900 text-neutral-200 border border-neutral-800 rounded-bl-sm'
            }`}>
              {msg.text}
            </div>
          </motion.div>
        ))}
        {/* Typing dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.0 }}
          className="flex justify-start"
        >
          <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-2xl rounded-bl-sm px-3 py-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="size-1.5 rounded-full bg-neutral-400 animate-typing-bounce"
                style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid" />
      {/* Radial top glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(255,255,255,0.06),transparent)]" />

      {/* Constrained layout container */}
      <div className="relative mx-auto flex max-w-6xl flex-col min-h-screen">

        {/* Decorative side borders */}
        <div className="absolute inset-y-0 left-0 w-px bg-neutral-800/80">
          <div className="absolute w-px h-48 bg-gradient-to-b from-transparent via-white/30 to-transparent animate-gradient-shift" />
        </div>
        <div className="absolute inset-y-0 right-0 w-px bg-neutral-800/80">
          <div className="absolute w-px h-48 bg-gradient-to-b from-transparent via-white/30 to-transparent animate-gradient-shift [animation-delay:3s]" />
        </div>

        {/* ── Navbar ── */}
        <nav className="flex w-full items-center justify-between border-b border-neutral-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-white text-sm">🗓️</div>
            <span className="font-bold text-base tracking-tight font-display">AI Planner</span>
          </div>
          <a
            href={`${API_URL}/auth/google`}
            className="rounded-lg border border-neutral-700 px-4 py-1.5 text-sm font-medium text-neutral-300
                       transition-all duration-200 hover:border-white hover:text-white hover:-translate-y-px"
          >
            Sign in
          </a>
        </nav>

        {/* ── Hero ── */}
        <div className="flex flex-col items-center justify-center flex-1 px-6 py-16 text-center">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-neutral-800
                       bg-neutral-900/80 px-4 py-1.5 text-xs font-medium text-neutral-400"
          >
            <span className="size-1.5 rounded-full bg-green-400 animate-pulse-glow" />
            Gemini 2.0 Flash · Google Calendar API
          </motion.div>

          {/* Animated heading */}
          <h1 className="mb-6 max-w-4xl text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl lg:text-7xl font-display">
            {HERO_WORDS.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, filter: 'blur(4px)', y: 10 }}
                animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.08, ease: 'easeInOut' }}
                className="mr-3 inline-block"
              >
                {word}
              </motion.span>
            ))}
          </h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.7 }}
            className="mx-auto max-w-lg text-base leading-relaxed text-neutral-400 md:text-lg"
          >
            Schedule events, cancel bookings, and track your time — all through natural
            conversation with an AI that remembers everything you've discussed.
          </motion.p>

          {/* Feature chips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.9 }}
            className="mt-7 flex flex-wrap justify-center gap-2.5"
          >
            {FEATURES.map((f) => (
              <span
                key={f.label}
                className="flex items-center gap-1.5 rounded-full border border-neutral-800
                           bg-neutral-900/60 px-3.5 py-1.5 text-xs text-neutral-400"
              >
                {f.icon} {f.label}
              </span>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 1.1 }}
            className="mt-10 flex flex-col items-center gap-3"
          >
            <a
              href={`${API_URL}/auth/google`}
              id="btn-google-login"
              className="inline-flex items-center gap-3 rounded-xl bg-white px-8 py-3.5 text-base
                         font-semibold text-black transition-all duration-200
                         hover:-translate-y-0.5 hover:bg-neutral-100
                         hover:shadow-[0_0_40px_rgba(255,255,255,0.18)]"
            >
              <GoogleIcon />
              Continue with Google
            </a>
            <p className="text-xs text-neutral-600">
              Secure OAuth2 · Grants access to Google Calendar only
            </p>
          </motion.div>

          {/* ── App preview mockup ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.3 }}
            className="relative mt-16 w-full max-w-2xl"
          >
            {/* Glow halo */}
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-white/8 to-transparent blur-sm" />
            <div className="relative rounded-2xl border border-neutral-800 bg-neutral-950 p-3 shadow-2xl">
              <ChatPreviewMock />
            </div>
          </motion.div>
        </div>

        {/* Bottom border */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-neutral-800" />
      </div>
    </div>
  )
}
