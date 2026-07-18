class TextChunker:
    """Split raw text into overlapping chunks for summarization and retrieval."""

    def __init__(self, chunk_size: int = 2500, overlap: int = 250):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def split(self, text: str) -> list[str]:
        clean_text = " ".join((text or "").split())
        if not clean_text:
            raise ValueError("Cannot summarize an empty document.")

        chunks = []
        start = 0
        while start < len(clean_text):
            end = start + self.chunk_size
            chunks.append(clean_text[start:end])
            if end >= len(clean_text):
                break
            start = max(0, end - self.overlap)

        return chunks
