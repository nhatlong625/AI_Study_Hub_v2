from typing import List, Optional

from pydantic import BaseModel, Field


class ContextDocument(BaseModel):
    document_id: int
    document_name: str
    title: Optional[str] = None
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    score: float = 0.0
    summary_content: str


class ChatAskRequest(BaseModel):
    message: str = Field(..., examples=["What is interview in software requirements?"])
    session_id: Optional[int] = Field(default=None, examples=[10])
    context_documents: List[ContextDocument] = Field(default_factory=list)


class SourceDocument(BaseModel):
    document_id: int
    document_name: str
    title: Optional[str] = None
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    score: float
    summary_preview: str


class DetectedSubject(BaseModel):
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None


class ChatAskResponse(BaseModel):
    answer: str
    session_id: Optional[int]
    detected_subject: Optional[DetectedSubject]
    sources: List[SourceDocument]
    used_mock_ai: bool = False
    usage: Optional[dict] = None


class QueryTranslateRequest(BaseModel):
    message: str


class QueryTranslateResponse(BaseModel):
    translated_query: str
    used_mock_ai: bool = False
    usage: Optional[dict] = None
