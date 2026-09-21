"""
LangGraph AI workflow for QueryMind.

Pipeline:
  START
    -> retrieve_schema      (load schema context with FK relationships)
    -> generate_sql         (ChatGroq structured JSON output)
    -> validate_safety      (forbidden keywords + table whitelist)
       -> [unsafe/ambiguous] -> END (flagged)
       -> [safe] -> validate_syntax  (SQLite EXPLAIN QUERY PLAN)
          -> [invalid] -> correct_sql -> validate_safety (bounded retries)
          -> [valid]   -> explain_query -> END
    -> END

State is explicit and typed. Each node has a single responsibility.
Retries are strictly bounded by max_retries from config.
All errors are classified and observable via structured state fields.
"""
import json
import logging
import re
import time
from typing import TypedDict, Optional

from langgraph.graph import StateGraph, END, START
from langchain_core.messages import HumanMessage, SystemMessage

from app.ai.llm import get_llm
from app.ai.prompts import (
    sql_generation_prompt,
    sql_correction_prompt,
    sql_explanation_prompt,
)
from app.config import get_settings
from app.services.schema_service import get_schema_as_text
from app.services.sql_validator import validate_sql_safety, validate_sql_syntax

logger = logging.getLogger("querymind.ai")

# ---------------------------------------------------------------------------
# Typed graph state
# ---------------------------------------------------------------------------

class AIWorkflowState(TypedDict):
    # Input
    question: str

    # Schema context
    schema_text: str

    # Generated / corrected SQL
    sql: str

    # Validation results
    syntax_valid: bool
    syntax_error: Optional[str]
    safety_safe: bool
    safety_error: Optional[str]

    # Correction / retry tracking
    revised: bool
    revision_attempts: int

    # Ambiguity tracking
    is_ambiguous: bool
    clarification: Optional[str]

    # LLM reasoning (internal, not exposed to end users directly)
    reasoning: Optional[str]
    tables_referenced: list

    # Explanation fields (populated after successful validation)
    explanation: Optional[str]
    tables_used: list
    operations: list
    filters: list
    sorting_grouping: list

    # Termination / error category
    error_category: Optional[str]  # "safety", "ambiguous", "max_retries", "llm_failure", None

    # Observability
    start_time: float
    stage: str


# ---------------------------------------------------------------------------
# Internal: parse structured JSON from LLM for SQL generation/correction
# ---------------------------------------------------------------------------

def _parse_sql_json(raw: str) -> dict:
    """
    Parse JSON from LLM response. Strips any accidental markdown fences.
    Returns a dict with keys: sql, is_ambiguous, clarification, reasoning, tables_referenced.
    Falls back gracefully on parse failure.
    """
    # Strip markdown code fences if present
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    cleaned = cleaned.strip()

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("Failed to parse LLM JSON output; falling back to raw extraction")
        # Last-resort: extract sql-like content from raw string
        sql_match = re.search(r"SELECT\s+.+?(?:;|$)", cleaned, re.IGNORECASE | re.DOTALL)
        return {
            "sql": sql_match.group(0).strip() if sql_match else "",
            "is_ambiguous": False,
            "clarification": None,
            "reasoning": "Fallback: JSON parse failed.",
            "tables_referenced": [],
        }

    # Normalize: sql may come back as None from model when ambiguous
    sql = data.get("sql") or ""
    if not isinstance(sql, str):
        sql = ""

    return {
        "sql": sql.strip(),
        "is_ambiguous": bool(data.get("is_ambiguous", False)),
        "clarification": data.get("clarification"),
        "reasoning": data.get("reasoning"),
        "tables_referenced": data.get("tables_referenced", []) or [],
    }


def _parse_explanation_json(raw: str) -> dict:
    """Parse structured explanation JSON from LLM."""
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    cleaned = cleaned.strip()
    try:
        data = json.loads(cleaned)
        return {
            "explanation": str(data.get("explanation") or ""),
            "tables_used": list(data.get("tables_used") or []),
            "operations": list(data.get("operations") or []),
            "filters": list(data.get("filters") or []),
            "sorting_grouping": list(data.get("sorting_grouping") or []),
        }
    except json.JSONDecodeError:
        logger.warning("Failed to parse explanation JSON; using raw text as explanation")
        return {
            "explanation": cleaned,
            "tables_used": [],
            "operations": [],
            "filters": [],
            "sorting_grouping": [],
        }


