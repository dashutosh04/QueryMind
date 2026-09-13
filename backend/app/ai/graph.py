"""
LangGraph workflow for QueryMind.

Graph:
  START → load_schema → generate_sql → validate_sql → (valid?) → explain_sql → END
                                              ↑                 ↓
                                         revise_sql ←── (invalid, retry < max)
"""
from typing import TypedDict, Optional
from langgraph.graph import StateGraph, END, START
from langchain_core.messages import HumanMessage, SystemMessage

from app.ai.llm import get_llm
from app.ai.prompts import (
    SQL_GENERATION_SYSTEM,
    SQL_GENERATION_HUMAN,
    SQL_REVISION_SYSTEM,
    SQL_REVISION_HUMAN,
    SQL_EXPLANATION_SYSTEM,
    SQL_EXPLANATION_HUMAN,
)
from app.services.schema_service import get_schema_as_text, get_schema
from app.services.sql_validator import validate_sql_safety, validate_sql_syntax

import json
import re

MAX_RETRIES = 3


# ── State ───────────────────────────────────────────────────────────────────

class GraphState(TypedDict):
    question: str
    schema_text: str
    sql: str
    validation_error: Optional[str]
    valid: bool
    revised: bool
    revision_attempts: int
    explanation: Optional[str]
    tables_used: list
    operations: list
    filters: list
    sorting_grouping: list


# ── Nodes ────────────────────────────────────────────────────────────────────

def load_schema_node(state: GraphState) -> GraphState:
    state["schema_text"] = get_schema_as_text()
    return state


def generate_sql_node(state: GraphState) -> GraphState:
    llm = get_llm()
    messages = [
        SystemMessage(content=SQL_GENERATION_SYSTEM),
        HumanMessage(
            content=SQL_GENERATION_HUMAN.format(
                schema=state["schema_text"],
                question=state["question"],
            )
        ),
    ]
    response = llm.invoke(messages)
    raw = response.content.strip()
    # Strip markdown code fences if the model wraps output
    raw = re.sub(r"^```(?:sql)?\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"\s*```$", "", raw)
    state["sql"] = raw.strip()
    return state


def validate_sql_node(state: GraphState) -> GraphState:
    sql = state["sql"]
    # Safety check first
    safety = validate_sql_safety(sql)
    if not safety["safe"]:
        state["valid"] = False
        state["validation_error"] = safety["error"]
        return state

    # Syntax check
    syntax = validate_sql_syntax(sql)
    state["valid"] = syntax["valid"]
    state["validation_error"] = syntax.get("error")
    return state


def revise_sql_node(state: GraphState) -> GraphState:
    llm = get_llm()
    messages = [
        SystemMessage(content=SQL_REVISION_SYSTEM),
        HumanMessage(
            content=SQL_REVISION_HUMAN.format(
                schema=state["schema_text"],
                question=state["question"],
                sql=state["sql"],
                error=state.get("validation_error", "Unknown error"),
            )
        ),
    ]
    response = llm.invoke(messages)
    raw = response.content.strip()
    raw = re.sub(r"^```(?:sql)?\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"\s*```$", "", raw)
    state["sql"] = raw.strip()
    state["revised"] = True
    state["revision_attempts"] = state.get("revision_attempts", 0) + 1
    return state


def explain_sql_node(state: GraphState) -> GraphState:
    llm = get_llm()
    messages = [
        SystemMessage(content=SQL_EXPLANATION_SYSTEM),
        HumanMessage(
            content=SQL_EXPLANATION_HUMAN.format(
                sql=state["sql"],
                question=state["question"],
            )
        ),
    ]
    response = llm.invoke(messages)
    raw = response.content.strip()
    # Strip markdown fences
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        data = json.loads(raw)
        state["explanation"] = data.get("explanation", "")
        state["tables_used"] = data.get("tables_used", [])
        state["operations"] = data.get("operations", [])
        state["filters"] = data.get("filters", [])
        state["sorting_grouping"] = data.get("sorting_grouping", [])
    except json.JSONDecodeError:
        state["explanation"] = raw
        state["tables_used"] = []
        state["operations"] = []
        state["filters"] = []
        state["sorting_grouping"] = []

    return state


# ── Routing ──────────────────────────────────────────────────────────────────

def route_after_validation(state: GraphState) -> str:
    if state["valid"]:
        return "explain_sql"
    if state.get("revision_attempts", 0) >= MAX_RETRIES:
        # Max retries reached; proceed with what we have (invalid)
        return "explain_sql"
    return "revise_sql"


# ── Build graph ───────────────────────────────────────────────────────────────

def build_graph() -> StateGraph:
    builder = StateGraph(GraphState)

    builder.add_node("load_schema", load_schema_node)
    builder.add_node("generate_sql", generate_sql_node)
    builder.add_node("validate_sql", validate_sql_node)
    builder.add_node("revise_sql", revise_sql_node)
    builder.add_node("explain_sql", explain_sql_node)

    builder.add_edge(START, "load_schema")
    builder.add_edge("load_schema", "generate_sql")
    builder.add_edge("generate_sql", "validate_sql")
    builder.add_conditional_edges(
        "validate_sql",
        route_after_validation,
        {
            "explain_sql": "explain_sql",
            "revise_sql": "revise_sql",
        },
    )
    builder.add_edge("revise_sql", "validate_sql")
    builder.add_edge("explain_sql", END)

    return builder.compile()


# Singleton compiled graph
_graph = None


def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph
