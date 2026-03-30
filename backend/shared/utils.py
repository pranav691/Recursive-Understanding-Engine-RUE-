import json
import re
from typing import Any


def extract_json(text: str) -> Any:
    code_block = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
    if code_block:
        return json.loads(code_block.group(1).strip())
    arr = re.search(r'\[[\s\S]*\]', text)
    if arr:
        return json.loads(arr.group())
    obj = re.search(r'\{[\s\S]*\}', text)
    if obj:
        return json.loads(obj.group())
    raise ValueError("No JSON found")


def normalize_terms(raw: list, text_lower: str, exclude_lower: str = "") -> list:
    result = []
    for t in raw:
        if isinstance(t, str):
            obj = {"term": t, "difficulty": "medium"}
        elif isinstance(t, dict):
            obj = {"term": t.get("term", ""), "difficulty": t.get("difficulty", "medium")}
        else:
            continue
        d = obj["difficulty"]
        if d not in ("easy", "medium", "hard"):
            obj["difficulty"] = "medium"
        term_l = obj["term"].lower()
        if obj["term"] and term_l in text_lower and term_l != exclude_lower:
            result.append(obj)
    return result
