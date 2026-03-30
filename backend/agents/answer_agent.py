import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from shared.client import client, MAIN_MODEL, FAST_MODEL
from shared.models import QuestionRequest
from shared.prompts import ANSWER_PROMPT, CONCEPT_EXTRACT_PROMPT
from shared.utils import extract_json, normalize_terms

router = APIRouter()


@router.post("/api/ask/stream")
async def ask_stream(req: QuestionRequest):
    async def generate():
        full_answer = ""
        try:
            stream = await client.chat.completions.create(
                model=MAIN_MODEL,
                messages=[
                    {"role": "system", "content": ANSWER_PROMPT},
                    {"role": "user", "content": req.question},
                ],
                max_tokens=300,
                temperature=0.7,
                stream=True,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    full_answer += delta
                    yield f"data: {json.dumps({'type': 'token', 'content': delta})}\n\n"

            try:
                extract_resp = await client.chat.completions.create(
                    model=FAST_MODEL,
                    messages=[{"role": "user", "content": CONCEPT_EXTRACT_PROMPT.format(
                        text=full_answer, question=req.question
                    )}],
                    max_tokens=120,
                    temperature=0,
                )
                raw = extract_resp.choices[0].message.content.strip()
                parsed = extract_json(raw)
                if isinstance(parsed, list):
                    answer_lower = full_answer.lower()
                    question_lower = req.question.lower()
                    terms = normalize_terms(parsed, answer_lower)
                    terms = [t for t in terms if t["term"].lower() not in question_lower]
                else:
                    terms = []
            except Exception:
                terms = []

            yield f"data: {json.dumps({'type': 'concepts', 'terms': terms})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
