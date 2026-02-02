"""Chat API istek/yanıt şemaları."""
from pydantic import BaseModel


class ChatRequest(BaseModel):
    collection_name: str
    question: str