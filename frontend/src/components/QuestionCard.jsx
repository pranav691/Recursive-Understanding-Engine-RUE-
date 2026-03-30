import { useState } from 'react'

const scoreGrade = (score) => {
  if (score >= 80) return { color: 'text-emerald-400', bar: 'bg-emerald-500', label: 'Excellent' }
  if (score >= 60) return { color: 'text-amber-400',   bar: 'bg-amber-500',   label: 'Good' }
  if (score >= 40) return { color: 'text-orange-400',  bar: 'bg-orange-500',  label: 'Partial' }
  return             { color: 'text-red-400',    bar: 'bg-red-500',     label: 'Needs Work' }
}

export default function QuestionCard({ question, idealAnswer, depthIndex, questionIndex, onResult }) {
  const [answer, setAnswer]       = useState('')
  const [result, setResult]       = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [showIdeal, setShowIdeal] = useState(false)

  const handleEvaluate = async () => {
    if (!answer.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/feynman/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, ideal_answer: idealAnswer, user_answer: answer }),
      })
      if (!res.ok) throw new Error('Evaluation failed')
      const data = await res.json()
      setResult(data)
      onResult?.({ question, idealAnswer, userAnswer: answer, ...data })
    } catch (e) {
      setError('Could not evaluate — please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => { setResult(null); setAnswer(''); setShowIdeal(false); setError(null) }

  const grade = result ? scoreGrade(result.score) : null

  return (
    <div className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl overflow-hidden">
      {/* Question header */}
      <div className="px-5 py-4 border-b border-[#1e1e3a] flex items-start gap-3">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-[10px] font-bold text-violet-400">
          {questionIndex + 1}
        </span>
        <p className="text-sm text-white font-medium leading-relaxed">{question}</p>
      </div>

      <div className="p-5 space-y-4">
        {/* Answer area (hidden after evaluation) */}
        {!result ? (
          <>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Explain in your own words — as if teaching someone else…"
              rows={5}
              className="w-full bg-[#13131f] border border-[#1e1e3a] focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 rounded-lg px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none resize-none transition-all leading-relaxed"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleEvaluate}
                disabled={!answer.trim() || loading}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {loading ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Evaluating…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Evaluate Answer
                  </>
                )}
              </button>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {/* Your answer */}
            <div className="bg-[#13131f] border border-[#1e1e3a] rounded-lg px-4 py-3">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Your Answer</p>
              <p className="text-sm text-slate-300 leading-relaxed">{answer}</p>
            </div>

            {/* Score bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${grade.color}`}>{grade.label}</span>
                <span className={`text-xl font-bold ${grade.color}`}>{result.score}%</span>
              </div>
              <div className="h-2 bg-[#1e1e3a] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${grade.bar}`}
                  style={{ width: `${result.score}%` }}
                />
              </div>
            </div>

            {/* Feedback */}
            <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg px-4 py-3">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-violet-400 mb-2">Feedback</p>
              <p className="text-sm text-slate-300 leading-relaxed">{result.feedback}</p>
            </div>

            {/* Ideal answer (collapsible) */}
            <div className="border border-emerald-500/20 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowIdeal((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors"
              >
                <span className="text-[9px] font-semibold uppercase tracking-widest text-emerald-400">Model Answer</span>
                <svg
                  className={`w-3.5 h-3.5 text-emerald-500 transition-transform ${showIdeal ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showIdeal && (
                <div className="px-4 py-3 bg-emerald-500/5 border-t border-emerald-500/20">
                  <p className="text-sm text-slate-300 leading-relaxed">{idealAnswer}</p>
                </div>
              )}
            </div>

            <button
              onClick={handleRetry}
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
