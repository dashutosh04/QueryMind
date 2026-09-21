from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"
    database_url: str = "sqlite:///./querymind.db"
    allowed_origins: list[str] = ["http://localhost:5173", "http://localhost:4173"]
    max_retries: int = 3
    groq_temperature: float = 0.0

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
