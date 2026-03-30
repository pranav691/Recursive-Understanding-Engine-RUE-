/**
 * Renders text with key conceptual terms highlighted as clickable buttons.
 * Terms are passed as { term: string, difficulty: 'easy'|'medium'|'hard' } objects.
 * Color-coded by difficulty:
 *   easy   → green underline
 *   medium → amber underline
 *   hard   → red dashed underline
 */

const DIFFICULTY_STYLES = {
  easy:   'text-emerald-400 decoration-emerald-400/70 underline underline-offset-2 hover:text-emerald-300',
  medium: 'text-amber-400 decoration-amber-400/70 underline underline-offset-2 hover:text-amber-300',
  hard:   'text-red-400 decoration-red-400/70 underline decoration-dashed underline-offset-2 hover:text-red-300',
}

// Normalize terms to always be { term, difficulty } objects
function normalizeTerm(t) {
  if (typeof t === 'string') return { term: t, difficulty: 'medium' }
  return { term: t.term || '', difficulty: t.difficulty || 'medium' }
}

export default function TermText({ text, terms, onTermClick }) {
  if (!text) return null
  if (!terms || terms.length === 0) return <span>{text}</span>

  const normalized = terms.map(normalizeTerm).filter((t) => t.term)

  // Sort longest first to avoid partial-match conflicts
  const sorted = [...normalized].sort((a, b) => b.term.length - a.term.length)

  let segments = [{ text, isTerm: false }]

  for (const { term, difficulty } of sorted) {
    const next = []
    for (const seg of segments) {
      if (seg.isTerm) { next.push(seg); continue }
      const lower = seg.text.toLowerCase()
      const idx = lower.indexOf(term.toLowerCase())
      if (idx === -1) {
        next.push(seg)
      } else {
        if (idx > 0) next.push({ text: seg.text.slice(0, idx), isTerm: false })
        next.push({ text: seg.text.slice(idx, idx + term.length), isTerm: true, term, difficulty })
        if (idx + term.length < seg.text.length)
          next.push({ text: seg.text.slice(idx + term.length), isTerm: false })
      }
    }
    segments = next
  }

  return (
    <>
      {segments.map((seg, i) =>
        seg.isTerm ? (
          <button
            key={i}
            onClick={() => onTermClick(seg.term)}
            title={`${seg.difficulty} concept — click to explore`}
            className={`inline transition-all duration-150 cursor-pointer font-medium rounded px-0.5 ${DIFFICULTY_STYLES[seg.difficulty] || DIFFICULTY_STYLES.medium}`}
          >
            {seg.text}
          </button>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  )
}
