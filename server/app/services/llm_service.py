# app/services/llm_service.py
import json
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from app.core.config import settings


# Instantiated once at import time — reused across requests, not recreated per call
_llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=settings.GROQ_API_KEY,
    temperature=0.2,
    model_kwargs={"response_format": {"type": "json_object"}},  # forces valid JSON output
)


async def generate_workflow_from_prompt(user_content: str, SYSTEM_INSTRUCTION: str) -> dict:
    """
    Calls Groq (via langchain-groq) and returns the generated workflow as a parsed dict.
    """
    messages = [
        SystemMessage(content=SYSTEM_INSTRUCTION),
        HumanMessage(content=user_content),
    ]

    response = await _llm.ainvoke(messages)

    try:
        return json.loads(response.content)
    except json.JSONDecodeError:
        return {"error": "Failed to parse JSON from LLM", "raw_output": response.content}
