import json
import asyncio
from datetime import datetime
from fastapi import APIRouter, HTTPException

from shared.client import client, MAIN_MODEL, FAST_MODEL
from shared.db import get_db
from shared.models import (
    FeynmanQARequest,
    EvaluateAnswerRequest,
    FeynmanMCQRequest,
    SaveFeynmanResultRequest,
)
from shared.prompts import FEYNMAN_QA_PROMPT, FEYNMAN_EVALUATE_PROMPT, FEYNMAN_MCQ_PROMPT
from shared.utils import extract_json

router = APIRouter()


async def _generate_qa_for_node(i, node):
    """Generate 2 Feynman Q&A questions for a single stack node."""
    content = node.get("content", "").strip()[:500]
    if not content:
        return None
    try:
        resp = await client.chat.completions.create(
            model=FAST_MODEL,
            messages=[{"role": "user", "content": FEYNMAN_QA_PROMPT.format(
                topic=node.get("title", ""),
                content=content,
            )}],
            max_tokens=600,
            temperature=0.7,
        )
        raw = resp.choices[0].message.content.strip()
        questions = extract_json(raw)
        if isinstance(questions, list) and questions:
            return {
                "depth": i,
                "topic": node.get("title", ""),
                "type": node.get("type", "term"),
                "questions": questions[:2],
            }
    except Exception as e:
        print("Feynman QA error:", str(e))
    return None


async def _generate_mcq_for_node(i, node):
    """Generate 5 MCQs for a single stack node."""
    content = node.get("content", "").strip()[:500]
    if not content:
        return None
    try:
        resp = await client.chat.completions.create(
            model=FAST_MODEL,
            messages=[{"role": "user", "content": FEYNMAN_MCQ_PROMPT.format(
                topic=node.get("title", ""),
                content=content,
            )}],
            max_tokens=800,
            temperature=0.7,
        )
        raw = resp.choices[0].message.content.strip()
        mcqs = extract_json(raw)
        if isinstance(mcqs, list) and mcqs:
            return {
                "depth": i,
                "topic": node.get("title", ""),
                "type": node.get("type", "term"),
                "mcqs": mcqs[:5],
            }
    except Exception as e:
        print("Feynman QA error:", str(e))
    return None


@router.post("/api/feynman/questions")
async def generate_feynman_questions(req: FeynmanQARequest):
    tasks = [_generate_qa_for_node(i, node) for i, node in enumerate(req.stack)]
    results = await asyncio.gather(*tasks)
    depths = [r for r in results if r is not None]
    depths.sort(key=lambda d: d["depth"])
    return {"depths": depths}


@router.post("/api/feynman/evaluate")
async def evaluate_feynman_answer(req: EvaluateAnswerRequest):
    if not req.user_answer.strip():
        raise HTTPException(status_code=400, detail="user_answer is empty")
    try:
        resp = await client.chat.completions.create(
            model=MAIN_MODEL,
            messages=[{"role": "user", "content": FEYNMAN_EVALUATE_PROMPT.format(
                question=req.question,
                ideal_answer=req.ideal_answer,
                user_answer=req.user_answer,
            )}],
            max_tokens=280,
            temperature=0.3,
        )
        raw = resp.choices[0].message.content.strip()
        result = extract_json(raw)
        if isinstance(result, dict) and "score" in result and "feedback" in result:
            result["score"] = max(0, min(100, int(result["score"])))
            return result
        raise ValueError("Malformed evaluation response")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/feynman/mcqs")
async def generate_feynman_mcqs(req: FeynmanMCQRequest):
    tasks = [_generate_mcq_for_node(i, node) for i, node in enumerate(req.stack)]
    results = await asyncio.gather(*tasks)
    depths = [r for r in results if r is not None]
    depths.sort(key=lambda d: d["depth"])
    return {"depths": depths}


@router.post("/api/feynman/results")
async def save_feynman_results(req: SaveFeynmanResultRequest):
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO feynman_results (session_id, mode, concept, timestamp, results) VALUES (?, ?, ?, ?, ?)",
        (req.session_id, req.mode, req.concept, datetime.now().isoformat(), json.dumps(req.results)),
    )
    rid = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"id": rid}
