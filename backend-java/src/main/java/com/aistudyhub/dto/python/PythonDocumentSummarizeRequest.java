package com.aistudyhub.dto.python;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Khớp với schema DocumentSummarizeRequest bên backend-python — gửi tới POST /api/documents/summarize. */
public record PythonDocumentSummarizeRequest(
        @JsonProperty("document_id") Integer documentId,
        @JsonProperty("document_name") String documentName,
        String text,
        @JsonProperty("file_path") String filePath,
        @JsonProperty("max_chunks") Integer maxChunks
) {
}
