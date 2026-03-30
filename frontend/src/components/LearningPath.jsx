import { useState } from 'react'

/**
 * Builds a flat list of tree lines from the exploration stack.
 * Each line has: text, type ('root'|'chosen'|'skipped'|'available'), depth
 *
 * 'chosen'    = term that was clicked and explored (part of current path)
 * 'skipped'   = term available at that level but not chosen
 * 'available' = terms on the current (last) node — what we can explore next
 */
function buildTreeLines(stack) {
  const lines = []

  // Root question
  lines.push({ text: stack[0].title, type: 'root', depth: 0 })

  for (let i = 0; i < stack.length; i++) {
    const node = stack[i]
    const nextNode = stack[i + 1]
    const isLastNode = i === stack.length - 1

    const terms = (node.terms || [])
      .map(t => (typeof t === 'string' ? { term: t, difficulty: 'medium' } : t))
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

export default function LearningPath({ stack }) {
  const [open, setOpen] = useState(true)

  if (stack.length < 2) return null

  const lines = buildTreeLines(stack)
  const exploredCount = stack.length - 1
  const availableCount = lines.filter(l => l.type === 'available').length

  return (
    <div className="max-w-2xl mb-5 bg-[#0a0a15] border border-[#1e1e3a] rounded-xl overflow-hidden">

      {/* Header / toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#0d0d1a] transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Learning Path
          </span>
          <span className="text-[10px] text-slate-700">
            {exploredCount} explored · {availableCount} next
          </span>
        </div>
        <svg
          className={`w-3 h-3 text-slate-600 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pt-2 pb-3 border-t border-[#1e1e3a]">
          <div className="space-y-0.5 font-mono">
            {lines.map((line, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 py-0.5"
                style={{ paddingLeft: `${line.depth * 14}px` }}
              >
                {line.type === 'root' && (
                  <>
                    <span className="text-[9px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded flex-shrink-0">
                      Q
                    </span>
                    <span className="text-[11px] text-white font-semibold truncate">
                      {line.text}
                    </span>
                  </>
                )}

                {line.type === 'chosen' && (
                  <>
                    <span className="text-violet-500 text-[10px] flex-shrink-0">▶</span>
                    <span className="text-[11px] text-violet-400 font-semibold truncate">
                      {line.text}
                    </span>
                    <span className="text-[9px] text-violet-700 flex-shrink-0">✓</span>
                  </>
                )}

                {line.type === 'skipped' && (
                  <>
                    <span className="text-slate-700 text-[10px] flex-shrink-0">─</span>
                    <span className="text-[11px] text-slate-600 truncate">{line.text}</span>
                  </>
                )}

                {line.type === 'available' && (
                  <>
                    <span className="text-emerald-500 text-[10px] flex-shrink-0">◉</span>
                    <span className="text-[11px] text-emerald-400 font-medium truncate">
                      {line.text}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 pt-2.5 mt-2 border-t border-[#1e1e3a]">
            <span className="flex items-center gap-1 text-[9px] text-slate-600">
              <span className="text-violet-400">▶</span> explored
            </span>
            <span className="flex items-center gap-1 text-[9px] text-slate-600">
              <span className="text-emerald-400">◉</span> explore next
            </span>
            <span className="flex items-center gap-1 text-[9px] text-slate-600">
              <span className="text-slate-600">─</span> not taken
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
