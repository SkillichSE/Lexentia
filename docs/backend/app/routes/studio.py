from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import StudioOutput

router = APIRouter(prefix="/studio", tags=["studio"])


@router.get("/{notebook_id}")
def list_outputs(notebook_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(StudioOutput)
        .filter(StudioOutput.notebook_id == notebook_id)
        .order_by(StudioOutput.created_at.desc())
        .all()
    )
    return [{"id": r.id, "tool": r.tool, "content": r.content, "created_at": r.created_at} for r in rows]


@router.post("/{notebook_id}")
def save_output(notebook_id: int, tool: str, content: str, db: Session = Depends(get_db)):
    row = StudioOutput(notebook_id=notebook_id, tool=tool, content=content)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id}
