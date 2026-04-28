# Klyxe Backend (FastAPI)

This is the production-oriented backend foundation for the Klyxe RAG product.

## Implemented now

- FastAPI app with modular routes:
  - `auth`
  - `notebooks`
  - `sources`
  - `chat` (SSE stream endpoint)
  - `studio`
- PostgreSQL/SQLAlchemy models for:
  - users, notebooks, sources, chunks, chat_sessions, messages, notes, studio_outputs
- pgvector-ready chunk embedding field (`Vector(1536)`)
- CORS aligned with frontend origin
- Backend streaming contract for chat (`/chat/stream`)

## Quick start

```bash
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

Health check:

```bash
GET http://localhost:8000/health
```

## Next steps (already aligned with product spec)

- Replace fake embedding with real embedding model calls
- Add queue workers for source indexing pipeline (PDF/URL/YT/audio)
- Add refresh-token rotation and OAuth/magic-link mail sender
- Add Alembic migrations and pgvector extension bootstrap
