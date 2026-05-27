import { motion } from 'motion/react'
import ReactMarkdown from 'react-markdown'
import { format, parseISO } from 'date-fns'
import { useAuth } from '../context/AuthContext'

function formatTime(isoString) {
  try { return format(parseISO(isoString), 'h:mm a') }
  catch { return '' }
}

export default function ChatBubble({ role, content, timestamp }) {
  const { user } = useAuth()
  const isUser = role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex items-end gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`shrink-0 size-7 rounded-full flex items-center justify-center text-xs font-semibold mb-5 ${
        isUser
          ? 'bg-white text-black'
          : 'bg-neutral-800 text-white border border-neutral-700'
      }`}>
        {isUser
          ? (user?.picture
              ? <img src={user.picture} alt="" className="size-7 rounded-full object-cover" />
              : (user?.name?.[0] ?? 'U'))
          : '✦'}
      </div>

      {/* Bubble + time */}
      <div className={`flex flex-col gap-1 max-w-[72%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-white text-black rounded-br-sm font-medium'
            : 'bg-neutral-900 text-neutral-100 border border-neutral-800 rounded-bl-sm'
        }`}>
          {isUser
            ? <p>{content}</p>
            : <div className="prose prose-invert prose-sm max-w-none
                              prose-p:my-1 prose-ul:my-1 prose-li:my-0.5
                              prose-code:bg-neutral-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>}
        </div>
        {timestamp && (
          <span className="text-[10px] text-neutral-600 px-1">{formatTime(timestamp)}</span>
        )}
      </div>
    </motion.div>
  )
}
