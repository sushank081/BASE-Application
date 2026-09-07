import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Cell-MES"
    API_V1_STR: str = "/api/v1"
    
    # Database Configuration
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "root"
    DB_HOST: str = "172.41.1.51"
    DB_PORT: str = "5432"
    DB_NAME: str = "CELLMES"

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

settings = Settings()