# ---------------------------------------------------------------------------
# Graph nodes
# ---------------------------------------------------------------------------

def retrieve_schema_node(state: AIWorkflowState) -> dict:
    """Load live schema context (tables, columns, types, FK relationships)."""
    logger.info("[graph:retrieve_schema] Loading database schema")
    schema_text = get_schema_as_text()
    return {"schema_text": schema_text, "stage": "retrieve_schema"}


def generate_sql_node(state: AIWorkflowState) -> dict:
    """
    Use ChatGroq with json_mode structured output to generate SQL.
    Outputs: sql, is_ambiguous, clarification, reasoning, tables_referenced.
    """
    settings = get_settings()
    logger.info(
        "[graph:generate_sql] Generating SQL for question: %.100s", state["question"]
    )

    llm = get_llm()
    prompt_value = sql_generation_prompt.format_messages(
        schema=state["schema_text"],
        question=state["question"],
    )

    try:
        response = llm.invoke(prompt_value)
        parsed = _parse_sql_json(response.content)
    except Exception as exc:
        logger.error("[graph:generate_sql] LLM call failed: %s", exc)
        return {
            "sql": "",
            "is_ambiguous": False,
            "clarification": None,
            "reasoning": None,
            "tables_referenced": [],
            "error_category": "llm_failure",
            "stage": "generate_sql",
        }

    logger.info(
        "[graph:generate_sql] Generated SQL (ambiguous=%s): %.200s",
        parsed["is_ambiguous"],
        parsed["sql"],
    )
    return {
        "sql": parsed["sql"],
        "is_ambiguous": parsed["is_ambiguous"],
        "clarification": parsed["clarification"],
        "reasoning": parsed["reasoning"],
        "tables_referenced": parsed["tables_referenced"],
        "stage": "generate_sql",
    }


def validate_safety_node(state: AIWorkflowState) -> dict:
    """
    Run safety checks: SELECT-only, forbidden keywords, table whitelist.
    If the query is ambiguous (empty sql), skip safety check and route to END.
    """
    logger.info("[graph:validate_safety] Running safety check")

    sql = state.get("sql", "").strip()

    # Ambiguous: model returned no SQL intentionally
    if state.get("is_ambiguous") or not sql:
        return {
            "safety_safe": False,
            "safety_error": state.get("clarification") or "Query is ambiguous.",
            "error_category": "ambiguous",
            "stage": "validate_safety",
        }

    result = validate_sql_safety(sql)
    safe = result["safe"]
    error = result.get("error")

    if not safe:
        logger.warning("[graph:validate_safety] Safety check failed: %s", error)

    return {
        "safety_safe": safe,
        "safety_error": error if not safe else None,
        "error_category": None if safe else "safety",
        "stage": "validate_safety",
    }


def validate_syntax_node(state: AIWorkflowState) -> dict:
    """
    Run SQLite EXPLAIN QUERY PLAN to verify syntax and schema references.
    """
    logger.info("[graph:validate_syntax] Running syntax validation")
    result = validate_sql_syntax(state["sql"])
    valid = result["valid"]
    error = result.get("error")

    if not valid:
        logger.warning("[graph:validate_syntax] Syntax error: %s", error)

    return {
        "syntax_valid": valid,
        "syntax_error": error if not valid else None,
        "stage": "validate_syntax",
    }


def correct_sql_node(state: AIWorkflowState) -> dict:
    """
    Ask ChatGroq to fix the invalid SQL using the error message and schema context.
    Increments revision_attempts. Does NOT blindly retry the same prompt.
    """
    attempts = state.get("revision_attempts", 0) + 1
    logger.info(
        "[graph:correct_sql] Correction attempt %d for error: %s",
        attempts,
        state.get("syntax_error") or state.get("safety_error"),
    )

    llm = get_llm()
    error_msg = state.get("syntax_error") or state.get("safety_error") or "Unknown validation error"

    prompt_value = sql_correction_prompt.format_messages(
        schema=state["schema_text"],
        question=state["question"],
        sql=state["sql"],
        error=error_msg,
    )

    try:
        response = llm.invoke(prompt_value)
        parsed = _parse_sql_json(response.content)
    except Exception as exc:
        logger.error("[graph:correct_sql] LLM correction call failed: %s", exc)
        return {
            "revision_attempts": attempts,
            "revised": True,
            "error_category": "llm_failure",
            "stage": "correct_sql",
        }

    logger.info(
        "[graph:correct_sql] Corrected SQL (ambiguous=%s): %.200s",
        parsed["is_ambiguous"],
        parsed["sql"],
    )

    return {
        "sql": parsed["sql"],
        "is_ambiguous": parsed["is_ambiguous"],
        "clarification": parsed["clarification"],
        "reasoning": parsed["reasoning"],
        "tables_referenced": parsed["tables_referenced"],
        "revised": True,
        "revision_attempts": attempts,
        # Reset validation state for next cycle
        "safety_safe": False,
        "safety_error": None,
        "syntax_valid": False,
        "syntax_error": None,
        "stage": "correct_sql",
    }


