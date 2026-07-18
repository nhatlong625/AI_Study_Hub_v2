from typing import List, Optional

from pydantic import BaseModel, Field


class QuizGenerateRequest(BaseModel):
    document_id: Optional[int] = Field(default=None, examples=[1])
    document_name: Optional[str] = Field(default=None, examples=["software_requirements.pdf"])
    title: Optional[str] = Field(default=None, examples=["Software Requirements Practice Test"])
    text: str = Field(..., min_length=20)
    total_questions: int = Field(default=10, ge=1, le=30)
    question_type: str = Field(default="Multiple Choice")
    difficulty: str = Field(default="Medium")


class QuizOption(BaseModel):
    content: str
    is_correct: bool = False


class GeneratedQuizQuestion(BaseModel):
    question: str
    type: str = "Multiple Choice"
    difficulty: str = "Medium"
    correct_answer: str
    options: List[QuizOption]
    explanation: Optional[str] = None


class QuizGenerateResponse(BaseModel):
    title: str
    questions: List[GeneratedQuizQuestion]
    used_mock_ai: bool = False
