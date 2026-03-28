import { useState } from 'react'

const LABELS = ['A', 'B', 'C', 'D']

export default function MCQCard({ question, options, correct, explanation, questionIndex, onResult }) {
  const [selected, setSelected]   = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    if (selected === null) return
    setSubmitted(true)
    onResult?.({ question, selected, correct, isCorrect: selected === correct })
  }

  const optionStyle = (i) => {
    if (!submitted) {
      return selected === i
        ? 'border-violet-500/60 bg-violet-500/10 text-violet-300'
        : 'border-[#1e1e3a] bg-[#13131f] text-slate-300 hover:border-violet-500/30 hover:bg-violet-500/5'
    }
    if (i === correct)                   return 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
    if (i === selected && i !== correct) return 'border-red-500/60 bg-red-500/10 text-red-300'
    return 'border-[#1e1e3a] bg-[#0d0d1a] text-slate-600'
  }

  const labelStyle = (i) => {
    if (!submitted) return selected === i ? 'text-violet-400 border-violet-500/40 bg-violet-500/10' : 'text-slate-600 border-[#2a2a45] bg-[#13131f]'
    if (i === correct)                   return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
    if (i === selected && i !== correct) return 'text-red-400 border-red-500/40 bg-red-500/10'
    return 'text-slate-700 border-[#1e1e3a] bg-[#0d0d1a]'
  }

  const isCorrect = submitted && selected === correct

  return (
    <div className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl overflow-hidden">
      {/* Question */}
      <div className="px-5 py-4 border-b border-[#1e1e3a] flex items-start gap-3">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-[10px] font-bold text-cyan-400">
          {questionIndex + 1}
        </span>
        <p className="text-sm text-white font-medium leading-relaxed">{question}</p>
      </div>

      <div className="p-5 space-y-3">
        {/* Options */}
        {options.map((option, i) => (
          <button
            key={i}
            onClick={() => !submitted && setSelected(i)}
            disabled={submitted}
            className={`w-full flex items-start gap-3 px-4 py-3 rounded-lg border text-left transition-all duration-150 disabled:cursor-default ${optionStyle(i)}`}
          >
            <span className={`flex-shrink-0 w-5 h-5 rounded border text-[9px] font-bold flex items-center justify-center mt-0.5 transition-all ${labelStyle(i)}`}>
              {LABELS[i]}
            </span>
            <span className="text-sm leading-relaxed flex-1">{option}</span>
            {submitted && i === correct && (
              <svg className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {submitted && i === selected && i !== correct && (
              <svg className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        ))}

        {/* Submit */}
        {!submitted && (
          <button
            onClick={handleSubmit}
            disabled={selected === null}
            className="mt-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Submit Answer
          </button>
        )}

        {/* Explanation */}
        {submitted && (
          <div className={`rounded-lg px-4 py-3 border mt-2 ${
            isCorrect
              ? 'bg-emerald-500/5 border-emerald-500/20'
              : 'bg-red-500/5 border-red-500/20'
          }`}>
            <p className={`text-[9px] font-semibold uppercase tracking-widest mb-2 ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
              {isCorrect ? '✓ Correct!' : `✗ Incorrect — Correct answer: ${LABELS[correct]}`}
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">{explanation}</p>
          </div>
        )}
      </div>
    </div>
  )
}
