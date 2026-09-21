"""LLM setup using LangChain + Groq (ChatGroq).

Groq is the only LLM provider used in this application.
The ChatGroq instance is cached as a singleton via lru_cache.
"""
from functools import lru_cache
from langchain_groq import ChatGroq
from app.config import get_settings


@lru_cache
def get_llm() -> ChatGroq:
    settings = get_settings()
    return ChatGroq(
        api_key=settings.groq_api_key,
        model=settings.groq_model,
        temperature=settings.groq_temperature,
        max_tokens=2048,
    )
