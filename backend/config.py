from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Google OAuth2
    google_client_id: str
    google_client_secret: str
    google_redirect_uri: str = "http://localhost:8000/auth/callback"

    # Gemini AI
    gemini_api_key: str

    # JWT
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080  # 7 days

    # App
    frontend_url: str = "http://localhost:5173"
    database_url: str = "sqlite+aiosqlite:///./planner.db"

    # Cookie settings — override in production
    cookie_domain: str = ""          # e.g. ".tanish.cloud" in production
    cookie_secure: bool = False      # True in production (HTTPS)
    cookie_samesite: str = "lax"    # "none" when cross-subdomain in production

    # Google OAuth2 scopes
    google_scopes: list[str] = [
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/calendar",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

