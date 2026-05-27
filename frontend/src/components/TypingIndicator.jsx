export default function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5">
      {/* AI avatar */}
      <div className="shrink-0 size-7 rounded-full bg-neutral-800 border border-neutral-700
                      flex items-center justify-center text-xs text-white mb-1">
        ✦
      </div>
      {/* Bouncing dots */}
      <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800
                      rounded-2xl rounded-bl-sm px-4 py-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="size-1.5 rounded-full bg-neutral-400 animate-typing-bounce"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  )
}
