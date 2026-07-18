from fastapi import APIRouter

from src.llm.llm_client import GeminiService
from src.schemas.chat import (
    ChatAskRequest,
    ChatAskResponse,
    DetectedSubject,
    QueryTranslateRequest,
    QueryTranslateResponse,
    SourceDocument,
)

router = APIRouter()
gemini = GeminiService()


@router.post("/ask", response_model=ChatAskResponse)
def ask_chatbot(payload: ChatAskRequest):
    hits = payload.context_documents
    answer, used_mock_ai, usage = gemini.answer(payload.message, hits)

    detected = None
    if hits:
        detected = DetectedSubject(subject_id=hits[0].subject_id, subject_name=hits[0].subject_name)

    return ChatAskResponse(
        answer=answer,
        session_id=payload.session_id,
        detected_subject=detected,
        sources=[
            SourceDocument(
                document_id=hit.document_id,
                document_name=hit.document_name,
                title=hit.title,
                subject_id=hit.subject_id,
                subject_name=hit.subject_name,
                score=hit.score,
                summary_preview=hit.summary_content[:240],
            )
            for hit in hits
        ],
        used_mock_ai=used_mock_ai,
        usage=usage,
    )


@router.post("/translate-query", response_model=QueryTranslateResponse)
def translate_query(payload: QueryTranslateRequest):
    translated_query, used_mock_ai, usage = gemini.translate_query(payload.message)
    return QueryTranslateResponse(
        translated_query=translated_query,
        used_mock_ai=used_mock_ai,
        usage=usage,
    )
