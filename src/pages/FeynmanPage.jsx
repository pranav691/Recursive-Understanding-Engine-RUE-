import { useState, useEffect, useCallback } from 'react'
import QuestionCard from '../components/QuestionCard'
import MCQCard from '../components/MCQCard'

// ── API ───────────────────────────────────────────────────────────────────────

async function apiFetchQuestions(stack) {
  const res = await fetch('/api/feynman/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stack }),
  })
  if (!res.ok) throw new Error('Failed to generate questions')
  return res.json()
}

async function apiFetchMCQs(stack) {
  const res = await fetch('/api/feynman/mcqs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stack }),
  })
  if (!res.ok) throw new Error('Failed to generate MCQs')
  return res.json()
}

async function apiSaveResults(sessionId, mode, concept, results) {
  try {
    await fetch('/api/feynman/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId || 0, mode, concept, results }),
    })
  } catch (_) { /* best-effort */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffleMCQ(mcq) {
  const options = [...mcq.options]
  const correctText = options[mcq.correct]
  // Fisher-Yates shuffle
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]]
  }
  return { ...mcq, options, correct: options.indexOf(correctText) }
}

function computeSummary(depths, results, mode) {
  return depths.map((d, depthIdx) => {
    const items = mode === 'qa' ? (d.questions || []) : (d.mcqs || [])
    const itemResults = items.map((_, qIdx) => results[`${depthIdx}_${qIdx}`]).filter(Boolean)

    if (mode === 'qa') {
      const avgScore = itemResults.length
        ? Math.round(itemResults.reduce((s, r) => s + (r.score || 0), 0) / itemResults.length)
        : null
      return { topic: d.topic, depth: d.depth, attempted: itemResults.length, total: items.length, avgScore }
    } else {
      const correct = itemResults.filter(r => r.isCorrect).length
      const avgScore = itemResults.length ? Math.round((correct / itemResults.length) * 100) : null
      return { topic: d.topic, depth: d.depth, attempted: itemResults.length, total: items.length, correct, avgScore }
    }
  })
}

function scoreColor(score) {
  if (score === null || score === undefined) return { text: 'text-slate-500', bg: 'bg-slate-500/40', label: 'Not attempted' }
  if (score >= 80) return { text: 'text-emerald-400', bg: 'bg-emerald-500', label: 'Excellent' }
  if (score >= 60) return { text: 'text-amber-400',   bg: 'bg-amber-500',   label: 'Good' }
  if (score >= 40) return { text: 'text-orange-400',  bg: 'bg-orange-500',  label: 'Needs Review' }
  return               { text: 'text-red-400',    bg: 'bg-red-500',     label: 'Weak Area' }
}

