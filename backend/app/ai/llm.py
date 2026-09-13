"""LLM setup using LangChain + Groq."""
from functools import lru_cache
from langchain_groq import ChatGroq
from app.config import get_settings


@lru_cache
def get_llm() -> ChatGroq:
    settings = get_settings()
    return ChatGroq(
        api_key=settings.groq_api_key,
        model=settings.groq_model,
        temperature=0,
        max_tokens=2048,
    )
