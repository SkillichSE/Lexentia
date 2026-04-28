from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "Klyxe API"
    environment: str = "development"
    frontend_origin: str = "http://localhost:5173"

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/klyxe"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 15
    refresh_token_days: int = 30

    s3_endpoint: str | None = None
    s3_bucket: str = "klyxe"
    s3_access_key: str | None = None
    s3_secret_key: str | None = None
    s3_region: str = "auto"
    llm_api_base: str = "https://openrouter.ai/api/v1"
    llm_api_key: str | None = None
    llm_default_model: str = "openai/gpt-4o-mini"
    llm_http_referer: str | None = None
    llm_title: str = "Klyxe RAG"


settings = Settings()
