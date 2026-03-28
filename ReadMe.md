# RUE — Recursive Understanding Engine

> An agentic AI tutoring system that transforms passive Q&A into deep recursive learning. Ask any question, explore key concepts layer by layer, and validate understanding through Feynman-style Q&A and MCQ evaluations. Powered by NVIDIA LLMs with a FastAPI backend, React frontend, and persistent session tracking.

---

## The Problem

Every AI tutor today does the same thing:

```
User asks → AI answers → Done
```

The answer arrives instantly. But does the user actually understand it? Nobody checks. Knowledge gaps hide behind correct-sounding answers, and the AI moves on.

This leads to **superficial learning** — the kind where you can repeat a definition but can't explain the idea to someone else.

---

## The Solution

RUE flips the model. Instead of just answering, it builds understanding recursively:

```
Question → Answer → Extract Concepts → Explore Each Concept → Feynman Test → Score → Repeat
```

Every explanation surfaces the key terms inside it. Every term can be explored further. Every exploration can be tested. The system tracks how deep you went and how well you understood each layer.

---

## Features

### Recursive Concept Exploration
Ask any question and get a clear answer. Extracted key terms appear as color-coded chips — **red** (hard), **amber** (medium), **green** (easy) — ranked in the order you should learn them. Click any term to explore it in a fresh context without re-reading what was already said. Keep drilling until you hit foundational concepts.

### Text Selection Explore
Highlight any word or phrase in an explanation and an **Explore** popup appears directly above your selection. Click it to instantly explore that custom term.

### Simplify Mode
Every explanation has a **Simplify** button that rewrites it in plain language using everyday analogies — written for a curious 12-year-old. The simplified version appears side-by-side with the original.

### Feynman Validation — Q/A Mode
Test real understanding by answering open-ended questions in your own words. The AI evaluates your answer against an ideal response and scores it 0–100 across:
- Conceptual accuracy (40 pts)
- Completeness (30 pts)
- Clarity of explanation (30 pts)

Each question shows your score, feedback, and a model answer to compare against.

### Feynman Validation — MCQ Mode
5 multiple-choice questions per depth level, each with 3 carefully crafted distractors based on common misconceptions. Options are shuffled on every load so the correct answer is never always option A. Submit to see the correct answer highlighted and a full explanation.

### Session Metrics
Every session is scored on two axes:
- **Knowledge Clarity** — weighted by term difficulty (missing a hard concept costs more than missing an easy one)
- **Depth Understanding** — combines exploration breadth and depth using a hyperbolic decay formula

### Auto-Save
Sessions save to history the moment an answer arrives. Every term exploration updates the saved session automatically. No buttons to click.

### Learning Path Tracker
The right sidebar shows your current exploration path as a live tree — which terms you explored (▶), which you skipped (─), and what you can explore next (◉). Past branch paths are saved so you can revisit any direction you took.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, SQLite |
| Frontend | React 18, Vite, TailwindCSS |
| LLM API | NVIDIA API (OpenAI-compatible) |
| Main Model | `meta/llama-3.3-70b-instruct` |
| Fast Model | `meta/llama-3.1-8b-instruct` |

---

## Architecture

The backend is split into focused agents, each owning a single responsibility:

```
backend/
├── main.py                  — app entry point, mounts all routers
├── shared/
│   ├── client.py            — NVIDIA API client + model constants
│   ├── db.py                — SQLite init and helpers
│   ├── prompts.py           — all LLM prompt strings
│   ├── models.py            — Pydantic request models
│   └── utils.py             — extract_json, normalize_terms
└── agents/
    ├── answer_agent.py      — POST /api/ask/stream
    ├── explore_agent.py     — POST /api/explore  (+ LRU cache)
    ├── simplify_agent.py    — POST /api/simplify
    ├── history_agent.py     — CRUD /api/history
    └── feynman_agent.py     — POST /api/feynman/*
```

**Answer Agent** streams tokens via SSE, then extracts concepts with the fast model in parallel.

**Explore Agent** maintains a 300-entry in-memory LRU cache — the same term in the same context never hits the API twice.

**Feynman Agent** generates questions for all depth levels simultaneously using `asyncio.gather()` — parallel calls instead of sequential, using the fast model for generation and the main model only for evaluation.

---

## Project Structure

```
NEW3/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── rue_history.db
│   ├── shared/
│   └── agents/
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx
        ├── pages/
        │   └── FeynmanPage.jsx
        └── components/
            ├── ExplorationNode.jsx
            ├── TermText.jsx
            ├── HistorySidebar.jsx
            ├── PathSidebar.jsx
            ├── QuestionCard.jsx
            └── MCQCard.jsx
```

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- NVIDIA API key from [build.nvidia.com](https://build.nvidia.com)

### Backend

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file:
```
NVIDIA_API_KEY=your_key_here
```

Start the server:
```bash
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ask/stream` | Stream answer + extract concepts (SSE) |
| POST | `/api/explore` | Explain a term in context |
| POST | `/api/simplify` | ELI12 rewrite of any explanation |
| GET | `/api/history` | List saved sessions |
| POST | `/api/history` | Save a session |
| PUT | `/api/history/{id}` | Update a session |
| DELETE | `/api/history/{id}` | Delete a session |
| POST | `/api/feynman/questions` | Generate Feynman Q&A per depth |
| POST | `/api/feynman/evaluate` | Score a user's written answer |
| POST | `/api/feynman/mcqs` | Generate MCQs per depth |
| POST | `/api/feynman/results` | Persist Feynman session results |
| GET | `/health` | Server status + cache size |

---

## How It Compares

| Normal AI Tutor | RUE |
|---|---|
| Gives an answer and stops | Recursively builds understanding |
| No feedback on comprehension | Feynman scoring on every answer |
| Static single response | Adaptive depth-by-depth exploration |
| You decide when you're done | System tracks how deep you actually went |
| No history of what you learned | Full session history with depth metrics |

---

## Use Cases

- **Students** drilling down on textbook concepts
- **Interview prep** understanding algorithms and system design deeply
- **Self-learners** exploring unfamiliar technical topics
- **Educators** building structured concept maps
- **Anyone** who wants to understand something, not just know it
