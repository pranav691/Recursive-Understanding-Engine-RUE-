import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.db import init_db
from shared.client import MAIN_MODEL, FAST_MODEL
from agents.explore_agent import _explore_cache
from agents.answer_agent import router as answer_router
from agents.explore_agent import router as explore_router
from agents.simplify_agent import router as simplify_router
from agents.history_agent import router as history_router
from agents.feynman_agent import router as feynman_router

app = FastAPI(title="RUE - Recursive Understanding Engine")

_origins_env = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = [o.strip() for o in _origins_env.split(",") if o.strip()] if _origins_env else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

app.include_router(answer_router)
app.include_router(explore_router)
app.include_router(simplify_router)
app.include_router(history_router)
app.include_router(feynman_router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "main_model": MAIN_MODEL,
        "fast_model": FAST_MODEL,
        "cache_size": len(_explore_cache),
    }
