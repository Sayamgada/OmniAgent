# app/services/llm_service.py
import json
from typing import List, Dict, Any
from langchain_groq import ChatGroq
from langchain_core.messages import BaseMessage
from app.core.config import settings

# Instantiated once at import time — reused across requests, not recreated per call
_llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=settings.GROQ_API_KEY,
    temperature=0.2,
    model_kwargs={"response_format": {"type": "json_object"}},  # forces valid JSON output
)


async def generate_json_response(messages: List[BaseMessage]) -> Dict[str, Any]:
    """
    Calls Groq (via langchain-groq) with the provided messages and returns the parsed JSON response.
    """
    response = await _llm.ainvoke(messages)
    try:
        return json.loads(str(response.content))
    except json.JSONDecodeError:
        return {"error": "Failed to parse JSON from LLM", "raw_output": str(response.content)}
