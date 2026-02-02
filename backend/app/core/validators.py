"""
Güvenlik validatörleri - SSRF ve kötü niyetli giriş önleme.
"""
import re
from urllib.parse import urlparse

# İzin verilen Git hosting domain'leri (sadece https)
ALLOWED_REPO_HOSTS = {
    "github.com",
    "www.github.com",
    "gitlab.com",
    "www.gitlab.com",
    "bitbucket.org",
    "www.bitbucket.org",
}

# Yasaklı şemalar (file://, ssh://, git://, vb.)
FORBIDDEN_SCHEMES = {"file", "ssh", "git", "ftp", "sftp", "gopher"}

# Dahili/özel IP pattern (169.254.x.x, 10.x.x.x, 192.168.x.x, 127.x.x.x)
PRIVATE_IP_PATTERN = re.compile(
    r"^(?:127\.|10\.|172\.(?:1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.)"
)


def validate_repo_url(url: str) -> str:
    """
    Repo URL'ini güvenlik için doğrular. SSRF saldırılarını önler.
    
    Raises:
        ValueError: URL güvenli değilse
    Returns:
        Doğrulanmış URL string
    """
    if not url or not isinstance(url, str):
        raise ValueError("Geçersiz repo URL'i.")
    
    url = url.strip()
    if len(url) > 500:
        raise ValueError("URL çok uzun.")
    
    try:
        parsed = urlparse(url)
    except Exception:
        raise ValueError("Geçersiz URL formatı.")
    
    scheme = (parsed.scheme or "").lower()
    if scheme in FORBIDDEN_SCHEMES:
        raise ValueError("Bu URL türü desteklenmiyor. Sadece https://github.com, gitlab.com vb. kullanın.")
    
    if scheme != "https":
        raise ValueError("Sadece HTTPS URL'leri destekleniyor.")
    
    host = (parsed.hostname or "").lower()
    if not host:
        raise ValueError("Geçersiz host.")
    
    if PRIVATE_IP_PATTERN.match(host) or host in ("localhost", "127.0.0.1"):
        raise ValueError("Dahili veya yerel adreslere izin verilmiyor.")
    
    if host not in ALLOWED_REPO_HOSTS:
        raise ValueError(
            f"Desteklenen platformlar: GitHub, GitLab, Bitbucket. "
            f"({host} izin verilenler arasında değil)"
        )
    
    return url
