class VectorStore:
    """Store and search embeddings in a vector database."""

    def search(self, query_embedding: list[float], top_k: int = 5):
        raise NotImplementedError("Vector search is not implemented yet.")
