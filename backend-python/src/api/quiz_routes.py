from fastapi import APIRouter

from src.llm.quiz_generator import QuizGenerator
from src.schemas.quiz import QuizGenerateRequest, QuizGenerateResponse

router = APIRouter()
generator = QuizGenerator()


@router.post("/generate", response_model=QuizGenerateResponse)
def generate_quiz(payload: QuizGenerateRequest):
    return generator.generate(payload)
