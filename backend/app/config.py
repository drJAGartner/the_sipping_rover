from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://sipping_rover:changeme@localhost:5432/sipping_rover"
    secret_key: str = "changeme-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    google_places_api_key: str = ""
    environment: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
