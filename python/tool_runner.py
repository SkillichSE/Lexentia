from __future__ import annotations

import io
import os
import tempfile
import zipfile
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Lexentia Tool Runner")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _read_upload_bytes(file: UploadFile) -> bytes:
    try:
        return file.file.read()
    finally:
        file.file.close()


def _decode_text(data: bytes, max_chars: int = 2_000_000) -> str:
    text = data.decode("utf-8", errors="ignore")
    if len(text) > max_chars:
        return text[:max_chars]
    return text


def _combine_parts(parts: List[str], title: str) -> str:
    out: List[str] = []
    for idx, p in enumerate(parts, start=1):
        out.append(f"{title} [part {idx}]\n{p}\n")
    return "\n".join(out).strip()


def _safe_zip_extract_text(zip_bytes: bytes) -> Dict[str, Any]:
    # MVP limits to avoid zip bombs.
    max_files = 200
    max_member_bytes = 5_000_000  # per member decoded source bytes limit (best-effort)
    max_total_decoded_chars = 3_000_000

    warnings: List[str] = []
    texts: List[str] = []
    processed: List[str] = []

    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        members = [m for m in zf.infolist() if not m.is_dir()]
        if len(members) > max_files:
            raise HTTPException(status_code=400, detail=f"Too many files in zip: {len(members)}")

        total_chars = 0
        for m in members:
            name = m.filename
            if not name or name.endswith("/"):
                continue

            # Read raw bytes and decode best-effort.
            raw = zf.read(name)
            if len(raw) > max_member_bytes:
                warnings.append(f"Skipped (too large): {name}")
                continue

            text = _decode_text(raw)
            if not text.strip():
                warnings.append(f"Empty/undetected text: {name}")
                continue

            total_chars += len(text)
            if total_chars > max_total_decoded_chars:
                warnings.append("Reached max decoded text limit; stopping early.")
                texts.append(text[: max_total_decoded_chars])
                processed.append(name)
                break

            texts.append(text)
            processed.append(name)

    combined = _combine_parts(texts, "ZIP_EXTRACT_TEXT")
    return {"text": combined, "filesProcessed": processed, "warnings": warnings}


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/extract/txt")
def extract_txt(file: UploadFile = File(...)) -> Dict[str, Any]:
    data = _read_upload_bytes(file)
    text = _decode_text(data)
    return {"text": text, "filesProcessed": [file.filename or "uploaded.txt"], "warnings": []}


@app.post("/extract/zip")
def extract_zip(file: UploadFile = File(...)) -> Dict[str, Any]:
    zip_bytes = _read_upload_bytes(file)
    try:
        return _safe_zip_extract_text(zip_bytes)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"ZIP extraction failed: {e}")


@app.post("/extract/pdf")
def extract_pdf(file: UploadFile = File(...)) -> Dict[str, Any]:
    data = _read_upload_bytes(file)
    try:
        import fitz  # PyMuPDF
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PyMuPDF not installed: {e}")

    try:
        doc = fitz.open(stream=data, filetype="pdf")
        parts: List[str] = []
        for page in doc:
            parts.append(page.get_text("text"))
        text = "\n\n".join(parts).strip()
        return {"text": text, "filesProcessed": [file.filename or "uploaded.pdf"], "warnings": []}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF extraction failed: {e}")


@app.post("/extract/docx")
def extract_docx(file: UploadFile = File(...)) -> Dict[str, Any]:
    data = _read_upload_bytes(file)
    try:
        from docx import Document  # python-docx
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"python-docx not installed: {e}")

    try:
        doc = Document(io.BytesIO(data))
        parts: List[str] = [p.text for p in doc.paragraphs if p.text and p.text.strip()]
        text = "\n\n".join(parts).strip()
        return {"text": text, "filesProcessed": [file.filename or "uploaded.docx"], "warnings": []}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"DOCX extraction failed: {e}")


if __name__ == "__main__":
    # Local dev runner: `python tool_runner.py`
    port = int(os.environ.get("PORT", "8000"))
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")

