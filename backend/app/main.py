"""
FastAPI ana uygulama giriş noktası.
CORS, rate limiting ve API route'ları burada yapılandırılır.
"""
import asyncio
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
import os


from app.core.config import settings
from app.api.api import api_router
from app.limiter import limiter

# Logging yapılandırması
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

IS_DEBUG = os.getenv("DEBUG", "false").lower() == "true"
app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION,
    docs_url="/docs" if IS_DEBUG else None,
    redoc_url="/redoc" if IS_DEBUG else None,
    openapi_url="/openapi.json" if IS_DEBUG else None)

# CORS ayarları: İzin verilen origin'ler env'den okunur (virgülle ayrılmış)
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
if not origins:
    origins = ["http://localhost:5173"]

app.state.limiter = limiter

# Rate limit aşıldığında özel hata mesajı
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    logger.warning(f"⚠️ Rate limit aşıldı - IP: {request.client.host}")
    return JSONResponse(
        status_code=429, 
        content={
            "detail": "Günlük hakkınız doldu. Lütfen yarın tekrar deneyin.",
            "retry_after": "24 saat"
        }
    )

# Genel hata yakalayıcı
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"❌ Sunucu Hatası: {str(exc)} - Path: {request.url.path}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin."}
    )

# Request timeout middleware (120 saniye)
@app.middleware("http")
async def timeout_middleware(request: Request, call_next):
    try:
        return await asyncio.wait_for(call_next(request), timeout=120.0)
    except asyncio.TimeoutError:
        logger.error(f"⏱️ Timeout - Path: {request.url.path}")
        return JSONResponse(
            status_code=504,
            content={"detail": "İşlem zaman aşımına uğradı. Lütfen daha küçük bir repo deneyin."}
        )

# Request loglama middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"➡️ {request.method} {request.url.path} - IP: {request.client.host}")
    response = await call_next(request)
    logger.info(f"⬅️ {request.method} {request.url.path} - Status: {response.status_code}")
    return response

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