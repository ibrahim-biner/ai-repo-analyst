"""
API route gruplarının birleştirildiği ana router.
"""
from fastapi import APIRouter

from app.api.endpoints import repo, chat

api_router = APIRouter()

api_router.include_router(repo.router, prefix="/repo", tags=["repository"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
