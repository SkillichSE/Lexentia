import json

import httpx
from fastapi import APIRouter, Depends
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db import SessionLocal, get_db
from app.models import ChatSession, Message
from app.schemas import ChatRequest, MessageOut
from app.services.rag import retrieve_chunks

router = APIRouter(prefix="/chat", tags=["chat"])


def fake_embedding(_: str) -> list[float]:
    return [0.0] * 1536


def ensure_session(db: Session, session_id: int, notebook_id: int) -> ChatSession:
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if session:
        return session
    session = ChatSession(id=session_id, notebook_id=notebook_id, title="chat session")
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def build_citations(chunks: list) -> list[dict]:
    return [
        {"chunk_id": c.chunk_id, "source_id": c.source_id, "source_name": c.source_name, "snippet": c.text[:160]}
        for c in chunks[:5]
    ]


def build_messages(prompt: str, context: str) -> list[dict]:
    system_prompt = (
        "you are a rag assistant answer using only the provided context "
        "if answer is unknown say it clearly "
        "cite sources as bracket numbers like one two\n\n"
        f"context\n{context}"
    )
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt},
    ]


async def stream_provider(messages: list[dict], model: str):
    headers = {"Content-Type": "application/json"}
    if settings.llm_api_key:
        headers["Authorization"] = f"Bearer {settings.llm_api_key}"
    if settings.llm_http_referer:
        headers["HTTP-Referer"] = settings.llm_http_referer
    if settings.llm_title:
        headers["X-Title"] = settings.llm_title
    url = settings.llm_api_base.rstrip("/") + "/chat/completions"
    payload = {
        "model": model or settings.llm_default_model,
        "messages": messages,
        "stream": True,
        "temperature": 0.2,
        "max_tokens": 1400,
    }
    async with httpx.AsyncClient(timeout=90) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as res:
            if res.status_code >= 400:
                raw = await res.aread()
                raise RuntimeError(f"provider error {res.status_code} {raw[:300].decode('utf-8', errors='ignore')}")
            async for line in res.aiter_lines():
                if not line or not line.startswith("data:"):
                    continue
                raw = line[5:].strip()
                if raw == "[DONE]":
                    continue
                try:
                    data = json.loads(raw)
                except Exception:
                    continue
                delta = data.get("choices", [{}])[0].get("delta", {}).get("content")
                if delta:
                    yield delta


def save_chat_messages(session_id: int, prompt: str, answer: str, citations: list[dict]) -> None:
    db = SessionLocal()
    try:
        db.add(Message(session_id=session_id, role="user", content=prompt, citations=[]))
        db.add(Message(session_id=session_id, role="assistant", content=answer, citations=citations))
        db.commit()
    finally:
        db.close()


@router.get("/sessions/{notebook_id}")
def list_chat_sessions(notebook_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(ChatSession)
        .filter(ChatSession.notebook_id == notebook_id)
        .order_by(ChatSession.created_at.desc())
        .all()
    )
    return [
        {"id": s.id, "notebook_id": s.notebook_id, "title": s.title, "created_at": s.created_at.isoformat()}
        for s in rows
    ]


@router.get("/messages/{session_id}", response_model=list[MessageOut])
def list_messages(session_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.id.asc())
        .all()
    )
    return [
        MessageOut(
            id=m.id,
            role=m.role,
            content=m.content,
            citations=m.citations or [],
        )
        for m in rows
    ]


@router.post("/stream")
def stream_chat(payload: ChatRequest, db: Session = Depends(get_db)):
    ensure_session(db, payload.session_id, payload.notebook_id)
    query_embedding = fake_embedding(payload.prompt)
    chunks = retrieve_chunks(
        db=db,
        notebook_id=payload.notebook_id,
        selected_source_ids=payload.selected_source_ids,
        query_embedding=query_embedding,
        top_k=10,
    )
    context = "\n\n".join(
        f"[{i + 1}] {c.source_name} (chunk {c.chunk_id})\n{c.text[:800]}"
        for i, c in enumerate(chunks)
    )
    citations = build_citations(chunks)
    messages = build_messages(payload.prompt, context)
    model = payload.model or settings.llm_default_model

    async def event_generator():
        answer = ""
        provider_ok = bool(settings.llm_api_key)
        if provider_ok:
            try:
                async for delta in stream_provider(messages, model):
                    answer += delta
                    yield {"event": "token", "data": json.dumps({"delta": delta})}
            except Exception as err:
                answer = f"provider stream error {err}"
                yield {"event": "token", "data": json.dumps({"delta": answer})}
        else:
            answer = (
                "llm api key is not configured on backend "
                "set llm api key in backend env and retry"
            )
            for token in answer.split(" "):
                yield {"event": "token", "data": json.dumps({"delta": token + " "})}

        save_chat_messages(payload.session_id, payload.prompt, answer, citations)
        yield {"event": "done", "data": json.dumps({"citations": citations, "context_preview": context[:1000]})}

    return EventSourceResponse(event_generator())
