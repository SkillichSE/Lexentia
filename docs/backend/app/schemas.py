from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr


class UserOut(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime


class NotebookCreate(BaseModel):
    title: str


class NotebookOut(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime


class SourceCreate(BaseModel):
    notebook_id: int
    type: Literal["pdf", "url", "youtube", "audio", "text"]
    name: str
    url: str | None = None


class SourceOut(BaseModel):
    id: int
    notebook_id: int
    type: str
    name: str
    status: str
    chunk_count: int = 0


class ChatRequest(BaseModel):
    session_id: int
    notebook_id: int
    prompt: str
    selected_source_ids: list[int] | None = None
    model: str


class CitationItem(BaseModel):
    chunk_id: int
    source_id: int
    source_name: str
    snippet: str


class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    citations: list[CitationItem] = []
