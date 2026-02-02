"""
Ortam değişkenleri ve uygulama yapılandırması.
.env dosyasından veya sistem env'den okunur.
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Repo Analyst"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    TEMP_REPO_DIR: str = ""
    CHROMA_DB_DIR: str = ""
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_JWT_SECRET: str
    SUPABASE_SERVICE_ROLE_KEY: str

    LLM_MODEL: str = "gemini-flash-latest"
    EMBEDDING_MODEL: str = "models/gemini-embedding-001"
    GOOGLE_API_KEY: str

    ALLOWED_ORIGINS: str = "http://localhost:5173"
    DEBUG: bool = False  # False iken hassas hata detayları kullanıcıya gösterilmez

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

# Depolama dizinleri: env'de tanımlı değilse varsayılan path kullanılır
_base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if not settings.TEMP_REPO_DIR:
    settings.TEMP_REPO_DIR = os.path.normpath(os.path.join(_base, "../data/temp_repos"))
else:
    settings.TEMP_REPO_DIR = os.path.abspath(settings.TEMP_REPO_DIR)
if not settings.CHROMA_DB_DIR:
    settings.CHROMA_DB_DIR = os.path.normpath(os.path.join(_base, "../data/chroma_db"))
else:
    settings.CHROMA_DB_DIR = os.path.abspath(settings.CHROMA_DB_DIR)

# Gerekli dizinler yoksa oluşturulur
os.makedirs(settings.TEMP_REPO_DIR, exist_ok=True)
os.makedirs(settings.CHROMA_DB_DIR, exist_ok=True)