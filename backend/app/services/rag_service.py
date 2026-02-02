"""
RAG servisi: Repo clone, kod parçalama, embedding, Supabase'e yükleme.
"""
import os
import shutil
import time
from git import Repo
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from supabase import create_client, Client

from app.core.config import settings
from app.services.custom_supabase import CustomSupabaseVectorStore
from app.services.llm_service import embeddings
from fastapi import HTTPException


class RAGService:
    def __init__(self):
        self.supabase: Client = create_client(
            settings.SUPABASE_URL, 
            settings.SUPABASE_SERVICE_ROLE_KEY
        )
        self.vector_store = CustomSupabaseVectorStore(
            embeddings=embeddings
        )

    def cleanup_temp_repo(self, repo_path: str):
        """Geçici repo dizinini siler. Windows salt-okunur dosyalar için retry kullanır."""
        if not os.path.exists(repo_path):
            return
            
        print(f"--- Temizlik deneniyor: {repo_path} ---")
        max_retries = 3
        
        for i in range(max_retries):
            try:
                def remove_readonly(func, path, _):
                    try:
                        os.chmod(path, 0o777)
                        func(path)
                    except Exception:
                        pass
                    
                shutil.rmtree(repo_path, onerror=remove_readonly)
                print("--- Temizlik Başarılı ---")
                return
            except Exception as e:
                if i < max_retries - 1:
                    time.sleep(1)
                else:
                    print(f"⚠️ UYARI: Dosya kilitli kaldı, silinemedi. Sorun yok, devam ediliyor. Hata: {e}")

    async def index_repository(self, repo_url: str, user_id: str):
        """
        GitHub reposunu indirir, parçalar ve Supabase'e yükler.
        """
        repo_name = repo_url.split("/")[-1].replace(".git", "")
        temp_dir = os.path.join(settings.TEMP_REPO_DIR, repo_name)
        
        # Temizlik
        self.cleanup_temp_repo(temp_dir)

        try:
            Repo.clone_from(repo_url, temp_dir)

            docs = []
            
            for root, dirs, files in os.walk(temp_dir):
                if '.git' in dirs: dirs.remove('.git')
                if '.github' in dirs: dirs.remove('.github')
                if '__pycache__' in dirs: dirs.remove('__pycache__')
                
                for file in files:
                    if file.endswith(('.py', '.js', '.ts', '.tsx', '.java', '.cpp', '.h', '.cs', '.php', '.html', '.css', '.md', '.json')):
                        file_path = os.path.join(root, file)
                        try:
                            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                                content = f.read()
                                if not content.strip():
                                    continue
                                    
                                relative_path = os.path.relpath(file_path, temp_dir)
                                
                                docs.append(Document(
                                    page_content=content,
                                    metadata={
                                        "source": relative_path,
                                        "file_name": file,
                                        "collection_name": repo_name,
                                        "user_id": user_id 
                                    }
                                ))
                        except Exception as e:
                            print(f"Dosya okuma hatası ({file}): {e}")

            # Kodları anlamlı parçalara böl
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=2000,
                chunk_overlap=200
            )
            splits = text_splitter.split_documents(docs)

            # Aynı repo için önceki vektörleri temizle
            try:
                self.supabase.table("documents").delete().match({
                    "metadata->>collection_name": repo_name,
                    "metadata->>user_id": user_id 
                }).execute()
            except Exception as e:
                print(f"Temizlik uyarısı: {e}")

            # Batch yükleme: Gemini rate limit'e takılmamak için küçük parçalarla
            batch_size = 25
            max_retries = 6
            base_sleep_seconds = 2

            def is_quota_error(err: Exception) -> bool:
                msg = str(err)
                return (
                    "RESOURCE_EXHAUSTED" in msg
                    or "429" in msg
                    or "quota" in msg.lower()
                    or "rate limit" in msg.lower()
                )

            for i in range(0, len(splits), batch_size):
                batch = splits[i:i+batch_size]
                attempt = 0
                while True:
                    try:
                        self.vector_store.add_documents(batch)
                        break
                    except Exception as e:
                        attempt += 1
                        if is_quota_error(e) and attempt < max_retries:
                            sleep_s = min(60, base_sleep_seconds * (2 ** (attempt - 1)))
                            print(
                                f"⚠️ Gemini kota/rate limit (429). {sleep_s}s beklenip tekrar denenecek... "
                                f"(deneme {attempt}/{max_retries-1})"
                            )
                            time.sleep(sleep_s)
                            continue
                        raise

            # user_repos tablosuna kayıt
            try:
                existing = self.supabase.table("user_repos").select("*").match({
                    "user_id": user_id, 
                    "repo_name": repo_name
                }).execute()
                
                if not existing.data:
                    self.supabase.table("user_repos").insert({
                        "user_id": user_id,
                        "repo_name": repo_name,
                        "repo_url": repo_url
                    }).execute()
            except Exception as e:
                print(f"Tablo kayıt hatası: {e}")

            return {
                "status": "success",
                "message": f"{repo_name} başarıyla indekslendi.",
                "total_chunks": len(splits),
                "repo_name": repo_name
            }

        except Exception as e:
            print(f"Indeksleme hatası: {str(e)}")
            # Hata durumunda kısmi verileri temizle
            try:
                self.supabase.table("documents").delete().match({
                    "metadata->>collection_name": repo_name,
                    "metadata->>user_id": user_id,
                }).execute()
            except Exception:
                pass

            msg = str(e)
            if "RESOURCE_EXHAUSTED" in msg or "429" in msg:
                raise HTTPException(
                    status_code=429,
                    detail=(
                        "Gemini API kota/rate limit aşıldı (429 RESOURCE_EXHAUSTED). "
                        "Biraz bekleyip tekrar deneyin veya daha yüksek kota/billing ayarlayın."
                    ),
                )

            raise
            
        finally:
            self.cleanup_temp_repo(temp_dir)