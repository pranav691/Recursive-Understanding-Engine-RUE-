import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import ExplorationNode from './components/ExplorationNode'
import HistorySidebar from './components/HistorySidebar'
import PathSidebar from './components/PathSidebar'
import FeynmanPage from './pages/FeynmanPage'

// ── Session clarity metrics ───────────────────────────────────────────────────

const DIFFICULTY_WEIGHTS = { hard: 3, medium: 2, easy: 1 }

function computeSessionMetrics(stack) {
  const questionNode = stack[0]
  if (!questionNode?.terms?.length || stack.length < 2) return null

  const terms = questionNode.terms
    .map((t) => (typeof t === 'string' ? { term: t, difficulty: 'medium' } : t))
    .filter((t) => t.term)
  const totalTerms = terms.length
  if (totalTerms === 0) return null

  const exploredTitles = new Set(stack.slice(1).map((n) => n.title?.toLowerCase()))
  const depth = stack.length - 1

  let totalSqWeight = 0
  let exploredSqWeight = 0
  let exploredCount = 0

  terms.forEach(({ term, difficulty }) => {
    const w = DIFFICULTY_WEIGHTS[difficulty] ?? 2
    const w2 = w * w  // squared: hard=9, medium=4, easy=1
    totalSqWeight += w2
    if (exploredTitles.has(term.toLowerCase())) {
      exploredSqWeight += w2
      exploredCount++
    }
  })

  // Knowledge Clarity: missing a hard term (w²=9) penalises far more than missing an easy one (w²=1)
  // Score = 1 - (unexplored squared weight / total squared weight)
  const missedSqWeight = totalSqWeight - exploredSqWeight
  const weightedClarity = totalSqWeight > 0 ? 1 - missedSqWeight / totalSqWeight : 0

  // Depth Understanding:
  //   depth_factor  = depth / (depth + 2)  — hyperbolic, no hard cap, diminishing returns
  //   breadth_factor = √(explored / total) — rewards first explorations more, punishes surface-clicking
  const depthFactor = depth / (depth + 2)
  const breadthFactor = Math.sqrt(exploredCount / totalTerms)
  const depthClarity = breadthFactor * depthFactor

  return {
    weightedClarity: Math.min(weightedClarity, 1.0),
    depthClarity: Math.min(depthClarity, 1.0),
  }
}

// ── API helpers ───────────────────────────────────────────────────────────────

// Streaming answer via SSE — calls onToken for each chunk, onConcepts when done
async function apiAskStream(question, onToken, onConcepts, onError) {
  const res = await fetch('/api/ask/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })
  if (!res.ok) { onError('Server error ' + res.status); return }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const lines = decoder.decode(value, { stream: true }).split('\n')
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const event = JSON.parse(line.slice(6))
        if (event.type === 'token') onToken(event.content)
        else if (event.type === 'concepts') onConcepts(event.terms)
        else if (event.type === 'error') onError(event.message)
      } catch (_) { /* skip malformed lines */ }
    }
  }
}

async function apiExplore(term, context) {
  const res = await fetch('/api/explore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ term, context }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed')
  return res.json()
}

async function apiSaveSession(question, stack, existingId = null, isBranch = false, rootQuestion = '', metrics = null) {
  const url = existingId ? `/api/history/${existingId}` : '/api/history'
  const method = existingId ? 'PUT' : 'POST'
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      stack,
      is_branch: isBranch,
      root_question: rootQuestion,
      weighted_clarity: metrics?.weightedClarity ?? 0.0,
      depth_clarity: metrics?.depthClarity ?? 0.0,
    }),
  })
  if (!res.ok) throw new Error('Failed to save')
  return res.json()
}

// Main history — only non-branch sessions (saved via "I Understand!")
async function apiGetHistory() {
  const res = await fetch('/api/history?is_branch=0')
  if (!res.ok) throw new Error('Failed to load history')
  return res.json()
}

// Branch paths saved under a root question
async function apiGetBranches(rootQuestion) {
  const res = await fetch(`/api/history?is_branch=1&root_question=${encodeURIComponent(rootQuestion)}`)
  if (!res.ok) throw new Error('Failed to load branches')
  return res.json()
}

async function apiGetSession(id) {
  const res = await fetch(`/api/history/${id}`)
  if (!res.ok) throw new Error('Session not found')
  return res.json()
}

async function apiDeleteSession(id) {
  await fetch(`/api/history/${id}`, { method: 'DELETE' })
}

async function apiDeleteBranchesForQuestion(rootQuestion) {
  await fetch(`/api/history?root_question=${encodeURIComponent(rootQuestion)}`, { method: 'DELETE' })
}