const DEPTH_COLORS = [
  { border: 'border-l-violet-500',  badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30',   dot: 'bg-violet-500'  },
  { border: 'border-l-blue-500',    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',         dot: 'bg-blue-500'    },
  { border: 'border-l-cyan-500',    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',         dot: 'bg-cyan-500'    },
  { border: 'border-l-emerald-500', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',dot: 'bg-emerald-500' },
  { border: 'border-l-amber-500',   badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',      dot: 'bg-amber-500'   },
]

// ── Summary Panel ─────────────────────────────────────────────────────────────

function SummaryPanel({ summary, mode, conceptName, onClose, onRetry }) {
  const attempted = summary.filter(d => d.attempted > 0)
  const overallScore = attempted.length
    ? Math.round(attempted.reduce((s, d) => s + (d.avgScore || 0), 0) / attempted.length)
    : null
  const weakAreas = summary.filter(d => d.avgScore !== null && d.avgScore < 60)
  const sc = scoreColor(overallScore)

  return (
    <div className="fixed inset-0 z-50 bg-[#07070f]/95 backdrop-blur-md flex items-center justify-center p-6">
      <div className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="px-6 py-5 border-b border-[#1e1e3a] flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Session Complete</p>
            <h2 className="text-white font-bold text-base truncate">{conceptName}</h2>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border flex-shrink-0 ${
            mode === 'qa'
              ? 'text-violet-300 bg-violet-500/10 border-violet-500/30'
              : 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30'
          }`}>
            {mode === 'qa' ? 'Q/A Mode' : 'MCQ Mode'}
          </span>
        </div>

        {/* Overall score */}
        <div className="px-6 py-5 border-b border-[#1e1e3a]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Overall Score</span>
            {overallScore !== null
              ? <span className={`text-3xl font-bold ${sc.text}`}>{overallScore}%</span>
              : <span className="text-slate-600 text-sm italic">No answers submitted</span>
            }
          </div>
          {overallScore !== null && (
            <>
              <div className="h-2 bg-[#1e1e3a] rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${sc.bg}`} style={{ width: `${overallScore}%` }} />
              </div>
              <p className={`text-xs mt-1.5 font-medium ${sc.text}`}>{sc.label}</p>
            </>
          )}
        </div>

        {/* Per-depth breakdown */}
        <div className="px-6 py-4 space-y-4 max-h-52 overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Depth Breakdown</p>
          {summary.map((d, i) => {
            const dsc = scoreColor(d.avgScore)
            const dc = DEPTH_COLORS[i % DEPTH_COLORS.length]
            return (
              <div key={i} className="flex items-start gap-3">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border mt-0.5 flex-shrink-0 ${dc.badge}`}>
                  {i === 0 ? 'Q' : `D${i}`}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-300 truncate font-medium">{d.topic}</span>
                    <span className={`text-xs font-bold flex-shrink-0 ml-2 ${dsc.text}`}>
                      {d.avgScore !== null ? `${d.avgScore}%` : '—'}
                    </span>
                  </div>
                  <div className="h-1 bg-[#1e1e3a] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${dsc.bg}`}
                      style={{ width: d.avgScore !== null ? `${d.avgScore}%` : '0%' }} />
                  </div>
                  <p className="text-[9px] text-slate-600 mt-0.5">{d.attempted}/{d.total} attempted</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Weak areas */}
        {weakAreas.length > 0 && (
          <div className="px-6 py-3 bg-red-500/5 border-t border-red-500/20">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400 mb-2">
              Weak Areas — Review These
            </p>
            <div className="flex flex-wrap gap-1.5">
              {weakAreas.map((d, i) => (
                <span key={i} className="text-[10px] text-red-300 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                  {d.topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 border-t border-[#1e1e3a] flex gap-2">
          <button
            onClick={onRetry}
            className="flex-1 py-2.5 text-xs font-semibold text-slate-400 border border-[#1e1e3a] rounded-xl hover:border-[#2a2a45] hover:text-slate-300 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-colors"
          >
            Back to Concept
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton({ mode }) {
  return (
    <div className="space-y-5 animate-pulse max-w-2xl mx-auto">
      <div className="flex items-center gap-3 text-slate-500 mb-2">
        <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        <span className="text-sm">Generating {mode === 'qa' ? 'questions' : 'MCQs'}…</span>
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl p-5 space-y-3">
          <div className="h-2.5 bg-[#1e1e3a] rounded w-1/4" />
          <div className="h-4 bg-[#1e1e3a] rounded w-3/4" />
          {mode === 'qa' ? (
            <div className="h-24 bg-[#1e1e3a] rounded w-full" />
          ) : (
            <div className="space-y-2">
              {[0,1,2,3].map(j => <div key={j} className="h-10 bg-[#1e1e3a] rounded w-full" />)}
            </div>
          )}
          <div className="h-8 bg-[#1e1e3a] rounded w-28" />
        </div>
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FeynmanPage({ stack, mode, sessionId, onBack, onSwitchMode }) {
  const conceptName = stack[0]?.title || 'Unknown Concept'

  const [depths, setDepths]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [results, setResults]         = useState({})
  const [showSummary, setShowSummary] = useState(false)
  const [resultsSaved, setResultsSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setResults({})
    setShowSummary(false)
    setResultsSaved(false)
    try {
      const data = mode === 'qa'
        ? await apiFetchQuestions(stack)
        : await apiFetchMCQs(stack)
      const depths = (data.depths || []).map(d =>
        mode === 'mcq' ? { ...d, mcqs: (d.mcqs || []).map(shuffleMCQ) } : d
      )
      setDepths(depths)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [stack, mode])

  useEffect(() => { load() }, [load])

  const handleResult = useCallback((depthIdx, qIdx, result) => {
    setResults(prev => ({ ...prev, [`${depthIdx}_${qIdx}`]: result }))
  }, [])

  const totalQuestions = depths.reduce((s, d) => {
    return s + ((mode === 'qa' ? d.questions : d.mcqs) || []).length
  }, 0)
  const attempted = Object.keys(results).length

  const summary = computeSummary(depths, results, mode)

  const handleShowSummary = async () => {
    setShowSummary(true)
    if (!resultsSaved && attempted > 0) {
      setResultsSaved(true)
      await apiSaveResults(sessionId, mode, conceptName, Object.values(results))
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

      {/* ── Header ── */}
      <header className="flex-shrink-0 border-b border-[#1a1a2e] bg-[#07070f]/90 backdrop-blur-md z-40">
        <div className="px-5 py-3 flex items-center gap-3">

          {/* Back */}
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-xs font-medium">Back</span>
          </button>

          <div className="w-px h-4 bg-[#1e1e3a] flex-shrink-0" />

          {/* Logo + title */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-600 to-violet-400 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.699-1.386 2.43l-3.114-.58M5 14.5l-1.402 1.402c-1 1-.03 2.699 1.386 2.43l3.114-.58" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 leading-none">Feynman Test</p>
              <p className="text-xs font-semibold text-white leading-none truncate max-w-[180px]">{conceptName}</p>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="ml-auto flex items-center gap-1 bg-[#0d0d1a] border border-[#1e1e3a] rounded-lg p-0.5 flex-shrink-0">
            <button
              onClick={() => mode !== 'qa' && onSwitchMode('qa')}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-md transition-all ${
                mode === 'qa'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Q/A
            </button>
            <button
              onClick={() => mode !== 'mcq' && onSwitchMode('mcq')}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-md transition-all ${
                mode === 'mcq'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              MCQ
            </button>
          </div>

          {/* Progress bar */}
          {!loading && totalQuestions > 0 && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[11px] text-slate-500 tabular-nums">{attempted}/{totalQuestions}</span>
              <div className="w-16 h-1.5 bg-[#1e1e3a] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${mode === 'qa' ? 'bg-violet-500' : 'bg-cyan-500'}`}
                  style={{ width: `${(attempted / totalQuestions) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Depth breadcrumb */}
        {!loading && depths.length > 0 && (
          <div className="px-5 pb-2.5 flex items-center gap-1.5 flex-wrap">
            {depths.map((d, i) => {
              const dc = DEPTH_COLORS[i % DEPTH_COLORS.length]
              const depthItems = (mode === 'qa' ? d.questions : d.mcqs) || []
              const depthDone = depthItems.filter((_, qi) => results[`${i}_${qi}`]).length
              return (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <svg className="w-3 h-3 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${dc.badge}`}>
                    {i === 0 ? 'Concept' : `Depth ${i}`} · {d.topic}
                    {depthDone > 0 && <span className="ml-1 opacity-70">({depthDone}/{depthItems.length})</span>}
                  </span>
                </span>
              )
            })}
          </div>
        )}
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto px-5 py-6">
        {loading ? (
          <LoadingSkeleton mode={mode} />
        ) : error ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4 text-sm text-red-400 flex items-center gap-3">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
              <button onClick={load} className="ml-auto text-red-300 hover:text-red-200 underline text-xs">Retry</button>
            </div>
          </div>
        ) : depths.length === 0 ? (
          <div className="max-w-2xl mx-auto text-center py-20">
            <p className="text-slate-500 text-sm">No questions could be generated.<br />Try exploring more concepts first.</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-10">
            {depths.map((d, depthIdx) => {
              const dc = DEPTH_COLORS[depthIdx % DEPTH_COLORS.length]
              const items = (mode === 'qa' ? d.questions : d.mcqs) || []
              const depthResults = items.map((_, qi) => results[`${depthIdx}_${qi}`]).filter(Boolean)
              const rawScore = depthResults.length
                ? Math.round(depthResults.reduce((s, r) => s + (r.score ?? (r.isCorrect ? 100 : 0)), 0) / depthResults.length)
                : null
              const dsc = scoreColor(rawScore)

              return (
                <section key={depthIdx}>
                  {/* Depth header */}
                  <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#1e1e3a]">
                    <div className={`w-1.5 h-7 rounded-full flex-shrink-0 ${dc.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        {depthIdx === 0 ? 'Main Concept' : `Depth ${depthIdx}`}
                      </p>
                      <p className="text-sm font-semibold text-white truncate">{d.topic}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-[10px] text-slate-600">{depthResults.length}/{items.length} done</span>
                      {rawScore !== null && (
                        <span className={`text-sm font-bold ${dsc.text}`}>{rawScore}%</span>
                      )}
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="space-y-4">
                    {mode === 'qa'
                      ? items.map((q, qIdx) => (
                          <QuestionCard
                            key={qIdx}
                            question={q.question}
                            idealAnswer={q.ideal_answer}
                            depthIndex={depthIdx}
                            questionIndex={qIdx}
                            onResult={(r) => handleResult(depthIdx, qIdx, r)}
                          />
                        ))
                      : items.map((q, qIdx) => (
                          <MCQCard
                            key={qIdx}
                            question={q.question}
                            options={q.options}
                            correct={q.correct}
                            explanation={q.explanation}
                            questionIndex={qIdx}
                            onResult={(r) => handleResult(depthIdx, qIdx, r)}
                          />
                        ))
                    }
                  </div>
                </section>
              )
            })}

            {/* View Summary CTA */}
            {attempted > 0 && (
              <div className="flex justify-center pb-8 fade-in">
                <button
                  onClick={handleShowSummary}
                  className={`flex items-center gap-2.5 px-6 py-3 font-semibold rounded-xl text-sm text-white transition-all shadow-lg ${
                    mode === 'qa'
                      ? 'bg-violet-600 hover:bg-violet-500 shadow-violet-500/20'
                      : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/20'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  View Summary
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    mode === 'qa' ? 'bg-violet-500' : 'bg-cyan-500'
                  }`}>{attempted}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Summary overlay ── */}
      {showSummary && (
        <SummaryPanel
          summary={summary}
          mode={mode}
          conceptName={conceptName}
          onClose={onBack}
          onRetry={() => { setShowSummary(false); load() }}
        />
      )}
    </div>
  )
}
