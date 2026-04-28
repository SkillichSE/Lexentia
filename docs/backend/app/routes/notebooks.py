from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Notebook
from app.schemas import NotebookCreate, NotebookOut

router = APIRouter(prefix="/notebooks", tags=["notebooks"])


@router.get("", response_model=list[NotebookOut])
def list_notebooks(db: Session = Depends(get_db)):
    rows = db.query(Notebook).order_by(Notebook.updated_at.desc()).all()
    return [NotebookOut(id=n.id, title=n.title, created_at=n.created_at, updated_at=n.updated_at) for n in rows]


@router.post("", response_model=NotebookOut)
def create_notebook(payload: NotebookCreate, db: Session = Depends(get_db)):
    notebook = Notebook(user_id=1, title=payload.title)
    db.add(notebook)
    db.commit()
    db.refresh(notebook)
    return NotebookOut(
        id=notebook.id,
        title=notebook.title,
        created_at=notebook.created_at,
        updated_at=notebook.updated_at,
    )
