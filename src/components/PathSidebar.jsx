/**
 * Right sidebar — shows the current session's learning path tree
 * and previously saved sessions from the database.
 */

function buildTreeLines(stack) {
  const lines = []
  lines.push({ text: stack[0].title, type: 'root', depth: 0 })

  for (let i = 0; i < stack.length; i++) {
    const node = stack[i]
    const nextNode = stack[i + 1]
    const isLastNode = i === stack.length - 1
    const terms = (node.terms || [])
      .map(t => (typeof t === 'string' ? { term: t } : t))
      .filter(t => t?.term)

    for (const { term } of terms) {
      const isChosen =
        !isLastNode && nextNode?.title?.toLowerCase() === term.toLowerCase()
      lines.push({
        text: term,
        type: isChosen ? 'chosen' : isLastNode ? 'available' : 'skipped',
        depth: i + 1,
      })
    }
  }
  return lines
}

function formatTime(iso) {
  const d = new Date(iso)
  const diffMins = Math.floor((Date.now() - d) / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
  return `${Math.floor(diffMins / 1440)}d ago`
}

export default function PathSidebar({ stack, branches, activeId, onSelect, onDeleteBranch }) {
  const history = branches  // branches of the current root question
  const hasCurrentPath = stack.length >= 2
  const lines = hasCurrentPath ? buildTreeLines(stack) : []

  return (
    <aside className="w-56 flex-shrink-0 border-l border-[#1a1a2e] flex flex-col bg-[#07070f] overflow-hidden">

      {/* ── Current Learning Path ── */}
      <div className="flex-shrink-0 border-b border-[#1a1a2e]">
        <div className="px-4 py-3 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Current Path
          </span>
          {hasCurrentPath && (
            <span className="text-[9px] text-slate-700 ml-auto">
              {stack.length - 1} deep
            </span>
          )}
        </div>

        <div className="px-3 pb-3 max-h-64 overflow-y-auto">
          {!hasCurrentPath ? (
            <p className="text-[10px] text-slate-700 italic text-center py-4 leading-relaxed">
              Click a term to track<br />your learning path
            </p>
          ) : (
            <div className="space-y-px font-mono">
              {lines.map((line, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 py-0.5"
                  style={{ paddingLeft: `${line.depth * 10}px` }}
                >
                  {line.type === 'root' && (
                    <>
                      <span className="text-[8px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1 py-px rounded flex-shrink-0">Q</span>
                      <span className="text-[10px] text-white font-semibold truncate">{line.text}</span>
                    </>
                  )}
                  {line.type === 'chosen' && (
                    <>
                      <span className="text-violet-500 text-[9px] flex-shrink-0">▶</span>
                      <span className="text-[10px] text-violet-400 font-semibold truncate">{line.text}</span>
                      <span className="text-[8px] text-violet-700 flex-shrink-0 ml-0.5">✓</span>
                    </>
                  )}
                  {line.type === 'skipped' && (
                    <>
                      <span className="text-slate-800 text-[9px] flex-shrink-0">─</span>
                      <span className="text-[10px] text-slate-700 truncate">{line.text}</span>
                    </>
                  )}
                  {line.type === 'available' && (
                    <>
                      <span className="text-emerald-500 text-[9px] flex-shrink-0">◉</span>
                      <span className="text-[10px] text-emerald-400 font-medium truncate">{line.text}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        {hasCurrentPath && (
          <div className="px-4 py-2 border-t border-[#1a1a2e] flex items-center gap-3">
            <span className="flex items-center gap-1 text-[9px] text-slate-700"><span className="text-violet-400">▶</span>explored</span>
            <span className="flex items-center gap-1 text-[9px] text-slate-700"><span className="text-emerald-400">◉</span>next</span>
            <span className="flex items-center gap-1 text-[9px] text-slate-700"><span className="text-slate-700">─</span>skipped</span>
          </div>
        )}
      </div>

      {/* ── Past Saved Paths (from DB) ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3 flex items-center gap-2 sticky top-0 bg-[#07070f] border-b border-[#1a1a2e] z-10">
          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Past Paths
          </span>
        </div>

        {history.length === 0 ? (
          <p className="text-[10px] text-slate-700 italic text-center py-6 px-3 leading-relaxed">
            Branch paths appear here<br />when you change direction.
          </p>
        ) : (
          <div className="py-2 px-2 space-y-1.5">
            {history.map((session) => {
              const isActive = activeId === session.id
              const nodes = session.nodes || []
              return (
                <div
                  key={session.id}
                  onClick={() => onSelect?.(session.id)}
                  className={`rounded-lg border transition-all cursor-pointer group overflow-hidden ${
                    isActive
                      ? 'bg-violet-500/10 border-violet-500/30'
                      : 'border-[#1e1e3a] hover:border-[#2a2a4e] hover:bg-[#0d0d1a]'
                  }`}
                >
                  {/* Folder header — branch node name */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-2 border-b ${
                    isActive ? 'border-violet-500/20 bg-violet-500/5' : 'border-[#1a1a2e]'
                  }`}>
                    <svg className={`w-3 h-3 flex-shrink-0 ${isActive ? 'text-violet-400' : 'text-slate-600 group-hover:text-slate-500'}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span className={`text-[10px] font-semibold truncate ${isActive ? 'text-violet-300' : 'text-slate-400 group-hover:text-slate-300'}`}>
                      {session.question}
                    </span>
                    <span className="text-[9px] text-slate-700 ml-1 flex-shrink-0">{session.depth}d</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteBranch?.(session.id) }}
                      title="Delete this path"
                      className="ml-auto opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-400 transition-all flex-shrink-0"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Node directory tree */}
                  <div className="px-2.5 py-2 space-y-px font-mono">
                    {nodes.map((node, i) => {
                      const isRoot = i === 0
                      const isLeaf = i === nodes.length - 1
                      const isLast = i === nodes.length - 1
                      const connector = isLast ? '└─' : '├─'
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-1"
                          style={{ paddingLeft: `${i === 0 ? 0 : 4 + (i - 1) * 10}px` }}
                        >
                          {!isRoot && (
                            <span className="text-slate-800 text-[9px] flex-shrink-0">{connector}</span>
                          )}
                          {isRoot ? (
                            <>
                              <span className="text-[8px] font-bold text-slate-600 bg-[#1a1a2e] px-1 py-px rounded flex-shrink-0">Q</span>
                              <span className="text-[9px] text-slate-600 truncate">{node.title}</span>
                            </>
                          ) : isLeaf ? (
                            <>
                              <span className="text-emerald-600 text-[9px] flex-shrink-0">◎</span>
                              <span className="text-[9px] text-emerald-500/80 font-medium truncate">{node.title}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-violet-600 text-[9px] flex-shrink-0">▶</span>
                              <span className="text-[9px] text-violet-400/80 truncate">{node.title}</span>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Footer meta */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1.5 border-t ${
                    isActive ? 'border-violet-500/20' : 'border-[#1a1a2e]'
                  }`}>
                    <span className="text-[9px] text-slate-700">{formatTime(session.timestamp)}</span>
                    {!isActive && (
                      <span className="text-[9px] text-slate-800 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        click to restore →
                      </span>
                    )}
                    {isActive && (
                      <span className="text-[9px] text-violet-600 ml-auto">viewing</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}
