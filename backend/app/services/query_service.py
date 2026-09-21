"""Query service - orchestrates LangGraph workflow and explanation."""
from app.ai.graph import get_graph, GraphState
from app.ai.llm import get_llm
from app.ai.prompts import SQL_EXPLANATION_SYSTEM, SQL_EXPLANATION_HUMAN
from app.schemas import GenerateResponse, ValidationResult, ExplainResponse
from langchain_core.messages import HumanMessage, SystemMessage
import json
import re


async def run_generate_workflow(question: str) -> GenerateResponse:
    """Run the full LangGraph SQL generation workflow."""
    graph = get_graph()

    initial_state: GraphState = {
        "question": question,
        "schema_text": "",
        "sql": "",
        "validation_error": None,
        "valid": False,
        "revised": False,
        "revision_attempts": 0,
        "explanation": None,
        "tables_used": [],
        "operations": [],
        "filters": [],
        "sorting_grouping": [],
    }

    final_state = graph.invoke(initial_state)

    return GenerateResponse(
        sql=final_state["sql"],
        validation=ValidationResult(
            valid=final_state["valid"],
            error=final_state.get("validation_error"),
        ),
        revised=final_state.get("revised", False),
        revision_attempts=final_state.get("revision_attempts", 0),
    )


async def run_explain(sql: str, question: str = "") -> ExplainResponse:
    """Run explanation for an existing SQL query."""
    llm = get_llm()
    messages = [
        SystemMessage(content=SQL_EXPLANATION_SYSTEM),
        HumanMessage(
            content=SQL_EXPLANATION_HUMAN.format(
                sql=sql,
                question=question or "N/A",
            )
        ),
    ]
    response = llm.invoke(messages)
    raw = response.content.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        data = json.loads(raw)
        return ExplainResponse(
            explanation=data.get("explanation", ""),
            tables_used=data.get("tables_used", []),
            operations=data.get("operations", []),
            filters=data.get("filters", []),
            sorting_grouping=data.get("sorting_grouping", []),
        )
    except json.JSONDecodeError:
        return ExplainResponse(
            explanation=raw,
            tables_used=[],
            operations=[],
            filters=[],
            sorting_grouping=[],
        )
