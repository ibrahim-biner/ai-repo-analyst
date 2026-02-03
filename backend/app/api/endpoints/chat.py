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
@limiter.limit("5/day", key_func=lambda request: getattr(request.state, 'user_id', get_remote_address(request)))
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
        
        # Gelişmiş prompt şablonu - Görsel zenginlik ve yapılandırılmış çıktı
        template = """## 🎯 Rol
Sen "AI Repo Analyst" uygulamasının yapay zeka asistanısın. Deneyimli bir Yazılım Mimarı ve Teknik Lider olarak, GitHub repolarını analiz edip kullanıcılara yardımcı oluyorsun.

---

## 📁 Kod Bağlamı
Aşağıda kullanıcının reposundan alınan ilgili kod parçaları var:

{context}

---

## ❓ Kullanıcı Sorusu
{question}

---

## 📝 Yanıt Kuralları

### İçerik Kuralları:
1. **Doğrudan Cevap Ver:** Sorulan şeye net cevap ver, tüm projeyi özetleme
2. **Teknik Derinlik:** Kod parçalarından aldığın bilgilerle destekle
3. **Bilinmeyen Durum:** Bağlamda yoksa "Bu bilgiye kodlarda rastlamadım" de, uydurma
4. **Kesin Yargılar:** "Bu proje Django framework'ü kullanıyor" gibi net ifadeler kullan
5. **Kanıt Sunma:** "Kodda @login_required gördüğüm için..." gibi dedektif cümleleri kurma

### Format Kuralları:
1. **Özet ile Başla:** İlk 1-2 cümlede kısa özet ver
2. **Yapılandırılmış Yanıt:** Başlıklar (##, ###) ve maddeler kullan
3. **Kod Örnekleri:** Kod bloklarını dil belirterek yaz (```python, ```javascript vb.)
4. **Dosya Referansları:** 📁 `dosya_adi.py` şeklinde belirt


### Emoji Kullanımı:
- 💡 Öneri ve ipuçları için
- ⚠️ Uyarı ve dikkat edilmesi gerekenler için
- ✅ Doğru/iyi pratikler için
- ❌ Yanlış/kaçınılması gerekenler için
- 🔍 Detaylı inceleme gerektiren noktalar için
- 📁 Dosya referansları için
- 🚀 Performans ve optimizasyon için
- 🔒 Güvenlik ile ilgili konular için

### Ek Öneriler (Uygunsa):
- Best practice tavsiyeleri ver
- Potansiyel iyileştirme alanlarını belirt
- Güvenlik veya performans uyarıları ekle

---

## 🌐 Dil
Türkçe yanıt ver. Teknik terimleri (API, endpoint, middleware, framework vb.) İngilizce bırakabilirsin.

Şimdi yukarıdaki kurallara uygun şekilde kullanıcının sorusunu yanıtla:
"""
        prompt = ChatPromptTemplate.from_template(template)
        model = llm
        
        def format_docs(docs):
            """Dokümanları dosya adıyla birlikte formatla"""
            formatted = []
            for doc in docs:
                # Metadata'dan dosya yolunu al (varsa)
                file_path = doc.metadata.get('file_path', doc.metadata.get('source', 'Bilinmeyen dosya'))
                content = doc.page_content
                formatted.append(f"📁 **Dosya:** `{file_path}`\n```\n{content}\n```")
            return "\n\n---\n\n".join(formatted)

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
                        "\n\n⚠️ **Hata:** Gemini model bulunamadı veya generateContent desteklenmiyor.\n\n"
                        "💡 **Çözüm:** `backend/.env` içindeki `LLM_MODEL` değerini kontrol edin.\n\n"
                        "✅ **Önerilen model:** `gemini-1.5-flash-latest`\n"
                    )
                    return
                if "match_documents" in msg and ("42804" in msg or "result type" in msg):
                    yield (
                        "\n\n⚠️ **Hata:** Supabase `match_documents` fonksiyonu uyumsuz.\n\n"
                        "💡 **Çözüm:** `backend/supabase/sql/match_documents.sql` dosyasını Supabase SQL Editor'da çalıştırın.\n"
                    )
                else:
                    err_detail = msg if settings.DEBUG else "Beklenmeyen bir hata oluştu."
                    yield f"\n\n❌ **Hata:** {err_detail}\n\n💡 Lütfen tekrar deneyin.\n"

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