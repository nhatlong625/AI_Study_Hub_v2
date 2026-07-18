def build_study_answer_prompt(question: str, hits) -> str:
    context_blocks = []
    for index, hit in enumerate(hits):
        label = "PRIMARY DOCUMENT" if index == 0 else f"FALLBACK DOCUMENT {index}"
        context_blocks.append(
            f"{label}\n"
            f"Document: {hit.document_name}\n"
            f"Subject: {hit.subject_name or 'Unknown'}\n"
            f"Relevance score: {hit.score}\n"
            f"Document Content:\n{hit.summary_content}"
        )
    context = "\n\n---\n\n".join(context_blocks)

    return f"""
You are AI Study Bot for the AI Study Hub platform.
The platform already used AI_SUMMARY / RAG retrieval to rank relevant documents.
The first document is the primary source. Answer from the PRIMARY DOCUMENT first.
Use FALLBACK DOCUMENTS only when the primary document does not contain enough information for the student's question.
Do not blend multiple documents unless the question explicitly asks for comparison or the primary document is insufficient.

Answering rules:
- Focus tightly on the student's question and the selected subject.
- The student's question may be in Vietnamese, Japanese, or another language while the document content is in English.
- Internally interpret or translate the student's question into the document language before answering.
- Reply in the same language as the student's question unless the user asks for another language.
- Keep the answer concise: 3-6 bullet points or 1 short paragraph unless the user asks for detail.
- Mention the document name only when it helps explain the source.
- Do not list other related documents unless you actually used a fallback document.
- If the available document content is insufficient, say that clearly and briefly.
- Use plain Markdown only for readable bullets and bold terms; no large headings.

Student question:
{question}

Ranked RAG Context:
{context}
""".strip()


def build_document_summary_prompt(text: str) -> str:
    return f"""
You are an academic document summarization assistant for AI Study Hub.
Summarize the document content below in English in about 100 words.

Requirements:
- Write one concise paragraph of 90-110 words.
- Capture the main ideas and key terms.
- Keep important definitions, steps, formulas, or constraints.
- Explain what the file contains overall.
- Use plain text only: no Markdown headings, no ##, no bold markers, no code fences.
- Do not invent information that is not in the text.

Document content:
{text}
""".strip()


def build_final_summary_prompt(chunk_summaries: list[str]) -> str:
    joined_summaries = "\n\n".join(chunk_summaries)
    return f"""
You are an academic document summarization assistant for AI Study Hub.
Combine the partial summaries below into one coherent final summary in English in about 100 words.

Requirements:
- Write one concise paragraph of 90-110 words.
- Remove repetition.
- Preserve the most important concepts, definitions, and relationships.
- Use plain text only: no Markdown headings, no ##, no bold markers, no code fences.
- Do not add information that is not present in the partial summaries.

Partial summaries:
{joined_summaries}
""".strip()
