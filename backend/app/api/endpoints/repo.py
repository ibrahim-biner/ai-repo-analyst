"""
Repository ile ilgili endpoint'ler: indeksleme, listeleme, silme.
Tüm işlemler JWT ile doğrulanmış kullanıcıya özeldir.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from slowapi.util import get_remote_address
from supabase import create_client

from app.core.config import settings
from app.core.validators import validate_repo_url
from app.deps import get_current_user
from app.limiter import limiter
from app.services.rag_service import RAGService

router = APIRouter()
rag_service = RAGService()
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


class RepoRequest(BaseModel):
    repo_url: str
    user_id: str

class DeleteRequest(BaseModel):
    repo_name: str
    user_id: str


@router.post("/index")
@limiter.limit("1/day", key_func=lambda request: getattr(request.state, 'user_id', get_remote_address(request)))
async def index_repository(request: Request, data: RepoRequest, current_user_id: str = Depends(get_current_user)):


    if data.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Başkasının adına işlem yapamazsınız!")

    # URL doğrulama: sadece GitHub, GitLab, Bitbucket desteklenir
    try:
        validate_repo_url(data.repo_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        if not hasattr(request.state, 'user_id'):
            request.state.user_id = current_user_id

        # Kullanıcı başına maksimum 3 repo limiti
        count_res = supabase.table("user_repos").select("*", count="exact").eq("user_id", data.user_id).execute()
        current_count = count_res.count if count_res.count is not None else 0

        existing = supabase.table("user_repos").select("*").match({
            "user_id": data.user_id,
            "repo_name": data.repo_url.split("/")[-1].replace(".git", "")
        }).execute()

        if not existing.data and current_count >= 3:
            raise HTTPException(status_code=400, detail="Repo limiti (3) doldu. Yeni eklemek için önce eskilerden birini silmelisin.")

        result = await rag_service.index_repository(data.repo_url, data.user_id)
        return result

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Repo İndeksleme Hatası: {str(e)}")
        detail = str(e) if settings.DEBUG else "Repo indekslenirken bir hata oluştu."
        raise HTTPException(status_code=500, detail=detail)

@router.get("/list")
async def list_user_repos(user_id: str, current_user_id: str = Depends(get_current_user)):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Bu listeyi görmeye yetkiniz yok.")
    
    try:
        response = rag_service.supabase.table("user_repos")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()
        return response.data
    except Exception as e:
        print(f"Liste Hatası: {str(e)}")
        detail = str(e) if settings.DEBUG else "Liste alınırken bir hata oluştu."
        raise HTTPException(status_code=500, detail=detail)

@router.post("/delete")
async def delete_repo(request: DeleteRequest, current_user_id: str = Depends(get_current_user)):
    """Repoyu ve ilişkili tüm verileri (vektörler, sohbet, kayıt) siler."""
    if request.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Bu repoyu silemezsiniz.")

    try:
        # Vektör deposundaki dokümanları sil
        supabase.table("documents").delete().match({
            "metadata->>collection_name": request.repo_name,
            "metadata->>user_id": request.user_id
        }).execute()

        # Sohbet geçmişini sil
        supabase.table("chat_messages").delete().match({
            "repo_name": request.repo_name,
            "user_id": request.user_id
        }).execute()

        # user_repos listesinden sil
        supabase.table("user_repos").delete().match({
            "repo_name": request.repo_name,
            "user_id": request.user_id
        }).execute()

        return {"status": "success", "message": f"{request.repo_name} başarıyla silindi."}

    except Exception as e:
        print(f"Silme Hatası: {str(e)}")
        detail = str(e) if settings.DEBUG else "Silme işlemi sırasında bir hata oluştu."
        raise HTTPException(status_code=500, detail=detail)