def explain_query_node(state: AIWorkflowState) -> dict:
    """
    Generate a structured plain-English explanation of the validated SQL query.
    Uses ChatGroq with json_mode to return parseable explanation metadata.
    """
    logger.info("[graph:explain_query] Generating explanation for validated SQL")

    llm = get_llm()
    prompt_value = sql_explanation_prompt.format_messages(
        sql=state["sql"],
        question=state["question"],
    )

    try:
        response = llm.invoke(prompt_value)
        parsed = _parse_explanation_json(response.content)
    except Exception as exc:
        logger.error("[graph:explain_query] Explanation LLM call failed: %s", exc)
        parsed = {
            "explanation": "Explanation could not be generated.",
            "tables_used": state.get("tables_referenced", []),
            "operations": [],
            "filters": [],
            "sorting_grouping": [],
        }

    duration_ms = (time.time() - state.get("start_time", time.time())) * 1000
    logger.info("[graph:explain_query] Workflow complete in %.0fms", duration_ms)

    return {
        "explanation": parsed["explanation"],
        "tables_used": parsed["tables_used"],
        "operations": parsed["operations"],
        "filters": parsed["filters"],
        "sorting_grouping": parsed["sorting_grouping"],
        "error_category": None,
        "stage": "explain_query",
    }


# ---------------------------------------------------------------------------
# Conditional routing
# ---------------------------------------------------------------------------

def route_after_safety(state: AIWorkflowState) -> str:
    """Route based on safety check result."""
    if state.get("safety_safe"):
        return "validate_syntax"
    # Safety failure or ambiguity: terminate workflow
    return END


def route_after_syntax(state: AIWorkflowState) -> str:
    """Route based on syntax validation result."""
    settings = get_settings()
    if state.get("syntax_valid"):
        return "explain_query"

    attempts = state.get("revision_attempts", 0)
    if attempts >= settings.max_retries:
        logger.warning(
            "[graph:route_after_syntax] Max retries (%d) reached; terminating",
            settings.max_retries,
        )
        return END

    return "correct_sql"


def route_after_correction(state: AIWorkflowState) -> str:
    """After correction, re-run safety check (correction may introduce new issues)."""
    if state.get("error_category") == "llm_failure":
        return END
    return "validate_safety"


# ---------------------------------------------------------------------------
# Build and cache the compiled graph
# ---------------------------------------------------------------------------

def build_graph() -> StateGraph:
    builder = StateGraph(AIWorkflowState)

    # Nodes
    builder.add_node("retrieve_schema", retrieve_schema_node)
    builder.add_node("generate_sql", generate_sql_node)
    builder.add_node("validate_safety", validate_safety_node)
    builder.add_node("validate_syntax", validate_syntax_node)
    builder.add_node("correct_sql", correct_sql_node)
    builder.add_node("explain_query", explain_query_node)

    # Edges
    builder.add_edge(START, "retrieve_schema")
    builder.add_edge("retrieve_schema", "generate_sql")
    builder.add_edge("generate_sql", "validate_safety")

    builder.add_conditional_edges(
        "validate_safety",
        route_after_safety,
        {"validate_syntax": "validate_syntax", END: END},
    )

    builder.add_conditional_edges(
        "validate_syntax",
        route_after_syntax,
        {
            "explain_query": "explain_query",
            "correct_sql": "correct_sql",
            END: END,
        },
    )

    builder.add_conditional_edges(
        "correct_sql",
        route_after_correction,
        {"validate_safety": "validate_safety", END: END},
    )

    builder.add_edge("explain_query", END)

    return builder.compile()


# Singleton compiled graph
_graph: StateGraph | None = None


def get_graph() -> StateGraph:
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph
