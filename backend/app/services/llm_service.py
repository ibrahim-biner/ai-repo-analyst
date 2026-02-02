"""
Google Gemini LLM ve embedding modelleri.
LangChain üzerinden RAG zinciri için kullanılır.
"""
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

from app.core.config import settings

embeddings = GoogleGenerativeAIEmbeddings(
    model=settings.EMBEDDING_MODEL,
    google_api_key=settings.GOOGLE_API_KEY,
)

llm = ChatGoogleGenerativeAI(
    model=settings.LLM_MODEL,
    temperature=0.7,
    google_api_key=settings.GOOGLE_API_KEY,
    convert_system_message_to_human=True,
)

