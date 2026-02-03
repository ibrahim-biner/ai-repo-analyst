"""
Rate limiting yapılandırması.
Kullanıcı başına günlük istek limitleri endpoint'lerde tanımlanır.
Genel API limiti: dakikada 60 istek, saatte 500 istek.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["60/minute", "500/hour"],  # Genel API limiti
    storage_uri="memory://",
    strategy="fixed-window"
)
