import { Fragment, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import TermText from './TermText'

// hard = red (most important, learn first) → medium = yellow → easy = green
const IMPORTANCE_ORDER = { hard: 0, medium: 1, easy: 2 }

const DEPTH_STYLES = [
  { border: 'border-l-violet-500',  badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  { border: 'border-l-blue-500',    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  { border: 'border-l-cyan-500',    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  { border: 'border-l-emerald-500', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  { border: 'border-l-amber-500',   badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
]

const CHIP_STYLES = {
  easy:   'text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/15 hover:border-emerald-500/50',
  medium: 'text-amber-300 border-amber-500/30 hover:bg-amber-500/15 hover:border-amber-500/50',
  hard:   'text-red-300 border-red-500/30 hover:bg-red-500/15 hover:border-red-500/50',
}

function normalizeTerm(t) {
  if (typeof t === 'string') return { term: t, difficulty: 'medium' }
  return { term: t.term || '', difficulty: t.difficulty || 'medium' }
}

export default function ExplorationNode({ node, depth, onTermClick, onSimplify }) {
  const style = DEPTH_STYLES[depth % DEPTH_STYLES.length]
  const indent = Math.min(depth * 28, 112)
  const hasSimplified = !!node.simplified
  const normalizedTerms = (node.terms || []).map(normalizeTerm).filter((t) => t.term)

  // ── Text-selection explore popup ────────────────────────────────────────────
  const [selPopup, setSelPopup] = useState(null)

  const showPopupForSelection = useCallback(() => {
    const sel = window.getSelection()
    const text = sel?.toString().trim()
    if (!text || text.length < 2 || text.length > 80 || !sel.rangeCount) {
      setSelPopup(null)
      return
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect()
    setSelPopup({ text, x: rect.left + rect.width / 2, y: rect.top })
  }, [])

  const handleMouseUp = showPopupForSelection
  const handleDoubleClick = showPopupForSelection

  useEffect(() => {
    const dismiss = (e) => {
      if (!e.target.closest('[data-sel-popup]')) setSelPopup(null)
    }
    document.addEventListener('mousedown', dismiss)
    return () => document.removeEventListener('mousedown', dismiss)
  }, [])
  // Sort by importance: hard (red) → medium (yellow) → easy (green)
  const orderedTerms = [...normalizedTerms].sort(
    (a, b) => (IMPORTANCE_ORDER[a.difficulty] ?? 1) - (IMPORTANCE_ORDER[b.difficulty] ?? 1)
  )

  return (
    <div
      style={{ marginLeft: `${indent}px` }}
      className={`fade-in rounded-xl border border-[#1e1e3a] border-l-2 ${style.border} bg-[#0d0d1a] p-5`}
    >
      {/* Node header */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-500">
          {node.type === 'question' ? 'Question' : 'Concept'}
        </span>
        <span className="text-slate-700">·</span>
        <span className="text-sm font-semibold text-white">{node.title}</span>
        {depth > 0 && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${style.badge}`}>
            depth {depth}
          </span>
        )}

        {/* Simplify button — top right */}
        {!node.loading && node.content && (
          <button
            onClick={() => onSimplify(depth)}
            disabled={node.simplified?.loading}
            title="Get a simpler explanation with analogies"
            className={`ml-auto flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border transition-all duration-150 ${
              hasSimplified
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-[#13131f] border-[#2a2a45] text-slate-400 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            {hasSimplified ? 'Simplified' : 'Simplify'}
          </button>
        )}
      </div>


      {/* Content area */}
      {node.loading ? (
        <div className="flex items-center gap-3 py-2">
          <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span className="text-sm text-slate-400">Thinking deeply…</span>
        </div>
      ) : node.streaming ? (
        <p className="text-slate-300 text-sm leading-relaxed mb-4">
          {node.content}
          <span className="inline-block w-0.5 h-4 bg-violet-400 animate-pulse ml-0.5 align-middle rounded-full" />
        </p>
      ) : (
        <>
          {/* Main content — splits into two columns when simplified */}
          <div className={`${hasSimplified ? 'flex gap-4' : ''} mb-4`}>
            {/* Original explanation */}
            <div className={hasSimplified ? 'flex-1 min-w-0' : ''}>
              {hasSimplified && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2">Original</p>
              )}
              <p className="text-slate-300 text-sm leading-relaxed" onMouseUp={handleMouseUp} onDoubleClick={handleDoubleClick}>
                <TermText text={node.content} terms={node.terms} onTermClick={onTermClick} />
              </p>
            </div>

            {/* Simplified panel */}
            {hasSimplified && (
              <>
                <div className="w-px bg-[#1e1e3a] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500/70 mb-2">
                    Simpler ✦
                  </p>
                  {node.simplified.loading ? (
                    <div className="flex items-center gap-2 text-slate-400">
                      <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      <span className="text-xs">Simplifying…</span>
                    </div>
                  ) : (
                    <p className="text-slate-300 text-sm leading-relaxed">{node.simplified.content}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Ordered chips with arrows: red (most important) → yellow → green */}
          {orderedTerms.length > 0 && (
            <div className="pt-3 border-t border-[#1e1e3a]">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-600">
                  Learn in this order
                </span>
                <span className="text-[9px] text-slate-700 italic">— click any to explore</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {orderedTerms.map(({ term, difficulty }, index) => (
                  <Fragment key={term}>
                    {index > 0 && (
                      <span className="text-slate-600 text-sm font-light select-none">→</span>
                    )}
                    <button
                      onClick={() => onTermClick(term)}
                      title={`${difficulty} — ${difficulty === 'hard' ? 'most important' : difficulty === 'medium' ? 'important' : 'supplementary'}`}
                      className={`text-xs px-3 py-1 rounded-full bg-[#13131f] border transition-all duration-200 ${CHIP_STYLES[difficulty] || CHIP_STYLES.medium}`}
                    >
                      {term}
                    </button>
                  </Fragment>
                ))}
              </div>
            </div>
          )}

          {normalizedTerms.length === 0 && node.type === 'term' && (
            <p className="text-xs text-slate-600 italic pt-3 border-t border-[#1e1e3a]">
              No further concepts — you've reached a foundational level.
            </p>
          )}
        </>
      )}

      {/* Selection-to-explore floating popup — rendered in a portal to escape the transformed ancestor */}
      {selPopup && createPortal(
        <div
          data-sel-popup="true"
          className="fixed z-[9999] flex items-center gap-1.5 bg-[#16162a] border border-violet-500/50 rounded-lg px-3 py-1.5 shadow-2xl cursor-pointer hover:bg-violet-500/15 hover:border-violet-400/70 transition-all"
          style={{
            left: `${selPopup.x}px`,
            top: `${selPopup.y}px`,
            transform: 'translate(-50%, calc(-100% - 6px))',
          }}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onTermClick(selPopup.text)
            setSelPopup(null)
            window.getSelection()?.removeAllRanges()
          }}
        >
          <svg className="w-3 h-3 text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[11px] text-violet-300 font-semibold">Explore</span>
          <span className="text-[10px] text-violet-500 max-w-[140px] truncate">"{selPopup.text}"</span>
        </div>,
        document.body
      )}
    </div>
  )
}
