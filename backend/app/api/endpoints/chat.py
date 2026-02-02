"""
Chat endpoint'leri: RAG ile soru-cevap, mesaj kaydetme, geçmiş getirme.
"""
import traceback

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel
from slowapi.util import get_remote_address
from supabase import create_client, Client

from app.core.config import settings
from app.deps import get_current_user
from app.limiter import limiter
from app.services.custom_supabase import CustomSupabaseVectorStore
from app.services.llm_service import llm, embeddings

router = APIRouter()
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


class ChatRequest(BaseModel):
    collection_name: str
    question: str
    user_id: str


@router.post("/ask")
@limiter.limit("2/day", key_func=lambda request: getattr(request.state, 'user_id', get_remote_address(request)))
async def chat(request: Request, data: ChatRequest, current_user_id: str = Depends(get_current_user)):


    if data.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Yetkisiz erişim.")


    try:
        if not hasattr(request.state, 'user_id'):
            request.state.user_id = current_user_id

        vector_store = CustomSupabaseVectorStore(embeddings=embeddings)
        # Benzer kod parçalarını user_id ve collection_name ile filtreleyerek getir
        retriever = vector_store.as_retriever(
            search_type="similarity",
            search_kwargs={
                "k": 15,
                "filter": {
                    "collection_name": data.collection_name,
                    "user_id": data.user_id
                }
            }
        )
        template = """Sen tecrübeli bir Yazılım Mimarı ve Teknik Lidersin. 
        Aşağıdaki "KOD BAĞLAMI"nı (Context) referans alarak kullanıcının sorusunu yanıtla.

        KURALLAR:
        1. **Doğrudan Cevap:** Kullanıcı ne sorduysa net bir şekilde ona cevap ver. Tüm projeyi özetlemeye çalışma.
        2. **Gereksiz Uzatma:** Eğer kullanıcı "Özetle" demediyse, giriş/gelişme/sonuç gibi uzun sunumlar yapma.
        3. **Teknik Derinlik:** Cevabını kod parçalarından aldığın bilgilerle destekle.
        4. **Bilinmeyen Durum:** Eğer bağlamda sorunun cevabı yoksa, "Kodlarda bu bilgiye rastlamadım" de, uydurma.
        5. **Asla Kanıt Sunma:** "Kodda @login_required gördüğüm için bu Django'dur" gibi dedektif cümleleri kurma.
        6.**Doğrudan ve Net Ol:** "Bu proje, Django framework'ü üzerine inşa edilmiş, ölçeklenebilir bir web uygulamasıdır." gibi kesin yargılar kullan.
        7.**Format:** Başlıklar ve maddeler halinde, okunabilir ve şık bir yapı kullan.

        KOD BAĞLAMI:
        {context}

        KULLANICI SORUSU:
        {question}
        """
        prompt = ChatPromptTemplate.from_template(template)
        model = llm
        def format_docs(docs):
            return "\n\n".join(doc.page_content for doc in docs)

        chain = (
            {"context": retriever | format_docs, "question": lambda _: data.question}
            | prompt
            | model
            | StrOutputParser()
        )

        async def generate():
            try:
                async for chunk in chain.astream(data.question):
                    yield chunk
            except Exception as e:
                msg = str(e)
                if "NOT_FOUND" in msg and ("models/" in msg or "generateContent" in msg):
                    yield (
                        "\n\n[HATA] Gemini model bulunamadı veya generateContent desteklenmiyor (404 NOT_FOUND).\n"
                        "Çözüm: `backend/.env` içindeki `LLM_MODEL` değerini hesabında erişilebilir bir modele ayarla.\n"
                        "İpucu: çoğu hesapta `gemini-1.5-flash-latest` çalışır.\n"
                    )
                    return
                if "match_documents" in msg and ("42804" in msg or "result type" in msg):
                    yield (
                        "\n\n[HATA] Supabase `match_documents` RPC fonksiyonu tablo şemasıyla uyuşmuyor.\n"
                        "Çözüm: `backend/supabase/sql/match_documents.sql` dosyasındaki SQL'i Supabase SQL Editor'da çalıştır.\n"
                    )
                else:
                    err_detail = msg if settings.DEBUG else "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin."
                    yield f"\n\n[HATA] Soru işlenirken hata oluştu: {err_detail}\n"

        return StreamingResponse(generate(), media_type="text/event-stream")

    except Exception as e:
        traceback.print_exc()
        detail = str(e) if settings.DEBUG else "Bir hata oluştu. Lütfen tekrar deneyin."
        raise HTTPException(status_code=500, detail=detail)
    

class MessageSchema(BaseModel):
    user_id: str
    repo_name: str
    role: str
    content: str

@router.post("/save")
async def save_message(msg: MessageSchema, current_user_id: str = Depends(get_current_user)):
    """Sohbet mesajını veritabanına kaydeder."""
    if msg.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Yetkisiz işlem.")

    try:
        supabase.table("chat_messages").insert({
            "user_id": msg.user_id,
            "repo_name": msg.repo_name,
            "role": msg.role,
            "content": msg.content
        }).execute()
        return {"status": "saved"}
    except Exception as e:
        print(f"Mesaj kayıt hatası: {e}")
        return {"status": "error", "detail": str(e)}

@router.get("/history")
async def get_chat_history(user_id: str, repo_name: str, current_user_id: str = Depends(get_current_user)):
    """Belirtilen repo için sohbet geçmişini döner."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Bu geçmişi göremezsiniz.")

    try:
        response = supabase.table("chat_messages")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("repo_name", repo_name)\
            .order("created_at", desc=False)\
            .execute()
        return response.data
    except Exception as e:
        print(f"Geçmiş getirme hatası: {e}")
        return []