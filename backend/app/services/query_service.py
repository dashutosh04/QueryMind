"""Query service - orchestrates the LangGraph AI workflow and standalone explanation.

This module serves as the bridge between FastAPI route handlers and the LangGraph graph.
It initialises workflow state, invokes the compiled graph, and maps final state to
typed Pydantic response schemas.
"""
import time
import logging

from app.ai.graph import get_graph, AIWorkflowState
from app.ai.llm import get_llm
from app.ai.prompts import sql_explanation_prompt
from app.schemas import (
    GenerateResponse,
    ValidationResult,
    ExplainResponse,
)
from app.config import get_settings

import json
import re

logger = logging.getLogger("querymind.service")


async def run_generate_workflow(question: str) -> GenerateResponse:
    """
    Run the full LangGraph SQL generation workflow.
    Returns a GenerateResponse with SQL, validation state, ambiguity info,
    explanation metadata, and workflow duration.
    """
    settings = get_settings()
    graph = get_graph()
    start_time = time.time()

    initial_state: AIWorkflowState = {
        "question": question,
        "schema_text": "",
        "sql": "",
        "syntax_valid": False,
        "syntax_error": None,
        "safety_safe": False,
        "safety_error": None,
        "revised": False,
        "revision_attempts": 0,
        "is_ambiguous": False,
        "clarification": None,
        "reasoning": None,
        "tables_referenced": [],
        "explanation": None,
        "tables_used": [],
        "operations": [],
        "filters": [],
        "sorting_grouping": [],
        "error_category": None,
        "start_time": start_time,
        "stage": "init",
    }

    logger.info(
        "[service:generate] Starting workflow for question: %.120s", question
    )

    final_state = graph.invoke(initial_state)

    duration_ms = (time.time() - start_time) * 1000
    logger.info(
        "[service:generate] Workflow complete in %.0fms | stage=%s | valid=%s | ambiguous=%s | retries=%d | error_category=%s",
        duration_ms,
        final_state.get("stage"),
        final_state.get("syntax_valid"),
        final_state.get("is_ambiguous"),
        final_state.get("revision_attempts", 0),
        final_state.get("error_category"),
    )

    # Determine overall validity
    is_ambiguous = final_state.get("is_ambiguous", False)
    sql = final_state.get("sql", "")

    if is_ambiguous:
        valid = False
        validation_error = final_state.get("clarification") or "Query requires clarification."
    elif final_state.get("error_category") == "safety":
        valid = False
        validation_error = final_state.get("safety_error")
    elif final_state.get("error_category") == "llm_failure":
        valid = False
        validation_error = "The AI service encountered an error. Please try again."
    elif final_state.get("error_category") == "ambiguous":
        valid = False
        validation_error = final_state.get("safety_error") or final_state.get("clarification")
    else:
        valid = final_state.get("syntax_valid", False)
        validation_error = final_state.get("syntax_error")

    return GenerateResponse(
        sql=sql,
        validation=ValidationResult(valid=valid, error=validation_error),
        revised=final_state.get("revised", False),
        revision_attempts=final_state.get("revision_attempts", 0),
        is_ambiguous=is_ambiguous,
        clarification=final_state.get("clarification"),
        reasoning=final_state.get("reasoning"),
        tables_referenced=final_state.get("tables_referenced", []),
        duration_ms=round(duration_ms, 1),
    )


async def run_explain(sql: str, question: str = "") -> ExplainResponse:
    """
    Run a standalone explanation for an existing SQL query.
    Used when the user manually writes SQL in the Direct SQL editor.
    """
    logger.info("[service:explain] Generating explanation for manual SQL query")
    llm = get_llm()

    prompt_value = sql_explanation_prompt.format_messages(
        sql=sql,
        question=question or "N/A",
    )

    try:
        response = llm.invoke(prompt_value)
        raw = response.content.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.IGNORECASE)
        raw = re.sub(r"\s*```$", "", raw)

        data = json.loads(raw)
        return ExplainResponse(
            explanation=str(data.get("explanation") or ""),
            tables_used=list(data.get("tables_used") or []),
            operations=list(data.get("operations") or []),
            filters=list(data.get("filters") or []),
            sorting_grouping=list(data.get("sorting_grouping") or []),
        )
    except (json.JSONDecodeError, Exception) as exc:
        logger.warning("[service:explain] Failed to parse explanation JSON: %s", exc)
        return ExplainResponse(
            explanation=response.content if hasattr(response, "content") else str(exc),
            tables_used=[],
            operations=[],
            filters=[],
            sorting_grouping=[],
        )
