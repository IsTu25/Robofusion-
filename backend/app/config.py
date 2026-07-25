import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://robofusion:robofusion_pass@localhost:5433/robofusion")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "supersecretkey_for_robofusion")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

settings = Settings()
