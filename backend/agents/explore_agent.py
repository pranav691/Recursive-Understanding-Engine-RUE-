import hashlib
from typing import Optional
from fastapi import APIRouter, HTTPException

from shared.client import client, MAIN_MODEL, FAST_MODEL
from shared.models import ExploreRequest
from shared.prompts import EXPLORE_PROMPT, EXPLORE_EXTRACT_PROMPT
from shared.utils import extract_json, normalize_terms

router = APIRouter()

_explore_cache: dict = {}
MAX_CACHE = 300


def _cache_key(term: str, context: str) -> str:
    return hashlib.md5(f"{term.lower()}:{context[:60].lower()}".encode()).hexdigest()


def _cache_get(term: str, context: str) -> Optional[dict]:
    return _explore_cache.get(_cache_key(term, context))


def _cache_set(term: str, context: str, value: dict):
    if len(_explore_cache) >= MAX_CACHE:
        del _explore_cache[next(iter(_explore_cache))]
    _explore_cache[_cache_key(term, context)] = value


@router.post("/api/explore")
async def explore(req: ExploreRequest):
    cached = _cache_get(req.term, req.context)
    if cached:
        return {**cached, "cached": True}

    try:
        context_summary = req.context[:200]
        exp_resp = await client.chat.completions.create(
            model=MAIN_MODEL,
            messages=[{"role": "user", "content": EXPLORE_PROMPT.format(
                term=req.term, context_summary=context_summary
            )}],
            max_tokens=180,
            temperature=0.6,
        )
        explanation = exp_resp.choices[0].message.content.strip()

        try:
            ext_resp = await client.chat.completions.create(
                model=FAST_MODEL,
                messages=[{"role": "user", "content": EXPLORE_EXTRACT_PROMPT.format(
                    explanation=explanation, exclude=req.term
                )}],
                max_tokens=100,
                temperature=0,
            )
            raw = ext_resp.choices[0].message.content.strip()
            parsed = extract_json(raw)
            terms = normalize_terms(
                parsed if isinstance(parsed, list) else [],
                explanation.lower(),
                exclude_lower=req.term.lower()
            )
        except Exception:
            terms = []

        result = {"explanation": explanation, "terms": terms, "cached": False}
        _cache_set(req.term, req.context, {"explanation": explanation, "terms": terms})
        return result

    except Exception as e:
        try:
            fb = await client.chat.completions.create(
                model=FAST_MODEL,
                messages=[{"role": "user", "content": f'Define "{req.term}" in 2 simple sentences for a beginner. No jargon.'}],
                max_tokens=80,
                temperature=0.5,
            )
            return {"explanation": fb.choices[0].message.content.strip(), "terms": [], "cached": False, "fallback": True}
        except Exception as fe:
            raise HTTPException(status_code=500, detail=str(fe))
