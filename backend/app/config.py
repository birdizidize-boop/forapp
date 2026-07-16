import os

from dotenv import load_dotenv

load_dotenv()


def normalize_database_url(value: str) -> str:
    if value.startswith("postgres://"):
        return value.replace("postgres://", "postgresql+psycopg://", 1)
    if value.startswith("postgresql://"):
        return value.replace("postgresql://", "postgresql+psycopg://", 1)
    return value


class Config:
    SQLALCHEMY_DATABASE_URI = normalize_database_url(os.getenv("DATABASE_URL", "sqlite:///fora_cmp.db"))
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-only-change-me")
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    AUTO_CREATE_DB = os.getenv("AUTO_CREATE_DB", "true").lower() == "true"
    DEFAULT_TENANT_ID = os.getenv("DEFAULT_TENANT_ID", "fora")
