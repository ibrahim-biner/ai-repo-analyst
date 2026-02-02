"""
JWT tabanlı kimlik doğrulama. Authorization header'dan Bearer token alır,
Supabase Auth ile doğrular ve user_id döner.
"""
from fastapi import Depends, HTTPException, Header, status
from supabase import create_client, Client

from app.core.config import settings

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


async def get_current_user(authorization: str = Header(None), request=None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token bulunamadı.",
        )

    token = authorization.split(" ")[1]

    try:
        user_response = supabase.auth.get_user(token)

        if not user_response.user:
            raise HTTPException(status_code=401, detail="Geçersiz kullanıcı tokenı.")

        user_id = user_response.user.id
        if request is not None:
            try:
                request.state.user_id = user_id
            except Exception:
                pass
        return user_id

    except Exception as e:
        print(f"Auth hatası: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Oturum geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.",
        )