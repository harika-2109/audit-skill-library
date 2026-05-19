"""Application configuration."""
from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Storage
    skills_dir: Path = Path(__file__).resolve(
    ).parents[2] / "skills" / "internal-audit"

    # Anthropic / Bedrock — runtime LLM
    anthropic_api_key: str = ""  # set via env or AWS Secrets Manager
    anthropic_model: str = "claude-sonnet-4-5"
    use_bedrock: bool = False
    aws_region: str = "us-east-1"

    # CORS / network
    allowed_origins: list[str] = [
        "http://localhost:3000",
        "https://audit-skill-library.vercel.app",
        "https://audit-skill-library-git-main-harika-s-projects2.vercel.app",
        "https://audit-skill-library-bsukhfpjp-harika-s-projects2.vercel.app",
    ]

    # Auth (placeholder — replace with SSO/Cognito in prod)
    require_auth: bool = False


settings = Settings()
