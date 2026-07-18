from dataclasses import dataclass
from typing import Optional

from src.chunking.chunker import TextChunker
from src.ingestion.loader import DocumentLoader
from src.llm.llm_client import GeminiService
from src.prompts.prompt_templates import build_document_summary_prompt


@dataclass
class SummaryResult:
    summary: str
    chunk_count: int
    used_mock_ai: bool = False


class DocumentSummarizer:
    MAX_SUMMARY_INPUT_CHARS = 8000

    def __init__(self):
        self.loader = DocumentLoader()
        self.chunker = TextChunker()
        self.llm = GeminiService()

    def summarize(self, text: Optional[str] = None, file_path: Optional[str] = None, max_chunks: Optional[int] = None) -> SummaryResult:
        raw_text = text or self.loader.load(file_path or "")
        chunks = self.chunker.split(raw_text)
        if max_chunks:
            chunks = chunks[:max_chunks]

        document_content = self._fit_document_content(chunks)
        summary, is_mock = self.llm.generate(build_document_summary_prompt(document_content))
        return SummaryResult(summary=self._limit_summary_words(summary), chunk_count=len(chunks), used_mock_ai=is_mock)

    def _fit_document_content(self, chunks: list[str]) -> str:
        joined = "\n\n".join(chunks)
        if len(joined) <= self.MAX_SUMMARY_INPUT_CHARS:
            return joined

        budget_per_chunk = max(300, self.MAX_SUMMARY_INPUT_CHARS // len(chunks))
        excerpts = []
        used_chars = 0
        for index, chunk in enumerate(chunks, start=1):
            excerpt = chunk[:budget_per_chunk].strip()
            if not excerpt:
                continue
            labelled = f"Part {index}/{len(chunks)}:\n{excerpt}"
            if used_chars + len(labelled) + 2 > self.MAX_SUMMARY_INPUT_CHARS:
                break
            excerpts.append(labelled)
            used_chars += len(labelled) + 2

        return "\n\n".join(excerpts)

    def _limit_summary_words(self, summary: str, max_words: int = 120) -> str:
        normalized = " ".join(str(summary or "").split())
        words = normalized.split()
        if len(words) <= max_words:
            return normalized

        clipped = " ".join(words[:max_words]).rstrip(" ,;:")
        last_sentence = max(clipped.rfind("."), clipped.rfind("!"), clipped.rfind("?"))
        if last_sentence > len(clipped) * 0.65:
            return clipped[: last_sentence + 1]
        return clipped + "..."
