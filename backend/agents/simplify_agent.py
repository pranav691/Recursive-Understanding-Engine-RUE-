from fastapi import APIRouter, HTTPException

from shared.client import client, FAST_MODEL
from shared.models import SimplifyRequest
from shared.prompts import SIMPLIFY_PROMPT

router = APIRouter()


@router.post("/api/simplify")
async def simplify(req: SimplifyRequest):
    try:
        resp = await client.chat.completions.create(
            model=FAST_MODEL,
            messages=[{"role": "user", "content": SIMPLIFY_PROMPT.format(title=req.title) + f"\n\n{req.content}"}],
            max_tokens=120,
            temperature=0.6,
        )
        return {"simplified": resp.choices[0].message.content.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