async function apiSimplify(content, title) {
  const res = await fetch('/api/simplify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, title }),
  })
  if (!res.ok) throw new Error('Failed to simplify')
  return res.json()
}

// ── Understanding score ───────────────────────────────────────────────────────

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [input, setInput] = useState('')
  const [stack, setStack] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])
  const [branches, setBranches] = useState([])
  const [activeHistoryId, setActiveHistoryId] = useState(null)
  const [saved, setSaved] = useState(false)

  const [feynmanMode, setFeynmanMode] = useState(null)

  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const currentBranchIdRef = useRef(null)

  const hasStarted = stack.length > 0
  const canUnderstand = stack.filter((n) => n.type === 'term' && !n.loading).length >= 1
  const sessionMetrics = useMemo(() => computeSessionMetrics(stack), [stack])


  // Load main history on mount
  const refreshHistory = useCallback(async () => {
    try {
      const data = await apiGetHistory()
      setHistory(data)
    } catch {}
  }, [])

  // Load branch paths for a given root question
  const refreshBranches = useCallback(async (rootQuestion) => {
    if (!rootQuestion) { setBranches([]); return }
    try {
      const data = await apiGetBranches(rootQuestion)
      setBranches(data)
    } catch {}
  }, [])

  useEffect(() => { refreshHistory() }, [refreshHistory])

  // Auto-scroll to bottom when stack grows
  useEffect(() => {
    if (stack.length > 0) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 120)
    }
  }, [stack.length])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAsk = async () => {
    const q = input.trim()
    if (!q || isLoading) return
    setError(null)
    setSaved(false)
    setActiveHistoryId(null)
    currentBranchIdRef.current = null
    setBranches([])
    setIsLoading(true)
    setFeynmanMode(null)

    // Start with empty content + streaming flag — answer builds token by token
    setStack([{ id: 0, type: 'question', title: q, content: '', terms: [], loading: false, streaming: true }])

    let fullAnswer = ''
    let finalTerms = []

    await apiAskStream(
      q,
      // onToken — append each chunk to content
      (token) => {
        fullAnswer += token
        setStack((prev) => prev.map((n, i) => i === 0 ? { ...n, content: n.content + token } : n))
      },
      // onConcepts — attach terms and stop streaming cursor
      (terms) => {
        finalTerms = terms
        setStack((prev) => prev.map((n, i) => i === 0 ? { ...n, terms, streaming: false } : n))
      },
      // onError
      (msg) => { setError(msg); setStack([]) }
    )

    setIsLoading(false)

    // Auto-save to history as soon as the answer is ready
    if (fullAnswer) {
      const initialStack = [{ id: 0, type: 'question', title: q, content: fullAnswer, terms: finalTerms, loading: false, streaming: false }]
      try {
        const result = await apiSaveSession(q, initialStack, null, false, '', null)
        setActiveHistoryId(result.id)
        setSaved(true)
        await refreshHistory()
      } catch (_) { /* best-effort */ }
    }
  }

  const handleTermClick = async (term, fromDepth) => {
    const context = stack[fromDepth].content
    const rootQ = stack[0]?.title || ''

    // If user is changing direction (going back to a previous node), finalize the current branch in-place
    if (stack.length > fromDepth + 1) {
      try {
        await apiSaveSession(rootQ, stack, currentBranchIdRef.current, true, rootQ)
        currentBranchIdRef.current = null  // new direction → next explore creates a fresh branch entry
      } catch (_) { /* best-effort */ }
    }

    // Add the explored term to the source node's keyword list if not already present
    const termExists = (stack[fromDepth].terms || []).some(
      (t) => (typeof t === 'string' ? t : t.term)?.toLowerCase() === term.toLowerCase()
    )
    const updatedSourceNode = termExists
      ? stack[fromDepth]
      : { ...stack[fromDepth], terms: [...(stack[fromDepth].terms || []), { term, difficulty: 'medium' }] }

    const newId = Date.now()
    const loadingNode = { id: newId, type: 'term', title: term, content: '', terms: [], loading: true }
    setStack((prev) => [...prev.slice(0, fromDepth), updatedSourceNode, loadingNode])

    try {
      const result = await apiExplore(term, context)
      const newStack = [
        ...stack.slice(0, fromDepth),
        updatedSourceNode,
        { ...loadingNode, content: result.explanation, terms: result.terms, loading: false },
      ]
      setStack(() => newStack)

      // Auto-update the main session with the new exploration depth
      const currentId = activeHistoryId
      if (currentId) {
        try {
          const metrics = computeSessionMetrics(newStack)
          await apiSaveSession(rootQ, newStack, currentId, false, '', metrics)
          const newDepth = newStack.filter((n) => n.type === 'term').length
          setHistory((prev) => prev.map((h) =>
            h.id === currentId ? { ...h, depth: newDepth, timestamp: new Date().toISOString() } : h
          ))
        } catch (_) { /* best-effort */ }
      }

      // Save / update branch path in Past Paths
      try {
        const savedBranch = await apiSaveSession(rootQ, newStack, currentBranchIdRef.current, true, rootQ)
        const branchEntry = {
          id: savedBranch.id,
          question: rootQ,
          timestamp: new Date().toISOString(),
          depth: newStack.filter((n) => n.type === 'term').length,
          nodes: newStack.map((n) => ({ title: n.title, type: n.type })),
        }
        if (currentBranchIdRef.current === null) {
          setBranches((prev) => [branchEntry, ...prev])
        } else {
          setBranches((prev) => prev.map((b) => b.id === currentBranchIdRef.current ? branchEntry : b))
        }
        currentBranchIdRef.current = savedBranch.id
      } catch (_) { /* best-effort */ }
    } catch (e) {
      setError(e.message)
      setStack((prev) => prev.slice(0, fromDepth + 1))
    }
  }

  const handleSimplify = async (depth) => {
    const node = stack[depth]
    if (!node || node.simplified?.loading) return
    setStack((prev) =>
      prev.map((n, i) => i === depth ? { ...n, simplified: { content: '', loading: true } } : n)
    )
    try {
      const result = await apiSimplify(node.content, node.title)
      setStack((prev) =>
        prev.map((n, i) => i === depth ? { ...n, simplified: { content: result.simplified, loading: false } } : n)
      )
    } catch (e) {
      setStack((prev) =>
        prev.map((n, i) => i === depth ? { ...n, simplified: undefined } : n)
      )
      setError('Failed to simplify')
    }
  }


  const handleSelectHistory = async (id) => {
    currentBranchIdRef.current = null
    setFeynmanMode(null)
    try {
      const session = await apiGetSession(id)
      setStack(session.stack)
      setInput(session.question)
      setActiveHistoryId(id)
      setSaved(true)
      setError(null)
      // Load the branch paths that belong to this session's root question
      const rootQ = session.stack?.[0]?.title || session.question
      await refreshBranches(rootQ)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200)
    } catch (e) {
      setError('Could not load session')
    }
  }

  const handleDeleteHistory = async (id) => {
    const session = history.find((h) => h.id === id)
    const rootQuestion = session?.question || ''

    await apiDeleteSession(id)

    // Also wipe all branch paths saved under this session's question
    if (rootQuestion) await apiDeleteBranchesForQuestion(rootQuestion)

    if (activeHistoryId === id || stack[0]?.title === rootQuestion) {
      setStack([])
      setInput('')
      setActiveHistoryId(null)
      setBranches([])
      setSaved(false)
      setError(null)
      setFeynmanMode(null)
      currentBranchIdRef.current = null
    } else if (rootQuestion && stack[0]?.title === rootQuestion) {
      // Clear right-sidebar paths if they belong to the deleted session's question
      setBranches([])
    }

    await refreshHistory()
  }

  const handleDeleteBranch = async (id) => {
    await apiDeleteSession(id)
    setBranches((prev) => prev.filter((b) => b.id !== id))
    // If this branch was the active session, clear the view
    if (activeHistoryId === id) {
      setActiveHistoryId(null)
      setSaved(false)
    }
  }

  const handleReset = () => {
    setStack([])
    setInput('')
    setError(null)
    setBranches([])
    setSaved(false)
    setActiveHistoryId(null)
    setFeynmanMode(null)
    currentBranchIdRef.current = null
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#07070f] text-slate-100 overflow-hidden">

      {/* ── Left History Sidebar ── */}
      <HistorySidebar
        history={history}
        activeId={activeHistoryId}
        onNew={handleReset}
        onSelect={handleSelectHistory}
        onDelete={handleDeleteHistory}
      />

      {/* ── Center: Header + Main ── */}
      {feynmanMode ? (
        <FeynmanPage
          stack={stack}
          mode={feynmanMode}
          sessionId={activeHistoryId}
          onBack={() => setFeynmanMode(null)}
          onSwitchMode={setFeynmanMode}
        />
      ) : (
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="flex-shrink-0 border-b border-[#1a1a2e] bg-[#07070f]/90 backdrop-blur-md z-50">
          <div className="px-5 py-3 flex items-center gap-4">
            {/* Logo — click to go home */}
            <button
              onClick={handleReset}
              title="Home"
              className="flex items-center gap-2.5 flex-shrink-0 group"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-violet-400 flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:shadow-violet-500/50 transition-shadow">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.699-1.386 2.43l-3.114-.58M5 14.5l-1.402 1.402c-1 1-.03 2.699 1.386 2.43l3.114-.58" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-none group-hover:text-violet-200 transition-colors">RUE</p>
                <p className="text-[10px] text-slate-500 leading-none">Recursive Understanding Engine</p>
              </div>
            </button>

            {hasStarted && (
              <div className="ml-auto flex items-center gap-2">
                {canUnderstand && (
                  <>
                    <button
                      onClick={() => setFeynmanMode('qa')}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-300 border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 hover:border-violet-500/50 rounded-lg px-2.5 py-1.5 transition-all"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Q/A Mode
                    </button>
                    <button
                      onClick={() => setFeynmanMode('mcq')}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-300 border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 hover:border-cyan-500/50 rounded-lg px-2.5 py-1.5 transition-all"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      MCQ Mode
                    </button>
                  </>
                )}
                <button
                  onClick={handleReset}
                  className="text-[10px] text-slate-500 hover:text-slate-300 border border-[#1a1a2e] hover:border-[#2a2a4a] rounded-lg px-2 py-1 transition-colors"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable main content */}
        <main className="flex-1 overflow-y-auto px-5 pb-16">
          {/* Hero / Search */}
          <div className={`transition-all duration-500 ${hasStarted ? 'pt-6 pb-5' : 'flex flex-col items-center justify-center min-h-[70vh]'}`}>
            {!hasStarted && (
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs px-3 py-1.5 rounded-full mb-6 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  Powered by AI ALCHEMIST
                </div>
                <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
                  Understand anything,{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-300">
                    deeply.
                  </span>
                </h1>
                <p className="text-slate-400 text-base max-w-md mx-auto">
                  Ask a question. Click on any highlighted term to explore it further. Keep drilling until you truly understand.
                </p>
              </div>
            )}

            {/* Input row */}
            <div className="flex gap-2 w-full max-w-2xl">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                placeholder={hasStarted ? 'Ask another question…' : 'Ask anything… (e.g. What is gradient descent?)'}
                disabled={isLoading}
                className="flex-1 bg-[#0d0d1a] border border-[#1e1e3a] focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm transition-all outline-none disabled:opacity-60"
              />
              <button
                onClick={handleAsk}
                disabled={isLoading || !input.trim()}
                className="px-5 py-3 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-violet-500/20 flex-shrink-0"
              >
                {isLoading ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 max-w-2xl w-full">
                {error}
              </div>
            )}
          </div>

          {/* Breadcrumb */}
          {stack.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap mb-5 text-xs max-w-2xl">
              {stack.map((node, i) => (
                <span key={node.id} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <svg className="w-3 h-3 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  <span className={i === stack.length - 1 ? 'text-violet-400 font-semibold' : 'text-slate-500 font-medium'}>
                    {i === 0 ? 'Answer' : node.title}
                  </span>
                </span>
              ))}
            </div>
          )}

          {/* Exploration stack */}
          <div className="flex flex-col gap-3 max-w-2xl">
            {stack.map((node, depth) => (
              <ExplorationNode
                key={node.id}
                node={node}
                depth={depth}
                onTermClick={(term) => handleTermClick(term, depth)}
                onSimplify={handleSimplify}
              />
            ))}
          </div>

          {/* Hint after first answer */}
          {stack.length === 1 && !stack[0].loading && stack[0].terms?.length > 0 && (
            <p className="text-center text-xs text-slate-600 mt-5 italic max-w-2xl">
              Tip: click any{' '}
              <span className="text-violet-400 underline decoration-dotted">highlighted term</span>{' '}
              or the chips below to go deeper
            </p>
          )}

          {/* Auto-saved indicator */}
          {saved && activeHistoryId && (
            <div className="flex justify-center mt-6 max-w-2xl fade-in">
              <div className="flex items-center gap-1.5 px-3 py-1.5 text-emerald-500/70 text-[11px] font-medium">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Auto-saved to history
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </main>
      </div>

      )}

      {/* ── Right: Learning Path Sidebar ── */}
      <PathSidebar
        stack={stack}
        branches={branches}
        activeId={activeHistoryId}
        onSelect={handleSelectHistory}
        onDeleteBranch={handleDeleteBranch}
      />
    </div>
  )
}
