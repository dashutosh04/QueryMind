"""QueryMind - FastAPI application entry point."""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.requests import Request
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import init_db
from app.api import health, schema, query, execute

settings = get_settings()
logger = logging.getLogger("querymind")

app = FastAPI(
    title="QueryMind API",
    description="AI-Powered Natural Language SQL Query Generator",
    version="1.0.0",
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "Unhandled %s error for %s %s",
        type(exc).__name__,
        request.method,
        request.url.path,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error."},
    )

@app.on_event("startup")
async def startup_event():
    init_db()


# Routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(schema.router, prefix="/api", tags=["Schema"])
app.include_router(query.router, prefix="/api", tags=["Query"])
app.include_router(execute.router, prefix="/api", tags=["Execute"])


@app.get("/")
async def root():
    return {"message": "QueryMind API is running. Visit /docs for API documentation."}


# Wrap the complete application so CORS headers are also present on unhandled errors.
app = CORSMiddleware(
    app,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
