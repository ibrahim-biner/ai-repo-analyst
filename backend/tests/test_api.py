"""
API endpoint testleri. Supabase mock'lanır.
"""
import sys
import types
from types import SimpleNamespace

sys.modules.setdefault(
    "supabase",
    types.SimpleNamespace(create_client=lambda *_, **__: None, Client=object),
)

from fastapi.testclient import TestClient

from app.main import app
from app.deps import get_current_user
from app.api.endpoints import repo as repo_module
from app.api.endpoints import chat as chat_module


TEST_USER_ID = "test-user-id"


def override_get_current_user():
    """Her istekte sabit bir kullanıcı dönen test bağımlılığı."""
    return TEST_USER_ID


app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)


class DummyResponse(SimpleNamespace):
    """Supabase benzeri nesnelerin .execute() dönüşü için basit yardımcı."""

    def execute(self):
        return self


def test_root_ok():
    resp = client.get("/")
    assert resp.status_code == 200
    assert "message" in resp.json()


def test_health_ok():
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body.get("status") == "healthy"
    assert "model" in body


def test_repo_index_success(monkeypatch):
    """Kullanıcının repo limiti dolu değilken /repo/index başarıyla dönmeli."""

    class DummyTable:
        def __init__(self, data=None, count=None):
            self._data = data or []
            self.count = count

        def select(self, *args, **kwargs):
            # count="exact" parametresini ayırt etmek için
            if kwargs.get("count") == "exact":
                self.count = len(self._data)
            return self

        def eq(self, *args, **kwargs):
            return self

        def match(self, *args, **kwargs):
            return self

        def execute(self):
            return DummyResponse(data=self._data, count=self.count)

    class DummySupabase:
        def __init__(self):
            self.calls = 0

        def table(self, name: str):
            self.calls += 1
            # 1. çağrı: count sorgusu, 0 kayıt
            if self.calls == 1 and name == "user_repos":
                return DummyTable(data=[], count=0)
            # 2. çağrı: existing repo kontrolü, yine boş
            if self.calls == 2 and name == "user_repos":
                return DummyTable(data=[])
            # Diğer çağrılar için boş sonuç
            return DummyTable(data=[])

    async def fake_index_repository(repo_url: str, user_id: str):
        return {
            "status": "success",
            "message": "indexed in tests",
            "total_chunks": 0,
            "repo_name": repo_url.split("/")[-1].replace(".git", ""),
        }

    monkeypatch.setattr(repo_module, "supabase", DummySupabase())
    monkeypatch.setattr(repo_module.rag_service, "index_repository", fake_index_repository)

    payload = {
        "repo_url": "https://github.com/example/repo.git",
        "user_id": TEST_USER_ID,
    }

    resp = client.post(
        "/api/v1/repo/index",
        json=payload,
        headers={"Authorization": "Bearer dummy"},
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body.get("status") == "success"
    assert body.get("repo_name") == "repo"


def test_repo_list_returns_data(monkeypatch):
    """Kullanıcının repolarını listeleyen uç noktanın Supabase ile entegrasyonu."""

    sample = [
        {"user_id": TEST_USER_ID, "repo_name": "demo_repo", "repo_url": "https://github.com/example/demo_repo"},
    ]

    class DummyTable:
        def __init__(self, data):
            self._data = data

        def select(self, *_, **__):
            return self

        def eq(self, *_, **__):
            return self

        def order(self, *_, **__):
            return self

        def execute(self):
            return DummyResponse(data=self._data)

    class DummySupabase:
        def table(self, name: str):
            assert name == "user_repos"
            return DummyTable(sample)

    # RAGService içindeki supabase'i değiştiriyoruz
    monkeypatch.setattr(repo_module.rag_service, "supabase", DummySupabase())

    resp = client.get(
        "/api/v1/repo/list",
        params={"user_id": TEST_USER_ID},
        headers={"Authorization": "Bearer dummy"},
    )

    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body, list)
    assert body[0]["repo_name"] == "demo_repo"


def test_chat_save_and_history(monkeypatch):
    """Mesaj kaydetme ve geçmişini okuma uç noktalarının Supabase ile entegrasyonu."""

    storage = []

    class ChatMessagesTable:
        def __init__(self, data):
            self._data = data

        def insert(self, record):
            self._data.append(record)
            return DummyResponse(data=[record])

        def select(self, *_, **__):
            return self

        def eq(self, *_, **__):
            return self

        def order(self, *_, **__):
            return self

        def execute(self):
            return DummyResponse(data=self._data)

    class DummySupabase:
        def table(self, name: str):
            assert name == "chat_messages"
            return ChatMessagesTable(storage)

    monkeypatch.setattr(chat_module, "supabase", DummySupabase())

    # 1) Mesaj kaydet
    payload = {
        "user_id": TEST_USER_ID,
        "repo_name": "demo_repo",
        "role": "user",
        "content": "bu bir test mesajıdır",
    }

    resp = client.post(
        "/api/v1/chat/save",
        json=payload,
        headers={"Authorization": "Bearer dummy"},
    )
    assert resp.status_code == 200
    assert resp.json().get("status") == "saved"
    assert len(storage) == 1

    # 2) Geçmişi oku
    resp_hist = client.get(
        "/api/v1/chat/history",
        params={"user_id": TEST_USER_ID, "repo_name": "demo_repo"},
        headers={"Authorization": "Bearer dummy"},
    )

    assert resp_hist.status_code == 200
    history = resp_hist.json()
    assert isinstance(history, list)
    assert history[0]["content"] == "bu bir test mesajıdır"

