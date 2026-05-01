import hashlib
import re
from pathlib import Path

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.db import SessionLocal, get_db
from app.models import Chunk, Source
from app.schemas import SourceCreate, SourceOut

router = APIRouter(prefix="/sources", tags=["sources"])
STORAGE_ROOT = Path("storage") / "sources"
STORAGE_ROOT.mkdir(parents=True, exist_ok=True)


def estimate_tokens(text: str) -> int:
    return max(1, int(len(text.split()) * 1.3))


def build_chunks(text: str, chunk_target: int = 500, overlap: int = 100) -> list[tuple[int, str]]:
    text = (text or "").strip()
    if not text:
        return []
    words = text.split()
    if not words:
        return []
    chunks: list[tuple[int, str]] = []
    idx = 0
    i = 0
    step = max(1, chunk_target - overlap)
    while i < len(words):
        chunk_words = words[i : i + chunk_target]
        if not chunk_words:
            break
        chunks.append((idx, " ".join(chunk_words)))
        idx += 1
        i += step
    return chunks


def fake_embedding(text: str, dim: int = 1536) -> list[float]:
    digest = hashlib.sha256(text.encode("utf-8", errors="ignore")).digest()
    return [((digest[i % len(digest)] / 255.0) * 2.0) - 1.0 for i in range(dim)]


def save_raw_text(source_id: int, text: str) -> str:
    path = STORAGE_ROOT / f"{source_id}.txt"
    path.write_text(text, encoding="utf-8")
    return str(path)


def process_source_text(source_id: int, text: str, content_hash: str) -> None:
    db = SessionLocal()
    try:
        source = db.query(Source).filter(Source.id == source_id).first()
        if not source:
            return
        source.content_hash = content_hash
        source.raw_text_path = save_raw_text(source_id, text)

        reusable = (
            db.query(Source)
            .filter(
                Source.id != source.id,
                Source.notebook_id == source.notebook_id,
                Source.content_hash == content_hash,
                Source.status == "ready",
            )
            .order_by(Source.id.desc())
            .first()
        )
        db.query(Chunk).filter(Chunk.source_id == source.id).delete()
        if reusable:
            reusable_chunks = (
                db.query(Chunk)
                .filter(Chunk.source_id == reusable.id)
                .order_by(Chunk.chunk_index.asc())
                .all()
            )
            for c in reusable_chunks:
                db.add(
                    Chunk(
                        source_id=source.id,
                        text=c.text,
                        embedding=c.embedding,
                        token_count=c.token_count,
                        chunk_index=c.chunk_index,
                    )
                )
        else:
            for chunk_index, chunk_text in build_chunks(text):
                db.add(
                    Chunk(
                        source_id=source.id,
                        text=chunk_text,
                        embedding=fake_embedding(chunk_text),
                        token_count=estimate_tokens(chunk_text),
                        chunk_index=chunk_index,
                    )
                )
        source.status = "ready"
        db.commit()
    except Exception:
        source = db.query(Source).filter(Source.id == source_id).first()
        if source:
            source.status = "error"
            db.commit()
    finally:
        db.close()


def process_source_file_bytes(source_id: int, content_bytes: bytes) -> None:
    text = content_bytes.decode("utf-8", errors="ignore")
    content_hash = hashlib.sha256(text.encode("utf-8", errors="ignore")).hexdigest()
    process_source_text(source_id, text, content_hash)


def clean_html_text(html: str) -> str:
    if not html:
        return ""
    body = re.sub(r"(?is)<(script|style|noscript).*?>.*?</\1>", " ", html)
    body = re.sub(r"(?is)<[^>]+>", " ", body)
    body = re.sub(r"\s{2,}", " ", body)
    return body.strip()


def process_source_url(source_id: int, url: str) -> None:
    db = SessionLocal()
    try:
        source = db.query(Source).filter(Source.id == source_id).first()
        if not source:
            return
        with httpx.Client(timeout=20, follow_redirects=True) as client:
            res = client.get(url)
            res.raise_for_status()
        text = clean_html_text(res.text)
        if not text:
            raise ValueError("Could not extract readable text from URL")
        content_hash = hashlib.sha256(text.encode("utf-8", errors="ignore")).hexdigest()
        process_source_text(source_id, text, content_hash)
    except Exception:
        source = db.query(Source).filter(Source.id == source_id).first()
        if source:
            source.status = "error"
            db.commit()
    finally:
        db.close()


@router.get("/{notebook_id}", response_model=list[SourceOut])
def list_sources(notebook_id: int, db: Session = Depends(get_db)):
    rows = db.query(Source).filter(Source.notebook_id == notebook_id).order_by(Source.id.desc()).all()
    out: list[SourceOut] = []
    for s in rows:
        chunk_count = db.query(Chunk).filter(Chunk.source_id == s.id).count()
        out.append(
            SourceOut(
                id=s.id,
                notebook_id=s.notebook_id,
                type=s.type,
                name=s.name,
                status=s.status,
                chunk_count=chunk_count,
            )
        )
    return out


@router.post("", response_model=SourceOut)
def create_source(payload: SourceCreate, db: Session = Depends(get_db)):
    source = Source(
        notebook_id=payload.notebook_id,
        type=payload.type,
        name=payload.name,
        status="indexing",
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    # Queue handoff would happen here for extraction/chunking/embedding.
    return SourceOut(
        id=source.id,
        notebook_id=source.notebook_id,
        type=source.type,
        name=source.name,
        status=source.status,
        chunk_count=0,
    )


@router.post("/upload", response_model=SourceOut)
async def upload_source(
    background_tasks: BackgroundTasks,
    notebook_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    source_type = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else "text"
    source_type = "pdf" if source_type == "pdf" else "text"
    source = Source(
        notebook_id=notebook_id,
        type=source_type,
        name=file.filename or f"source-{notebook_id}",
        status="indexing",
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    try:
        content_bytes = await file.read()
        background_tasks.add_task(process_source_file_bytes, source.id, content_bytes)
    except Exception:
        source.status = "error"
        db.commit()
    return SourceOut(
        id=source.id,
        notebook_id=source.notebook_id,
        type=source.type,
        name=source.name,
        status=source.status,
        chunk_count=0,
    )


@router.post("/fetch-url", response_model=SourceOut)
async def fetch_url_source(payload: SourceCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if not payload.url:
        raise HTTPException(status_code=400, detail="url is required")
    source = Source(
        notebook_id=payload.notebook_id,
        type="url",
        name=payload.name,
        status="indexing",
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    background_tasks.add_task(process_source_url, source.id, payload.url)
    return SourceOut(
        id=source.id,
        notebook_id=source.notebook_id,
        type=source.type,
        name=source.name,
        status=source.status,
        chunk_count=0,
    )


@router.get("/item/{source_id}/content")
def get_source_content(source_id: int, db: Session = Depends(get_db)):
    source = db.query(Source).filter(Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    if not source.raw_text_path:
        return {"source_id": source.id, "content": ""}
    path = Path(source.raw_text_path)
    if not path.exists():
        return {"source_id": source.id, "content": ""}
    return {"source_id": source.id, "content": path.read_text(encoding="utf-8", errors="ignore")}
