ANSWER_PROMPT = """You are an expert teacher. Answer the question clearly in exactly 3-4 sentences.
Start immediately with content — no preamble like "Sure!" or "Great question!".
Use precise technical terms. Write in flowing paragraph form. No bullet points."""

CONCEPT_EXTRACT_PROMPT = """Extract key conceptual terms from this explanation and rate their difficulty.

Return ONLY a valid JSON array. No markdown, no explanation.

Example: [{{"term": "gradient descent", "difficulty": "hard"}}, {{"term": "learning rate", "difficulty": "medium"}}]

Rules:
- Return 3-5 terms that are technical, potentially unfamiliar, and essential to understanding
- NEVER pick common words (is, the, a, which, that, this)
- NEVER use placeholder words like term1, term2
- Every term must appear verbatim in the text below
- difficulty: "easy" = widely known, "medium" = needs some background, "hard" = specialized jargon
- Terms from the original question must be excluded

Text:
{text}

Original question (exclude these terms):
{question}"""

FEYNMAN_QA_PROMPT = """You are a Feynman learning evaluator. Generate exactly 2 questions that test DEEP understanding of a concept.

Questions must:
- Ask the learner to explain in their own words (not recall facts)
- Probe the mechanism, analogy, or real-world implication
- Be answerable from the content provided

Topic: {topic}
Content: {content}

Return ONLY a valid JSON array (no markdown):
[
  {{"question": "Explain...", "ideal_answer": "A complete model answer covering the key idea fully."}},
  {{"question": "How would you describe...", "ideal_answer": "A complete model answer covering the key idea fully."}}
]"""

FEYNMAN_EVALUATE_PROMPT = """You are evaluating a student's answer using the Feynman technique rubric.

Question: {question}
Ideal Answer: {ideal_answer}
Student Answer: {user_answer}

Score 0-100 based on:
- Conceptual accuracy (40 pts) — is the core idea correct?
- Completeness (30 pts) — are key points covered?
- Clarity of explanation (30 pts) — is it clear and in their own words?

Return ONLY valid JSON (no markdown):
{{"score": 75, "feedback": "Specific, constructive feedback: what was correct, what was missing, and one suggestion to improve."}}"""

FEYNMAN_MCQ_PROMPT = """Generate exactly 5 multiple-choice questions to test understanding of this concept.

Topic: {topic}
Content: {content}

Rules:
- Each question has exactly 4 options (index 0-3)
- Exactly 1 correct answer per question
- 3 plausible distractors based on common misconceptions
- Questions test conceptual understanding, not memorization
- "correct" field must be the 0-based index of the correct option

Return ONLY a valid JSON array (no markdown):
[
  {{
    "question": "What best describes...?",
    "options": ["Correct answer here", "Plausible wrong A", "Plausible wrong B", "Plausible wrong C"],
    "correct": 0,
    "explanation": "The correct answer is X because... The others are wrong because..."
  }}
]"""

EXPLORE_PROMPT = """A user is exploring the term "{term}" while learning about: "{context_summary}"

Explain "{term}" from a fresh angle — its core mechanism, an analogy, or how it works internally.
Do NOT re-explain what was already said in the context.
Write exactly 2-3 sentences. No bullet points. Start immediately with content."""

EXPLORE_EXTRACT_PROMPT = """Extract key sub-concepts from this explanation that a learner might want to explore further.

Return ONLY a valid JSON array of objects. No markdown.

Example: [{{"term": "chain rule", "difficulty": "hard"}}, {{"term": "gradient", "difficulty": "medium"}}]

Rules:
- Return 2-4 terms that appear verbatim in the explanation below
- The term "{exclude}" must NOT appear in the array
- NEVER use placeholder words
- difficulty: "easy", "medium", or "hard"
- If no meaningful sub-terms exist, return: []

Explanation:
{explanation}"""

SIMPLIFY_PROMPT = """Rewrite this explanation about "{title}" in the simplest possible way.
Use an everyday analogy. Avoid all jargon. 2-3 sentences. Write for a curious 12-year-old.
Return only the simplified text — no labels, no preamble."""
