import json
from datetime import datetime
from fastapi import APIRouter, HTTPException

from shared.db import get_db
from shared.models import SaveSessionRequest

router = APIRouter()


@router.post("/api/history")
async def save_session(req: SaveSessionRequest):
    depth = len([n for n in req.stack if n.get("type") == "term"])
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO sessions (question, timestamp, depth, stack, is_branch, root_question, weighted_clarity, depth_clarity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (req.question, datetime.now().isoformat(), depth, json.dumps(req.stack),
         1 if req.is_branch else 0, req.root_question,
         req.weighted_clarity, req.depth_clarity),
    )
    sid = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"id": sid}


@router.get("/api/history")
async def get_history(is_branch: int = 0, root_question: str = ""):
    conn = get_db()
    if root_question:
        rows = conn.execute(
            "SELECT id, question, timestamp, depth, stack FROM sessions WHERE is_branch=? AND root_question=? ORDER BY timestamp DESC LIMIT 50",
            (is_branch, root_question),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT id, question, timestamp, depth, stack FROM sessions WHERE is_branch=? ORDER BY timestamp DESC LIMIT 50",
            (is_branch,),
        ).fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        try:
            stack_data = json.loads(d["stack"])
            d["nodes"] = [{"title": n.get("title", ""), "type": n.get("type", "term")} for n in stack_data]
        except Exception:
            d["nodes"] = []
        del d["stack"]
        result.append(d)
    return result


@router.get("/api/history/{session_id}")
async def get_session(session_id: int):
    conn = get_db()
    row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    result = dict(row)
    result["stack"] = json.loads(result["stack"])
    return result


@router.put("/api/history/{session_id}")
async def update_session(session_id: int, req: SaveSessionRequest):
    depth = len([n for n in req.stack if n.get("type") == "term"])
    conn = get_db()
    row = conn.execute("SELECT id FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Session not found")
    conn.execute(
        "UPDATE sessions SET stack = ?, depth = ?, timestamp = ?, weighted_clarity = ?, depth_clarity = ? WHERE id = ?",
        (json.dumps(req.stack), depth, datetime.now().isoformat(),
         req.weighted_clarity, req.depth_clarity, session_id),
    )
    conn.commit()
    conn.close()
    return {"id": session_id}


@router.delete("/api/history")
async def delete_branches_by_question(root_question: str):
    conn = get_db()
    conn.execute("DELETE FROM sessions WHERE root_question = ? AND is_branch = 1", (root_question,))
    conn.commit()
    conn.close()
    return {"ok": True}


@router.delete("/api/history/{session_id}")
async def delete_session(session_id: int):
    conn = get_db()
    conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()
    return {"ok": True}
