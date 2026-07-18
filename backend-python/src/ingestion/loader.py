from pathlib import Path


class DocumentLoader:
    """Load raw document text from local sources."""

    def load(self, source: str) -> str:
        if not source:
            raise ValueError("Either text or file_path is required.")

        path = Path(source)
        if not path.exists():
            raise FileNotFoundError(f"Document file not found: {source}")

        if path.suffix.lower() not in {".txt", ".md", ".csv"}:
            raise ValueError("Only .txt, .md, and .csv files are supported by the basic loader.")

        return path.read_text(encoding="utf-8")
