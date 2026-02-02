"""
FastAPI ana uygulama giriş noktası.
CORS, rate limiting ve API route'ları burada yapılandırılır.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.api.api import api_router
from app.limiter import limiter

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

# CORS ayarları: İzin verilen origin'ler env'den okunur (virgülle ayrılmış)
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
if not origins:
    origins = ["http://localhost:5173"]

app.state.limiter = limiter
app.add_exception_handler(
    RateLimitExceeded,
    lambda request, exc: JSONResponse(status_code=429, content={"detail": "Günlük hakkınız doldu. Lütfen daha sonra tekrar deneyin."})
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {"message": f"{settings.PROJECT_NAME} API is running successfully."}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model": settings.LLM_MODEL}