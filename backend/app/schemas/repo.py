"""Repository API şemaları."""
from pydantic import BaseModel, HttpUrl


class RepoCreate(BaseModel):
    url: str