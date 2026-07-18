import re

from fastapi import APIRouter

from src.llm.summarizer import DocumentSummarizer
from src.schemas.document import DocumentSummarizeRequest, DocumentSummarizeResponse

router = APIRouter()
summarizer = DocumentSummarizer()




def fallback_summary_from_text(text: str | None, max_sentences: int = 6) -> str:
    cleaned = re.sub(r"\s+", " ", text or "").strip()
    if not cleaned:
        return "AI quota/rate limit has been reached, and no readable text was available for fallback summarization."
    sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", cleaned) if part.strip()]
    selected = sentences[:max_sentences] if sentences else [cleaned[:1200]]
    bullets = "\n".join(f"- {sentence[:450]}" for sentence in selected)
    return (
        "AI quota/rate limit has been reached. Fallback summary generated from extracted document text:\n"
        f"{bullets}"
    )
@router.post("/summarize", response_model=DocumentSummarizeResponse)
def summarize_document(payload: DocumentSummarizeRequest):
    result = summarizer.summarize(
        text=payload.text,
        file_path=payload.file_path,
        max_chunks=payload.max_chunks,
    )

    summary = result.summary
    if result.used_mock_ai and "No matching document context" in summary:
        summary = fallback_summary_from_text(payload.text)

    return DocumentSummarizeResponse(
        document_id=payload.document_id,
        document_name=payload.document_name,
        summary=summary,
        chunk_count=result.chunk_count,
        used_mock_ai=result.used_mock_ai,
        saved_to_db=False,
    )


