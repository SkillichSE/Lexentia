from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.orm import Session


@dataclass
class RetrievedChunk:
    chunk_id: int
    source_id: int
    source_name: str
    text: str


def retrieve_chunks(
    db: Session,
    notebook_id: int,
    selected_source_ids: list[int] | None,
    query_embedding: list[float],
    top_k: int = 10,
) -> list[RetrievedChunk]:
    source_filter = ""
    params: dict = {"notebook_id": notebook_id, "query_embedding": query_embedding, "top_k": top_k}
    if selected_source_ids:
        source_filter = "AND s.id = ANY(:selected_source_ids)"
        params["selected_source_ids"] = selected_source_ids

    sql = text(
        f"""
        SELECT c.id AS chunk_id, s.id AS source_id, s.name AS source_name, c.text
        FROM chunks c
        JOIN sources s ON s.id = c.source_id
        WHERE s.notebook_id = :notebook_id
          AND s.status = 'ready'
          {source_filter}
        ORDER BY c.embedding <=> CAST(:query_embedding AS vector)
        LIMIT :top_k
        """
    )
    rows = db.execute(sql, params).mappings().all()
    return [RetrievedChunk(**row) for row in rows]
