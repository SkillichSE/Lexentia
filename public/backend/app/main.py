from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db import Base, engine
from app.routes.auth import router as auth_router
from app.routes.chat import router as chat_router
from app.routes.notebooks import router as notebooks_router
from app.routes.sources import router as sources_router
from app.routes.studio import router as studio_router

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok", "env": settings.environment}


app.include_router(auth_router)
app.include_router(notebooks_router)
app.include_router(sources_router)
app.include_router(chat_router)
app.include_router(studio_router)
