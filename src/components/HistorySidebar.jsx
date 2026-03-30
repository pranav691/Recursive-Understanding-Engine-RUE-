export default function HistorySidebar({ history, onNew, onSelect, onDelete, activeId }) {
  function formatTime(iso) {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <aside className="w-56 flex-shrink-0 border-r border-[#1a1a2e] flex flex-col bg-[#07070f] overflow-hidden">
      {/* Header */}
      <div className="px-3 py-3 border-b border-[#1a1a2e] flex-shrink-0 space-y-2.5">
        {/* New Chat button */}
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2a2a45] hover:border-violet-500/40 hover:bg-violet-500/8 text-slate-400 hover:text-violet-300 transition-all duration-150 group"
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0 group-hover:text-violet-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-[11px] font-semibold">New Chat</span>
        </button>

        {/* History label */}
        <div className="flex items-center gap-2 px-1">
          <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">History</span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2">
        {history.length === 0 ? (
          <p className="text-[11px] text-slate-600 text-center px-4 pt-6 italic">
            No sessions yet.<br />Explore a concept and click<br />"I Understand!" to save.
          </p>
        ) : (
          history.map((session) => (
            <div
              key={session.id}
              className={`group mx-2 mb-1 rounded-lg px-3 py-2.5 cursor-pointer transition-all duration-150 border ${
                activeId === session.id
                  ? 'bg-violet-500/10 border-violet-500/30'
                  : 'border-transparent hover:bg-[#0d0d1a] hover:border-[#1e1e3a]'
              }`}
              onClick={() => onSelect(session.id)}
            >
              {/* Question */}
              <p className={`text-xs font-medium leading-snug line-clamp-2 mb-1 ${
                activeId === session.id ? 'text-violet-300' : 'text-slate-300'
              }`}>
                {session.question}
              </p>

              {/* Meta row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-600">{formatTime(session.timestamp)}</span>
                  <span className="text-slate-700">·</span>
                  <span className="text-[10px] text-slate-600">{session.depth} deep</span>
                </div>
                {/* Delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(session.id) }}
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                  title="Delete"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
