# app/services/llm_service.py
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from app.core.config import settings

# Instantiated once at import time — reused across requests, not recreated per call
_llm = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite",
    google_api_key=settings.GEMINI_API_KEY,
    response_mime_type="application/json",  # forces valid JSON output
)


def _content_to_text(content) -> str:
    """
    Gemini responses via LangChain can come back as a plain string OR as a list
    of content blocks (e.g. [{"type": "text", "text": "..."}]). Normalize to str.
    """
    if isinstance(content, str):
        return content
    parts = []
    for block in content:
        if isinstance(block, str):
            parts.append(block)
        elif isinstance(block, dict) and block.get("type") == "text":
            parts.append(block.get("text", ""))
    return "".join(parts)


async def generate_workflow_from_prompt(
    user_content: str, SYSTEM_INSTRUCTION: str
) -> dict:
    """
    Calls Gemini (via langchain-google-genai) and returns the generated workflow as a parsed dict.
    """
    messages = [
        SystemMessage(content=SYSTEM_INSTRUCTION),
        HumanMessage(content=user_content),
    ]

    response = await _llm.ainvoke(messages)
    text = _content_to_text(response.content)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"error": "Failed to parse JSON from LLM", "raw_output": text}
