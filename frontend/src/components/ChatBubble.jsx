import { format, parseISO } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '../context/AuthContext'

function formatTime(isoString) {
  try {
    return format(parseISO(isoString), 'h:mm a')
  } catch {
    return ''
  }
}

export default function ChatBubble({ role, content, timestamp }) {
  const { user } = useAuth()
  const isUser = role === 'user'

  return (
    <div className={`message-row ${isUser ? 'user' : ''}`}>
      {/* Avatar */}
      <div className={`message-avatar ${isUser ? 'user-av' : 'ai'}`}>
        {isUser
          ? (user?.picture
              ? <img src={user.picture} alt={user.name} />
              : (user?.name?.[0] ?? 'U'))
          : '🤖'}
      </div>

      {/* Bubble + timestamp */}
      <div className="message-content">
        <div className={`message-bubble ${isUser ? 'user-msg' : 'ai'}`}>
          {isUser
            ? <p>{content}</p>
            : <ReactMarkdown>{content}</ReactMarkdown>}
        </div>
        {timestamp && (
          <div className="message-time">{formatTime(timestamp)}</div>
        )}
      </div>
    </div>
  )
}
