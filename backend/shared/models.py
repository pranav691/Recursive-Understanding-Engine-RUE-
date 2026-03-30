from pydantic import BaseModel
from typing import Any


class QuestionRequest(BaseModel):
    question: str


class ExploreRequest(BaseModel):
    term: str
    context: str


class SimplifyRequest(BaseModel):
    content: str
    title: str


class FeynmanQARequest(BaseModel):
    stack: list[Any]


class EvaluateAnswerRequest(BaseModel):
    question: str
    ideal_answer: str
    user_answer: str


class FeynmanMCQRequest(BaseModel):
    stack: list[Any]


class SaveFeynmanResultRequest(BaseModel):
    session_id: int = 0
    mode: str
    concept: str
    results: list[Any]


class SaveSessionRequest(BaseModel):
    question: str
    stack: list[Any]
    is_branch: bool = False
    root_question: str = ""
    weighted_clarity: float = 0.0
    depth_clarity: float = 0.0
