"""
Git işlemleri: Repo klonlama, boyut ve dosya sayısı limitleri.
"""
import os
import shutil
import stat
from git import Repo

from app.core.config import settings


class GitService:
    @staticmethod
    def remove_readonly(func, path, excinfo):
        """Windows'ta salt okunur dosyaları silmek için shutil.rmtree callback'i."""
        os.chmod(path, stat.S_IWRITE)
        func(path)

    @staticmethod
    def clone_repository(repo_url: str) -> str:
        """Repoyu klonlar. Max 100MB, max 500 dosya limiti uygular."""
        repo_name = repo_url.split("/")[-1].replace(".git", "")
        target_path = os.path.join(settings.TEMP_REPO_DIR, repo_name)

        if os.path.exists(target_path):
            shutil.rmtree(target_path, onerror=GitService.remove_readonly)

        Repo.clone_from(repo_url, target_path)

        # Repo boyut limitleri
        max_total_size_mb = 100
        max_file_count = 500
        total_size = 0
        file_count = 0
        for root, dirs, files in os.walk(target_path):
            for f in files:
                file_count += 1
                fp = os.path.join(root, f)
                try:
                    total_size += os.path.getsize(fp)
                except Exception:
                    pass
        total_size_mb = total_size / (1024 * 1024)
        if total_size_mb > max_total_size_mb:
            shutil.rmtree(target_path, onerror=GitService.remove_readonly)
            raise Exception(f"Repo boyutu limiti aşıldı: {total_size_mb:.2f} MB (Limit: {max_total_size_mb} MB)")
        if file_count > max_file_count:
            shutil.rmtree(target_path, onerror=GitService.remove_readonly)
            raise Exception(f"Repo dosya sayısı limiti aşıldı: {file_count} dosya (Limit: {max_file_count})")

        return target_path