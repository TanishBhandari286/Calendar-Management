export default function TypingIndicator() {
  return (
    <div className="message-row">
      <div className="message-avatar ai">🤖</div>
      <div className="typing-bubble">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  )
}
