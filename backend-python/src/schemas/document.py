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
