import json
import re
from hashlib import sha1

from src.llm.llm_client import GeminiService
from src.schemas.quiz import (
    GeneratedQuizQuestion,
    QuizGenerateRequest,
    QuizGenerateResponse,
    QuizOption,
)


class QuizGenerator:
    def __init__(self):
        self.llm = GeminiService()

    def generate(self, payload: QuizGenerateRequest) -> QuizGenerateResponse:
        title = payload.title or f"{payload.document_name or 'Document'} Practice Test"
        prompt = self._build_prompt(payload, title)
        try:
            raw, used_mock = self.llm.generate(prompt)
            questions = self._parse_questions(raw, payload)
        except Exception:
            questions = []
            used_mock = True

        if not questions:
            questions = self._fallback_questions(payload)
            used_mock = True
        return QuizGenerateResponse(title=title, questions=questions, used_mock_ai=used_mock)

    def _build_prompt(self, payload: QuizGenerateRequest, title: str) -> str:
        clipped_text = payload.text[:18000]
        return f"""
You are an academic quiz generation assistant for AI Study Hub.
Generate exactly {payload.total_questions} {payload.question_type} questions from the document content.
Difficulty target: {payload.difficulty}.

Return ONLY valid JSON with this shape:
{{
  "title": "{title}",
  "questions": [
    {{
      "question": "question text",
      "type": "Multiple Choice",
      "difficulty": "Easy|Medium|Hard",
      "correct_answer": "correct option text",
      "options": [
        {{"content": "option A", "is_correct": false}},
        {{"content": "option B", "is_correct": true}},
        {{"content": "option C", "is_correct": false}},
        {{"content": "option D", "is_correct": false}}
      ],
      "explanation": "brief source-grounded explanation"
    }}
  ]
}}

Rules:
- Use only the document content.
- Each multiple-choice question must have exactly 4 options.
- Exactly one option must be correct.
- Do not include markdown fences or commentary.

Document content:
{clipped_text}
""".strip()

    def _parse_questions(self, raw: str, payload: QuizGenerateRequest) -> list[GeneratedQuizQuestion]:
        try:
            data = json.loads(self._extract_json(raw))
        except Exception:
            return []

        raw_questions = data.get("questions") if isinstance(data, dict) else data
        if not isinstance(raw_questions, list):
            return []

        questions: list[GeneratedQuizQuestion] = []
        for item in raw_questions[: payload.total_questions]:
            if not isinstance(item, dict):
                continue
            options = item.get("options") or []
            normalized_options = []
            correct_answer = str(item.get("correct_answer") or item.get("correctAnswer") or "").strip()
            for option in options:
                if isinstance(option, dict):
                    content = str(option.get("content") or option.get("text") or "").strip()
                    is_correct = bool(option.get("is_correct") or option.get("isCorrect"))
                else:
                    content = str(option).strip()
                    is_correct = content.lower() == correct_answer.lower()
                if content:
                    normalized_options.append(QuizOption(content=content, is_correct=is_correct))

            if not any(option.is_correct for option in normalized_options) and correct_answer:
                for option in normalized_options:
                    if option.content.lower() == correct_answer.lower():
                        option.is_correct = True
                        break

            if len(normalized_options) < 2 or not any(option.is_correct for option in normalized_options):
                continue

            if not correct_answer:
                correct_answer = next(option.content for option in normalized_options if option.is_correct)

            questions.append(
                GeneratedQuizQuestion(
                    question=str(item.get("question") or "").strip(),
                    type=str(item.get("type") or payload.question_type or "Multiple Choice"),
                    difficulty=str(item.get("difficulty") or payload.difficulty or "Medium"),
                    correct_answer=correct_answer,
                    options=normalized_options[:4],
                    explanation=item.get("explanation"),
                )
            )
        return [question for question in questions if question.question]

    def _extract_json(self, raw: str) -> str:
        text = raw.strip()
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            return text[start : end + 1]
        return text

    def _fallback_questions(self, payload: QuizGenerateRequest) -> list[GeneratedQuizQuestion]:
        sentences = [
            sentence.strip()
            for sentence in re.split(r"(?<=[.!?])\s+", payload.text.replace("\n", " "))
            if len(sentence.strip()) > 50
        ]
        if not sentences:
            sentences = [payload.text[:300]]

        questions: list[GeneratedQuizQuestion] = []
        for index in range(payload.total_questions):
            sentence = sentences[index % len(sentences)]
            digest = sha1(f"{sentence}-{index}".encode("utf-8")).hexdigest()[:6]
            correct = self._shorten(sentence)
            options = [
                QuizOption(content=correct, is_correct=True),
                QuizOption(content=f"A related but incomplete idea from the document ({digest})"),
                QuizOption(content="A detail not supported by the selected document"),
                QuizOption(content="A general study tip rather than the document answer"),
            ]
            questions.append(
                GeneratedQuizQuestion(
                    question=f"According to the document, which statement best matches this idea: {correct}?",
                    type="Multiple Choice",
                    difficulty=payload.difficulty or "Medium",
                    correct_answer=correct,
                    options=options,
                    explanation="Generated from the uploaded document text while Gemini is unavailable.",
                )
            )
        return questions

    def _shorten(self, text: str) -> str:
        words = text.split()
        return " ".join(words[:22]).rstrip(" ,;:") + ("..." if len(words) > 22 else "")
