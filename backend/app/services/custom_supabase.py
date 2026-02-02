"""
Supabase pgvector entegrasyonu. LangChain SupabaseVectorStore'u genişletir.
metadata filtrelemesini match_documents RPC'ye parametre olarak geçirir.
"""
from typing import Any, Callable, Dict, List, Tuple

from langchain_community.vectorstores import SupabaseVectorStore
from langchain_core.documents import Document
from supabase import create_client

from app.core.config import settings


class CustomSupabaseVectorStore(SupabaseVectorStore):
    """Supabase vektör deposu; metadata filtreleme destekler."""

    def __init__(self, embeddings, **kwargs):
        supabase_client = create_client(
            settings.SUPABASE_URL, 
            settings.SUPABASE_SERVICE_ROLE_KEY 
        )
        
        super().__init__(
            client=supabase_client,
            embedding=embeddings,
            table_name="documents",
            query_name="match_documents"
        )

    def _select_relevance_score_fn(self) -> Callable[[float], float]:
        return lambda x: x

    def similarity_search_with_score(
        self,
        query: str,
        k: int = 4,
        filter: Dict[str, Any] | None = None,
        **kwargs: Any,
    ) -> List[Tuple[Document, float]]:
        embedding = self.embeddings.embed_query(query)
        return self.similarity_search_by_vector_with_relevance_scores(
            embedding, k, filter, **kwargs
        )

    def similarity_search_by_vector_with_relevance_scores(
        self,
        embedding: List[float],
        k: int = 4,
        filter: Dict[str, Any] | None = None,
        **kwargs: Any,
    ) -> List[Tuple[Document, float]]:
        match_documents_params = dict(
            query_embedding=embedding,
            match_threshold=kwargs.get("score_threshold", 0.0),
            match_count=k,
            filter=filter or {},
        )
        res = self._client.rpc(self.query_name, match_documents_params).execute()

        match_result = []
        for doc in res.data:
            document = Document(
                page_content=doc.get("content"),
                metadata=doc.get("metadata")
            )
            match_result.append((document, doc.get("similarity", 0.0)))
            
        return match_result