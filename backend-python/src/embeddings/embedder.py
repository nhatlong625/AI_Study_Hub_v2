class Embedder:
    """Convert text chunks into vector embeddings."""

    def embed(self, chunks: list[str]) -> list[list[float]]:
        raise NotImplementedError("Embedding generation is not implemented yet.")
