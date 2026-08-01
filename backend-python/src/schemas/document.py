from pydantic import BaseModel, Field
from typing import Optional


class DocumentSummarizeRequest(BaseModel):
    document_id: Optional[int] = Field(default=None, examples=[1])
    document_name: Optional[str] = Field(default=None, examples=["software_requirements.pdf"])
    text: Optional[str] = Field(default=None, examples=["Paste extracted document text here."])
    file_path: Optional[str] = Field(default=None, examples=["uploads/software_requirements.txt"])
    max_chunks: Optional[int] = Field(default=None, ge=1, le=200)


class DocumentSummarizeResponse(BaseModel):
    document_id: Optional[int]
    document_name: Optional[str]
    summary: str
    chunk_count: int
    used_mock_ai: bool = False
    saved_to_db: bool = False


class DocumentModerateRequest(BaseModel):
    document_id: Optional[int] = Field(default=None)
    title: str = Field(..., examples=["Chapter 5 - Software Testing"])
    summary_text: Optional[str] = Field(default=None, examples=["This document covers unit testing, integration testing..."])
    subject_name: str = Field(..., examples=["Software Testing"])
    subject_code: str = Field(..., examples=["SWE301"])
    subject_description: Optional[str] = Field(default=None, examples=["Software Testing course covering unit tests, integration tests..."])


class DocumentModerateResponse(BaseModel):
    document_id: Optional[int]
    relevance_score: float = Field(..., ge=0, le=100)
    ai_reasoning: str
    recommendation: str  # AUTO_APPROVED, PENDING_HUMAN, REJECTED
    used_mock_ai: bool = False

